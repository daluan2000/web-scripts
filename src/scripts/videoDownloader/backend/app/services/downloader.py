from __future__ import annotations

import asyncio
import logging
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Callable, Optional

import yt_dlp

from app.core.config import Settings
from app.core.models import VideoItemInput

logger = logging.getLogger(__name__)

DIRECT_DOWNLOAD_EXTENSIONS = {
    "mp4",
    "webm",
    "m4v",
    "mov",
    "mkv",
    "avi",
    "flv",
    "ts",
}


def _sanitize_file_stem(name: str) -> str:
    value = (name or "").strip()
    value = value.replace("\\", "/").split("/")[-1]
    value = re.sub(r"\.[0-9A-Za-z]{1,6}$", "", value)
    value = re.sub(r"[^0-9A-Za-z._-]+", "_", value)
    value = value.strip("._-")
    return value[:120] or "video"


class YtDlpDownloader:
    def __init__(self, settings: Settings):
        self._settings = settings

    async def download_video(
        self,
        *,
        task_id: str,
        item_index: int,
        video: VideoItemInput,
        output_dir: Path,
        cache_dir: Optional[Path],
        should_cancel: Callable[[], bool],
        emit_progress: Callable[[dict], None],
    ) -> str:
        loop = asyncio.get_running_loop()

        def thread_safe_emit(payload: dict) -> None:
            loop.call_soon_threadsafe(emit_progress, payload)

        return await asyncio.to_thread(
            self._download_video_sync,
            task_id,
            item_index,
            video,
            output_dir,
            cache_dir,
            should_cancel,
            thread_safe_emit,
        )

    def _download_video_sync(
        self,
        task_id: str,
        item_index: int,
        video: VideoItemInput,
        output_dir: Path,
        cache_dir: Optional[Path],
        should_cancel: Callable[[], bool],
        emit_progress: Callable[[dict], None],
    ) -> str:
        desired_name = (video.fileName or "").strip()
        stem = _sanitize_file_stem(desired_name) if desired_name else f"video_{item_index + 1:03d}"
        outtmpl = str(output_dir / f"{stem}.%(ext)s")
        final_filename = ""
        request_headers = self._build_http_headers(video)
        base_timeout = max(15, int(self._settings.yt_dlp_socket_timeout or 30))
        base_retries = max(1, int(self._settings.yt_dlp_retries or 3))

        direct_attempted = False

        def progress_hook(progress_data: dict) -> None:
            nonlocal final_filename
            if should_cancel():
                raise yt_dlp.utils.DownloadError("Task cancelled by user")

            status = progress_data.get("status") or ""
            filename = progress_data.get("filename") or final_filename
            if filename:
                final_filename = str(filename)

            total_bytes = (
                progress_data.get("total_bytes")
                or progress_data.get("total_bytes_estimate")
                or 0
            )
            downloaded_bytes = progress_data.get("downloaded_bytes") or 0
            if status == "finished" and total_bytes and downloaded_bytes < total_bytes:
                downloaded_bytes = total_bytes

            ratio = 0.0
            if total_bytes:
                ratio = max(0.0, min(1.0, float(downloaded_bytes) / float(total_bytes)))

            emit_progress(
                {
                    "status": status,
                    "progress": ratio,
                    "downloadedBytes": int(downloaded_bytes or 0),
                    "totalBytes": int(total_bytes or 0),
                    "speed": progress_data.get("_speed_str") or "",
                    "eta": progress_data.get("_eta_str") or "",
                    "filename": Path(final_filename).name if final_filename else "",
                }
            )

        if self._is_direct_download_candidate(video):
            direct_attempted = True
            try:
                return self._download_direct_file(
                    video=video,
                    output_dir=output_dir,
                    stem=stem,
                    should_cancel=should_cancel,
                    emit_progress=emit_progress,
                    request_headers=request_headers,
                    timeout=base_timeout,
                )
            except Exception as error:  # noqa: BLE001
                logger.warning(
                    "Direct download failed, fallback to yt-dlp: task=%s item=%s url=%s error=%s",
                    task_id,
                    item_index,
                    video.src,
                    error,
                )

        def run_with_options(ydl_opts: dict) -> None:
            nonlocal final_filename
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video.src, download=True)
                if not final_filename:
                    prepared = ydl.prepare_filename(info)
                    final_filename = str(prepared)

        try:
            run_with_options(
                self._build_ydl_options(
                    outtmpl=outtmpl,
                    progress_hook=progress_hook,
                    request_headers=request_headers,
                    socket_timeout=base_timeout,
                    retries=base_retries,
                    cache_dir=cache_dir,
                )
            )
        except yt_dlp.utils.DownloadError as error:
            if not self._is_timeout_error(error):
                raise

            host = urllib.parse.urlparse(video.src).netloc or "unknown"
            logger.warning(
                "yt-dlp timeout detected: task=%s item=%s host=%s type=%s mime=%s cookie=%s ua=%s",
                task_id,
                item_index,
                host,
                video.type,
                video.mimeType,
                bool(request_headers.get("Cookie")),
                bool(request_headers.get("User-Agent")),
            )

            retry_timeout = max(base_timeout * 2, 90)
            retry_retries = max(base_retries + 2, 6)
            logger.warning(
                "yt-dlp timeout, retrying with relaxed settings: task=%s item=%s timeout=%s retries=%s",
                task_id,
                item_index,
                retry_timeout,
                retry_retries,
            )

            try:
                run_with_options(
                    self._build_ydl_options(
                        outtmpl=outtmpl,
                        progress_hook=progress_hook,
                        request_headers=request_headers,
                        socket_timeout=retry_timeout,
                        retries=retry_retries,
                        cache_dir=cache_dir,
                    )
                )
            except Exception as retry_error:  # noqa: BLE001
                if not direct_attempted and self._is_direct_download_candidate(video):
                    logger.warning(
                        "yt-dlp retry failed, trying direct fallback: task=%s item=%s url=%s error=%s",
                        task_id,
                        item_index,
                        video.src,
                        retry_error,
                    )
                    return self._download_direct_file(
                        video=video,
                        output_dir=output_dir,
                        stem=stem,
                        should_cancel=should_cancel,
                        emit_progress=emit_progress,
                        request_headers=request_headers,
                        timeout=max(retry_timeout, 90),
                    )

                raise yt_dlp.utils.DownloadError(
                    f"下载超时（host={host}），已重试仍失败。请检查网络连通性、登录态 Cookie/Referer、站点防盗链或代理设置"
                ) from retry_error
        except Exception as error:  # noqa: BLE001
            if not direct_attempted and self._is_direct_download_candidate(video):
                logger.warning(
                    "yt-dlp failed, trying direct download fallback: task=%s item=%s url=%s error=%s",
                    task_id,
                    item_index,
                    video.src,
                    error,
                )
                return self._download_direct_file(
                    video=video,
                    output_dir=output_dir,
                    stem=stem,
                    should_cancel=should_cancel,
                    emit_progress=emit_progress,
                    request_headers=request_headers,
                    timeout=max(base_timeout, 60),
                )
            raise

        return Path(final_filename).name if final_filename else ""

    def _build_http_headers(self, video: VideoItemInput) -> dict[str, str]:
        headers: dict[str, str] = {}
        for raw_key, raw_value in (video.requestHeaders or {}).items():
            key = str(raw_key or "").strip()
            value = str(raw_value or "").strip()
            if not key or not value:
                continue
            if "\n" in key or "\r" in key:
                continue
            if "\n" in value or "\r" in value:
                continue
            headers[key] = value
        return headers

    def _build_ydl_options(
        self,
        *,
        outtmpl: str,
        progress_hook: Callable[[dict], None],
        request_headers: dict[str, str],
        socket_timeout: int,
        retries: int,
        cache_dir: Optional[Path],
    ) -> dict:
        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "retries": retries,
            "extractor_retries": max(2, retries),
            "fragment_retries": max(2, retries),
            "socket_timeout": socket_timeout,
            "outtmpl": outtmpl,
            "progress_hooks": [progress_hook],
            "concurrent_fragment_downloads": 2,
            "force_ipv4": True,
            "nocheckcertificate": False,
        }
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)
            ydl_opts["paths"] = {
                "temp": str(cache_dir),
            }
            ydl_opts["cachedir"] = str(cache_dir / "yt_dlp_cache")
        if request_headers:
            ydl_opts["http_headers"] = request_headers
        return ydl_opts

    def _is_timeout_error(self, error: Exception) -> bool:
        message = str(error).lower()
        return "timed out" in message or "timeout" in message

    def _is_direct_download_candidate(self, video: VideoItemInput) -> bool:
        media_type = str(video.type or "").strip().lower()
        if media_type in {"", "video"}:
            media_type = self._extract_extension(video.src)

        if media_type in {"m3u8", "dash", "blob", "dynamic", "php"}:
            return False

        if media_type in DIRECT_DOWNLOAD_EXTENSIONS:
            return True

        mime_type = str(video.mimeType or "").strip().lower()
        return mime_type.startswith("video/") and "mpegurl" not in mime_type and "dash" not in mime_type

    def _download_direct_file(
        self,
        *,
        video: VideoItemInput,
        output_dir: Path,
        stem: str,
        should_cancel: Callable[[], bool],
        emit_progress: Callable[[dict], None],
        request_headers: dict[str, str],
        timeout: int,
    ) -> str:
        extension = self._resolve_extension(video)
        target_path = output_dir / f"{stem}.{extension}"
        download_url = str(video.src or "").strip()
        if not download_url:
            raise ValueError("视频地址为空")

        headers = dict(request_headers)
        if "User-Agent" not in headers:
            headers["User-Agent"] = "Mozilla/5.0"

        request = urllib.request.Request(download_url, headers=headers, method="GET")
        start_time = time.time()
        downloaded_bytes = 0

        try:
            with urllib.request.urlopen(request, timeout=timeout) as response, target_path.open("wb") as output_file:
                total_bytes = int(response.headers.get("Content-Length") or 0)
                while True:
                    if should_cancel():
                        raise yt_dlp.utils.DownloadError("Task cancelled by user")

                    chunk = response.read(256 * 1024)
                    if not chunk:
                        break

                    output_file.write(chunk)
                    downloaded_bytes += len(chunk)
                    progress = 0.0
                    if total_bytes > 0:
                        progress = max(0.0, min(1.0, downloaded_bytes / float(total_bytes)))

                    elapsed = max(0.001, time.time() - start_time)
                    speed_bps = downloaded_bytes / elapsed
                    speed_str = f"{speed_bps / (1024 * 1024):.2f} MiB/s"

                    emit_progress(
                        {
                            "status": "downloading",
                            "progress": progress,
                            "downloadedBytes": int(downloaded_bytes),
                            "totalBytes": int(total_bytes),
                            "speed": speed_str,
                            "eta": "",
                            "filename": target_path.name,
                        }
                    )

            emit_progress(
                {
                    "status": "finished",
                    "progress": 1.0,
                    "downloadedBytes": int(downloaded_bytes),
                    "totalBytes": int(downloaded_bytes),
                    "speed": "",
                    "eta": "",
                    "filename": target_path.name,
                }
            )
            return target_path.name
        except urllib.error.URLError as error:
            if target_path.exists():
                target_path.unlink(missing_ok=True)
            raise yt_dlp.utils.DownloadError(f"direct download failed: {error}") from error
        except Exception:
            if target_path.exists():
                target_path.unlink(missing_ok=True)
            raise

    def _extract_extension(self, url: str) -> str:
        raw = str(url or "").split("?")[0].split("#")[0]
        ext = raw.rsplit(".", 1)[-1].strip().lower() if "." in raw else ""
        if not ext or len(ext) > 8:
            return ""
        return ext

    def _resolve_extension(self, video: VideoItemInput) -> str:
        media_type = str(video.type or "").strip().lower()
        if media_type in DIRECT_DOWNLOAD_EXTENSIONS:
            return media_type

        ext = self._extract_extension(video.src)
        if ext in DIRECT_DOWNLOAD_EXTENSIONS:
            return ext

        mime_type = str(video.mimeType or "").strip().lower()
        mapping = {
            "video/mp4": "mp4",
            "video/webm": "webm",
            "video/x-m4v": "m4v",
            "video/quicktime": "mov",
            "video/x-matroska": "mkv",
            "video/x-msvideo": "avi",
            "video/x-flv": "flv",
            "video/mp2t": "ts",
        }
        return mapping.get(mime_type, "mp4")
