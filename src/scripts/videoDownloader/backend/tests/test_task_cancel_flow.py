from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.tasks import router as tasks_router
from app.core.config import Settings
from app.core.models import TaskStatus
from app.services.downloader import YtDlpDownloader
from app.services.task_manager import (
    PART_DIR_MARKER_FILE,
    DownloadTaskManager,
    TaskCancellationTimeoutError,
    TaskItemState,
    TaskState,
)


def build_manager(tmp_path: Path, *, cancel_wait_seconds: int = 1) -> DownloadTaskManager:
    settings = Settings(
        download_root=str(tmp_path),
        max_concurrent_tasks=1,
        cancel_wait_seconds=cancel_wait_seconds,
    )
    downloader = YtDlpDownloader(settings)
    return DownloadTaskManager(settings=settings, downloader=downloader)


def build_task(
    tmp_path: Path,
    *,
    task_id: str,
    status: TaskStatus,
    runner: asyncio.Task | None,
) -> TaskState:
    now = datetime.now(timezone.utc)
    part_dir = tmp_path / task_id
    part_dir.mkdir(parents=True, exist_ok=True)
    (part_dir / PART_DIR_MARKER_FILE).write_text("marker\n", encoding="utf-8")

    # Create temp artifacts that must be removed after cancellation.
    (tmp_path / f"{task_id}.mp4.part").write_text("part\n", encoding="utf-8")
    (tmp_path / f"{task_id}.mp4.ytdl").write_text("ytdl\n", encoding="utf-8")
    (tmp_path / f"{task_id}.mp4.frag").write_text("frag\n", encoding="utf-8")

    item_status = TaskStatus.running if status in {TaskStatus.running, TaskStatus.cancelling} else TaskStatus.queued

    return TaskState(
        id=task_id,
        task_name=task_id,
        status=status,
        created_at=now,
        updated_at=now,
        total=1,
        completed=0,
        success=0,
        failed=0,
        progress=0.2,
        progress_text="",
        speed="",
        eta="",
        message="",
        output_dir=str(tmp_path),
        part_dir=str(part_dir),
        cache_dir=str(part_dir),
        items=[
            TaskItemState(
                index=0,
                src="https://example.com/video.mp4",
                type="video",
                title="demo",
                status=item_status,
            )
        ],
        runner=runner,
    )


def test_cancel_running_task_waits_and_cleans_files(tmp_path: Path) -> None:
    async def scenario() -> None:
        manager = build_manager(tmp_path, cancel_wait_seconds=2)
        task: TaskState | None = None

        async def cooperative_runner() -> None:
            while task is not None and not task.cancel_requested:
                await asyncio.sleep(0.01)

        runner = asyncio.create_task(cooperative_runner())
        task = build_task(tmp_path, task_id="video-a", status=TaskStatus.running, runner=runner)
        manager._tasks[task.id] = task

        result = await manager.cancel_task(task.id)
        assert result is task
        assert task.status == TaskStatus.cancelled
        assert task.cancel_requested is False
        assert task.message == "任务已取消"
        assert task.items[0].status == TaskStatus.cancelled
        assert not (tmp_path / "video-a").exists()
        assert not (tmp_path / "video-a.mp4.part").exists()
        assert not (tmp_path / "video-a.mp4.ytdl").exists()
        assert not (tmp_path / "video-a.mp4.frag").exists()

    asyncio.run(scenario())


def test_cancel_running_task_force_cancel_runner_avoids_timeout(tmp_path: Path) -> None:
    async def scenario() -> None:
        manager = build_manager(tmp_path, cancel_wait_seconds=1)
        blocker = asyncio.Event()

        async def stuck_runner() -> None:
            await blocker.wait()

        runner = asyncio.create_task(stuck_runner())
        task = build_task(tmp_path, task_id="video-b", status=TaskStatus.running, runner=runner)
        manager._tasks[task.id] = task

        result = await manager.cancel_task(task.id)

        assert result is task
        assert task.status == TaskStatus.cancelled
        assert task.cancel_requested is False
        assert task.message == "任务已取消"
        assert not (tmp_path / "video-b").exists()

    asyncio.run(scenario())


