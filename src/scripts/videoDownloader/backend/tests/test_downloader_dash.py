from __future__ import annotations

from pathlib import Path

import pytest
import yt_dlp

from app.core.config import Settings
from app.core.models import VideoItemInput
from app.services.downloader import YtDlpDownloader


class _SuccessfulDashYoutubeDL:
    calls = 0
    options: dict = {}

    def __init__(self, options: dict):
        _SuccessfulDashYoutubeDL.calls += 1
        _SuccessfulDashYoutubeDL.options = options

    def __enter__(self) -> "_SuccessfulDashYoutubeDL":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def extract_info(self, _url: str, download: bool = True) -> dict:  # noqa: ARG002
        filename = str(self.options["outtmpl"]).replace("%(ext)s", "mp4")
        Path(filename).write_bytes(b"dash-output")
        self.options["progress_hooks"][0](
            {
                "status": "finished",
                "filename": filename,
                "downloaded_bytes": 11,
                "total_bytes": 11,
            }
        )
        return {"id": "dash-test", "ext": "mp4"}

    def prepare_filename(self, _info: dict) -> str:
        return str(self.options["outtmpl"]).replace("%(ext)s", "mp4")


class _MissingFfmpegYoutubeDL:
    def __init__(self, _options: dict):
        pass

    def __enter__(self) -> "_MissingFfmpegYoutubeDL":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:  # noqa: ANN001
        return False

    def extract_info(self, _url: str, download: bool = True) -> dict:  # noqa: ARG002
        raise yt_dlp.utils.DownloadError("ffmpeg is not installed")

    def prepare_filename(self, _info: dict) -> str:
        return "unused.mp4"


def test_dash_uses_ytdlp_path(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    downloader = YtDlpDownloader(Settings(download_root=str(tmp_path)))
    video = VideoItemInput(
        src="https://cdn.example/manifest.mpd",
        type="dash",
        title="DASH demo",
        fileName="dash-demo",
    )
    _SuccessfulDashYoutubeDL.calls = 0
    monkeypatch.setattr(
        "app.services.downloader.yt_dlp.YoutubeDL",
        _SuccessfulDashYoutubeDL,
    )

    filename = downloader._download_video_sync(
        task_id="task-dash",
        item_index=0,
        video=video,
        output_dir=tmp_path,
        work_dir=None,
        cache_dir=None,
        should_cancel=lambda: False,
        emit_progress=lambda _payload: None,
    )

    assert filename == "dash-demo.mp4"
    assert (tmp_path / filename).is_file()
    assert _SuccessfulDashYoutubeDL.calls == 1
    assert _SuccessfulDashYoutubeDL.options["noplaylist"] is True


def test_dash_missing_ffmpeg_has_actionable_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    downloader = YtDlpDownloader(Settings(download_root=str(tmp_path)))
    video = VideoItemInput(
        src="https://cdn.example/manifest.mpd",
        type="dash",
    )
    monkeypatch.setattr(
        "app.services.downloader.yt_dlp.YoutubeDL",
        _MissingFfmpegYoutubeDL,
    )

    with pytest.raises(yt_dlp.utils.DownloadError) as exc_info:
        downloader._download_video_sync(
            task_id="task-dash-ffmpeg",
            item_index=0,
            video=video,
            output_dir=tmp_path,
            work_dir=None,
            cache_dir=None,
            should_cancel=lambda: False,
            emit_progress=lambda _payload: None,
        )

    assert "需要 FFmpeg" in str(exc_info.value)
