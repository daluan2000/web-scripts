from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

from yt_dlp.utils import DownloadError

from app.core.config import Settings
from app.core.models import VideoItemInput
from app.services.downloader import YtDlpDownloader

TEST_M3U8_URL = "https://xgct-video.bzcdn.net/ed58f061-1922-49c0-a309-b0ede603b0d0/playlist.m3u8"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manual m3u8 downloader smoke script for VideoDownloader backend"
    )
    parser.add_argument("--url", default=TEST_M3U8_URL, help="m3u8 URL to download")
    parser.add_argument(
        "--output-dir",
        default="./tmp_m3u8_download",
        help="where to save downloaded file",
    )
    parser.add_argument("--file-name", default="xgct_playlist_test", help="target file stem")
    parser.add_argument("--title", default="xgct test", help="video title metadata")
    parser.add_argument("--media-type", default="m3u8", help="video type field")
    parser.add_argument("--mime-type", default="", help="optional mime type")
    parser.add_argument("--timeout", type=int, default=60, help="yt-dlp socket timeout")
    parser.add_argument("--retries", type=int, default=5, help="yt-dlp retries")
    return parser


def format_progress(payload: dict) -> str:
    status = str(payload.get("status") or "")
    progress = payload.get("progress")
    if progress is None:
        percent = "?"
    else:
        try:
            percent = f"{float(progress) * 100:.1f}%"
        except Exception:  # noqa: BLE001
            percent = "?"

    speed = str(payload.get("speed") or "-")
    eta = str(payload.get("eta") or "-")
    filename = str(payload.get("filename") or "-")
    downloaded = int(payload.get("downloadedBytes") or 0)
    total = int(payload.get("totalBytes") or 0)
    return (
        f"status={status:<11} progress={percent:<7} speed={speed:<12} "
        f"eta={eta:<8} bytes={downloaded}/{total} file={filename}"
    )


async def run_download(args: argparse.Namespace) -> int:
    if os.environ.get("VD_BACKEND_DISABLE_NETWORK_TESTS") == "1":
        print("skip: VD_BACKEND_DISABLE_NETWORK_TESTS=1")
        return 0

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    settings = Settings(
        download_root=str(output_dir),
        yt_dlp_socket_timeout=max(1, int(args.timeout)),
        yt_dlp_retries=max(1, int(args.retries)),
    )
    downloader = YtDlpDownloader(settings)
    video = VideoItemInput(
        src=str(args.url),
        type=str(args.media_type),
        title=str(args.title),
        mimeType=str(args.mime_type),
        fileName=str(args.file_name),
    )

    progress_events: list[dict] = []

    def on_progress(payload: dict) -> None:
        progress_events.append(payload)
        print(format_progress(payload), flush=True)

    print(f"start url={video.src}")
    print(f"output_dir={output_dir}")

    try:
        filename = await downloader.download_video(
            task_id="manual-m3u8-download",
            item_index=0,
            video=video,
            output_dir=output_dir,
            should_cancel=lambda: False,
            emit_progress=on_progress,
        )
    except DownloadError as error:
        print(f"download error: {error}")
        return 2
    except Exception as error:  # noqa: BLE001
        print(f"unexpected error: {error}")
        return 1

    output_file = output_dir / filename
    exists = output_file.exists()
    size = output_file.stat().st_size if exists else 0
    finished_count = sum(1 for event in progress_events if str(event.get("status")) == "finished")

    print("done")
    print(f"filename={filename}")
    print(f"file_exists={exists}")
    print(f"file_size={size}")
    print(f"progress_events={len(progress_events)}")
    print(f"finished_events={finished_count}")
    return 0


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run_download(args)))


if __name__ == "__main__":
    main()