def test_cancel_queued_task_immediately_cleans_files(tmp_path: Path) -> None:
    async def scenario() -> None:
        manager = build_manager(tmp_path, cancel_wait_seconds=1)
        runner = asyncio.create_task(asyncio.sleep(60))
        task = build_task(tmp_path, task_id="video-c", status=TaskStatus.queued, runner=runner)
        manager._tasks[task.id] = task

        result = await manager.cancel_task(task.id)
        assert result is task
        assert task.status == TaskStatus.cancelled
        assert task.cancel_requested is False
        assert task.items[0].status == TaskStatus.cancelled

        await asyncio.sleep(0)
        assert runner.cancelled() or runner.done()
        assert not (tmp_path / "video-c").exists()
        assert not (tmp_path / "video-c.mp4.part").exists()

    asyncio.run(scenario())


def test_cleanup_part_dirs_keeps_running_and_cancelling(tmp_path: Path) -> None:
    async def scenario() -> None:
        manager = build_manager(tmp_path, cancel_wait_seconds=1)

        for task_id in ("running-task", "cancelling-task", "done-task"):
            part_dir = tmp_path / task_id
            part_dir.mkdir(parents=True, exist_ok=True)
            (part_dir / PART_DIR_MARKER_FILE).write_text("marker\n", encoding="utf-8")

        now = datetime.now(timezone.utc)
        manager._tasks["running-task"] = TaskState(
            id="running-task",
            task_name="running-task",
            status=TaskStatus.running,
            created_at=now,
            updated_at=now,
            total=0,
            completed=0,
            success=0,
            failed=0,
            progress=0.0,
            progress_text="",
            speed="",
            eta="",
            message="",
            output_dir=str(tmp_path),
        )
        manager._tasks["cancelling-task"] = TaskState(
            id="cancelling-task",
            task_name="cancelling-task",
            status=TaskStatus.cancelling,
            created_at=now,
            updated_at=now,
            total=0,
            completed=0,
            success=0,
            failed=0,
            progress=0.0,
            progress_text="",
            speed="",
            eta="",
            message="",
            output_dir=str(tmp_path),
        )
        manager._tasks["done-task"] = TaskState(
            id="done-task",
            task_name="done-task",
            status=TaskStatus.success,
            created_at=now,
            updated_at=now,
            total=0,
            completed=0,
            success=0,
            failed=0,
            progress=1.0,
            progress_text="",
            speed="",
            eta="",
            message="",
            output_dir=str(tmp_path),
        )

        deleted_dirs, running_task_ids = await manager.cleanup_non_running_part_dirs()

        assert any("done-task" in path for path in deleted_dirs)
        assert set(running_task_ids) == {"running-task", "cancelling-task"}
        assert (tmp_path / "running-task").exists()
        assert (tmp_path / "cancelling-task").exists()
        assert not (tmp_path / "done-task").exists()

    asyncio.run(scenario())


def test_cancel_route_maps_timeout_to_409() -> None:
    class TimeoutManager:
        async def cancel_task(self, task_id: str):  # noqa: ARG002
            raise TaskCancellationTimeoutError("取消超时（1s），任务仍在停止中")

    app = FastAPI()
    app.state.task_manager = TimeoutManager()
    app.include_router(tasks_router)

    client = TestClient(app)
    response = client.post("/api/video/tasks/t-1/cancel")

    assert response.status_code == 409
    assert "取消超时" in response.json().get("detail", "")


def test_cancel_route_returns_extended_response_fields() -> None:
    class SuccessManager:
        async def cancel_task(self, task_id: str):
            return SimpleNamespace(
                id=task_id,
                status=TaskStatus.cancelled,
                cancel_requested=False,
                message="任务已取消",
            )

    app = FastAPI()
    app.state.task_manager = SuccessManager()
    app.include_router(tasks_router)

    client = TestClient(app)
    response = client.post("/api/video/tasks/t-2/cancel")

    assert response.status_code == 200
    payload = response.json()
    assert payload["taskId"] == "t-2"
    assert payload["status"] == "cancelled"
    assert payload["cancelRequested"] is False
    assert payload["cancelled"] is True
