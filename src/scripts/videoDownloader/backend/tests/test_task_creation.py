from __future__ import annotations

import asyncio
import re
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.tasks import router as tasks_router
from app.core.config import Settings
from app.core.models import TaskCreateRequest, VideoItemInput
from app.services.task_manager import DownloadTaskManager


class BlockingDownloader:
    async def download_video(self, **kwargs) -> str:  # noqa: ANN003
        await asyncio.Event().wait()
        return str(kwargs["video"].fileName)


def build_manager(tmp_path: Path) -> DownloadTaskManager:
    settings = Settings(download_root=str(tmp_path), max_concurrent_tasks=1)
    return DownloadTaskManager(settings=settings, downloader=BlockingDownloader())


def build_request(file_name: str = "index") -> TaskCreateRequest:
    return TaskCreateRequest(
        videos=[
            VideoItemInput(
                src="https://cdn.example/show/index.m3u8",
                type="m3u8",
                title="demo",
                fileName=file_name,
            )
        ]
    )


def test_task_ids_are_unique_and_independent_from_output_names(tmp_path: Path) -> None:
    async def scenario() -> None:
        manager = build_manager(tmp_path)
        try:
            first = await manager.create_task(build_request("index"))
            second = await manager.create_task(build_request("episode-2"))

            assert first.id != second.id
            assert first.id != first.task_name
            assert second.id != second.task_name
            assert re.fullmatch(r"task-[0-9a-f]{32}", first.id)
            assert re.fullmatch(r"task-[0-9a-f]{32}", second.id)
            assert first.task_name == "index"
            assert second.task_name == "episode-2"
        finally:
            await manager.shutdown()

    asyncio.run(scenario())


def test_output_names_reject_existing_files_and_active_reservations(tmp_path: Path) -> None:
    async def scenario() -> None:
        (tmp_path / "index.mp4").write_bytes(b"existing")
        (tmp_path / "index_2.webm").write_bytes(b"existing")
        manager = build_manager(tmp_path)
        try:
            with pytest.raises(ValueError, match="文件名已存在"):
                await manager.create_task(build_request("index"))

            first = await manager.create_task(build_request("episode"))
            assert Path(first.part_dir).name == first.id
            with pytest.raises(ValueError, match="同名任务正在下载"):
                await manager.create_task(build_request("episode"))
        finally:
            await manager.shutdown()

    asyncio.run(scenario())


def test_output_name_reservation_is_case_insensitive(tmp_path: Path) -> None:
    async def scenario() -> None:
        (tmp_path / "INDEX.mp4").write_bytes(b"existing")
        manager = build_manager(tmp_path)
        try:
            with pytest.raises(ValueError, match="文件名已存在"):
                await manager.create_task(build_request("index"))
        finally:
            await manager.shutdown()

    asyncio.run(scenario())


def test_check_output_name_uses_existing_files_and_active_reservations(tmp_path: Path) -> None:
    async def scenario() -> None:
        (tmp_path / "index.mp4").write_bytes(b"existing")
        manager = build_manager(tmp_path)
        try:
            normalized, available = await manager.check_output_name("index.m3u8")
            assert normalized == "index"
            assert available is False

            task = await manager.create_task(build_request("episode"))
            assert task.task_name == "episode"

            normalized, available = await manager.check_output_name("episode")
            assert normalized == "episode"
            assert available is False
        finally:
            await manager.shutdown()

    asyncio.run(scenario())


def test_check_name_route_returns_red_hint_data() -> None:
    class CheckManager:
        async def check_output_name(self, requested_name: str) -> tuple[str, bool]:
            assert requested_name == "index"
            return "index", False

    app = FastAPI()
    app.state.task_manager = CheckManager()
    app.include_router(tasks_router)

    response = TestClient(app).post("/api/video/tasks/check-name", json={"fileName": "index"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is False
    assert payload["normalizedName"] == "index"
    assert "文件名已存在" in payload["message"]
