from __future__ import annotations

from pathlib import Path

import pytest
import yt_dlp

from app.core.config import Settings
from app.core.models import VideoItemInput
from app.services.downloader import YtDlpDownloader


class _TimeoutYoutubeDL:
    calls = 0

    def __init__(self, _options: dict):
        _TimeoutYoutubeDL.calls += 1

    def __enter__(self) -> "_TimeoutYoutubeDL":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def extract_info(self, _url: str, download: bool = True) -> dict:  # noqa: ARG002
        raise yt_dlp.utils.DownloadError("Read timed out")

    def prepare_filename(self, _info: dict) -> str:
        return "unused.mp4"


def test_timeout_flow_stops_relaxed_retry_path(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    settings = Settings(
        download_root=str(tmp_path),
        yt_dlp_socket_timeout=30,
        yt_dlp_retries=3,
    )
    downloader = YtDlpDownloader(settings)
    video = VideoItemInput(
        src="https://example.com/playlist.m3u8",
        type="m3u8",
        title="demo",
    )

    _TimeoutYoutubeDL.calls = 0
    monkeypatch.setattr("app.services.downloader.yt_dlp.YoutubeDL", _TimeoutYoutubeDL)

    with pytest.raises(yt_dlp.utils.DownloadError) as exc_info:
        downloader._download_video_sync(
            task_id="task-timeout",
            item_index=0,
            video=video,
            output_dir=tmp_path,
            work_dir=None,
            cache_dir=None,
            should_cancel=lambda: False,
            emit_progress=lambda _payload: None,
        )

    assert _TimeoutYoutubeDL.calls == 1
    message = str(exc_info.value)
    assert "下载超时" in message
    assert "已重试仍失败" not in message
