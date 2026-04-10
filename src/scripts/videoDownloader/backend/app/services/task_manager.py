from __future__ import annotations

import asyncio
import contextlib
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import Settings
from app.core.models import (
    TaskCreateRequest,
    TaskEvent,
    TaskItemView,
    TaskStatus,
    TaskView,
    VideoItemInput,
)
from app.services.downloader import YtDlpDownloader

TERMINAL_STATUSES = {TaskStatus.success, TaskStatus.failed, TaskStatus.cancelled}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _sanitize_file_stem(name: str) -> str:
    value = (name or "").strip()
    value = value.replace("\\", "/").split("/")[-1]
    value = re.sub(r"\.[0-9A-Za-z]{1,6}$", "", value)
    value = re.sub(r"[^0-9A-Za-z._-]+", "_", value)
    value = value.strip("._-")
    return value[:120] or "video"


def _fallback_name_from_url(url: str) -> str:
    raw = (url or "").split("/")[-1].split("?")[0]
    return raw or "video"


@dataclass
class TaskItemState:
    index: int
    src: str
    type: str
    title: str
    status: TaskStatus = TaskStatus.queued
    progress: float = 0.0
    filename: str = ""
    error: str = ""

    def to_view(self) -> TaskItemView:
        return TaskItemView(
            index=self.index,
            src=self.src,
            type=self.type,
            title=self.title,
            status=self.status,
            progress=round(self.progress, 4),
            filename=self.filename,
            error=self.error,
        )


@dataclass
class TaskState:
    id: str
    task_name: str
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    total: int
    completed: int
    success: int
    failed: int
    progress: float
    speed: str
    eta: str
    message: str
    output_dir: str
    cache_dir: str = ""
    error: str = ""
    items: list[TaskItemState] = field(default_factory=list)
    cancel_requested: bool = False
    runner: Optional[asyncio.Task] = None

    def to_view(self) -> TaskView:
        return TaskView(
            id=self.id,
            taskName=self.task_name,
            status=self.status,
            createdAt=self.created_at,
            updatedAt=self.updated_at,
            total=self.total,
            completed=self.completed,
            success=self.success,
            failed=self.failed,
            progress=round(self.progress, 4),
            speed=self.speed,
            eta=self.eta,
            message=self.message,
            outputDir=self.output_dir,
            error=self.error,
            items=[item.to_view() for item in self.items],
        )


class DownloadTaskManager:
    def __init__(self, settings: Settings, downloader: YtDlpDownloader):
        self._settings = settings
        self._downloader = downloader
        self._tasks: dict[str, TaskState] = {}
        self._tasks_lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_tasks)
        self._subscribers: list[tuple[asyncio.Queue[TaskEvent], Optional[str]]] = []

    async def create_task(self, payload: TaskCreateRequest) -> TaskState:
        if not payload.videos:
            raise ValueError("videos is required")

        if len(payload.videos) != 1:
            raise ValueError("当前仅支持单视频任务，请逐个提交")

        video = payload.videos[0]
        fallback = _fallback_name_from_url(video.src)
        requested_name = (video.fileName or "").strip() or fallback
        task_id = _sanitize_file_stem(requested_name)

        if not task_id:
            raise ValueError("无法生成任务ID，请填写有效文件名")

        output_dir = self._settings.get_download_root_path()
        output_dir.mkdir(parents=True, exist_ok=True)

        if self._has_existing_output_file(output_dir, task_id):
            raise ValueError(f"文件名已存在: {task_id}")

        async with self._tasks_lock:
            existing_task = self._tasks.get(task_id)
            if existing_task and existing_task.status not in TERMINAL_STATUSES:
                raise ValueError(f"同名任务正在执行: {task_id}")
            if existing_task and existing_task.status in TERMINAL_STATUSES:
                self._tasks.pop(task_id, None)

        now = _utcnow()
        items = [
            TaskItemState(
                index=index,
                src=item.src,
                type=item.type,
                title=item.title,
            )
            for index, item in enumerate(payload.videos)
        ]

        task = TaskState(
            id=task_id,
            task_name="",
            status=TaskStatus.queued,
            created_at=now,
            updated_at=now,
            total=len(payload.videos),
            completed=0,
            success=0,
            failed=0,
            progress=0.0,
            speed="",
            eta="",
            message="任务已创建，等待执行",
            output_dir=str(output_dir),
            cache_dir=str((output_dir / ".task_cache" / task_id).resolve()),
            items=items,
        )

        async with self._tasks_lock:
            self._tasks[task.id] = task

        task.runner = asyncio.create_task(self._run_task(task.id, payload.videos), name=f"task-{task.id}")
        await self._emit("task.created", task)
        return task

    def _has_existing_output_file(self, output_dir: Path, file_stem: str) -> bool:
        if (output_dir / file_stem).is_file():
            return True
        pattern = f"{file_stem}.*"
        for path in output_dir.glob(pattern):
            if path.is_file():
                return True
        return False

    def get_default_output_dir(self) -> str:
        return str(self._settings.get_download_root_path())

    async def list_tasks(self) -> list[TaskView]:
        async with self._tasks_lock:
            tasks = list(self._tasks.values())
        return [task.to_view() for task in sorted(tasks, key=lambda t: t.created_at, reverse=True)]

    async def get_task(self, task_id: str) -> TaskView | None:
        async with self._tasks_lock:
            task = self._tasks.get(task_id)
        return task.to_view() if task else None

    async def cancel_task(self, task_id: str) -> TaskState | None:
        async with self._tasks_lock:
            task = self._tasks.get(task_id)
        if not task:
            return None

        if task.status in {TaskStatus.success, TaskStatus.failed, TaskStatus.cancelled}:
            return task

        task.cancel_requested = True
        for item in task.items:
            if item.status in {TaskStatus.queued, TaskStatus.running}:
                item.status = TaskStatus.cancelled
                item.error = "任务已取消"
        task.message = "正在取消任务"
        task.updated_at = _utcnow()
        await self._emit("task.cancelling", task)
        return task

    def _cleanup_task_cache_files(self, task: TaskState) -> None:
        output_dir = Path(task.output_dir)
        cache_dir = Path(task.cache_dir) if task.cache_dir else (output_dir / ".task_cache" / task.id)

        # Delete task-local yt-dlp cache/temp directory.
        if cache_dir.exists():
            shutil.rmtree(cache_dir, ignore_errors=True)

        # Delete partial files for this task from output directory.
        if output_dir.exists():
            for path in output_dir.iterdir():
                if not path.is_file():
                    continue
                if not path.name.startswith(task.id):
                    continue
                if any(token in path.name for token in (".part", ".ytdl", ".aria2", ".temp", ".frag")):
                    with contextlib.suppress(Exception):
                        path.unlink(missing_ok=True)

    def subscribe(self, task_id: Optional[str] = None) -> asyncio.Queue[TaskEvent]:
        queue: asyncio.Queue[TaskEvent] = asyncio.Queue(maxsize=200)
        self._subscribers.append((queue, task_id))
        return queue

    def unsubscribe(self, queue: asyncio.Queue[TaskEvent]) -> None:
        self._subscribers = [(q, filter_task_id) for q, filter_task_id in self._subscribers if q is not queue]

    async def shutdown(self) -> None:
        async with self._tasks_lock:
            tasks = [task.runner for task in self._tasks.values() if task.runner and not task.runner.done()]

        for runner in tasks:
            runner.cancel()
        for runner in tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await runner

    async def _run_task(self, task_id: str, videos: list[VideoItemInput]) -> None:
        task = await self._require_task(task_id)

        async with self._semaphore:
            if task.cancel_requested:
                self._set_terminal_status(task, TaskStatus.cancelled, "任务已取消")
                await self._emit("task.cancelled", task)
                return

            task.status = TaskStatus.running
            task.message = "任务执行中"
            task.updated_at = _utcnow()
            await self._emit("task.running", task)

            for index, video in enumerate(videos):
                item = task.items[index]

                if task.cancel_requested:
                    item.status = TaskStatus.cancelled
                    item.error = "任务已取消"
                    break

                item.status = TaskStatus.running
                item.progress = 0.0
                task.updated_at = _utcnow()
                await self._emit("task.updated", task)

                try:
                    filename = await self._downloader.download_video(
                        task_id=task.id,
                        item_index=index,
                        video=video,
                        output_dir=Path(task.output_dir),
                        cache_dir=Path(task.cache_dir) if task.cache_dir else None,
                        should_cancel=lambda: task.cancel_requested,
                        emit_progress=lambda payload: self._on_item_progress(task, item, payload),
                    )
                    if task.cancel_requested:
                        item.status = TaskStatus.cancelled
                        item.error = "任务已取消"
                        if filename:
                            partial_or_done = Path(task.output_dir) / filename
                            if partial_or_done.exists() and partial_or_done.is_file():
                                partial_or_done.unlink(missing_ok=True)
                        break
                    item.status = TaskStatus.success
                    item.progress = 1.0
                    item.filename = filename
                    task.success += 1
                except Exception as error:  # noqa: BLE001
                    if task.cancel_requested:
                        item.status = TaskStatus.cancelled
                        item.error = "任务已取消"
                    else:
                        item.status = TaskStatus.failed
                        item.error = str(error)
                        task.failed += 1

                task.completed = task.success + task.failed
                task.progress = self._compute_overall_progress(task)
                task.speed = ""
                task.eta = ""
                task.updated_at = _utcnow()
                await self._emit("task.updated", task)

            if task.cancel_requested:
                self._cleanup_task_cache_files(task)
                self._set_terminal_status(task, TaskStatus.cancelled, "任务已取消")
                await self._emit("task.cancelled", task)
                return

            if task.failed > 0:
                self._set_terminal_status(
                    task,
                    TaskStatus.failed,
                    f"任务完成，成功 {task.success}，失败 {task.failed}",
                )
                await self._emit("task.failed", task)
            else:
                self._set_terminal_status(task, TaskStatus.success, f"任务完成，共 {task.success} 个视频")
                await self._emit("task.completed", task)

    async def _require_task(self, task_id: str) -> TaskState:
        async with self._tasks_lock:
            task = self._tasks[task_id]
        return task

    def _on_item_progress(self, task: TaskState, item: TaskItemState, payload: dict) -> None:
        status = str(payload.get("status") or "")
        item.progress = float(payload.get("progress") or 0.0)
        item.filename = str(payload.get("filename") or item.filename)
        if status == "finished":
            item.progress = 1.0

        task.speed = str(payload.get("speed") or "")
        task.eta = str(payload.get("eta") or "")
        task.progress = self._compute_overall_progress(task)
        task.updated_at = _utcnow()

        asyncio.create_task(self._emit("task.updated", task))

    def _compute_overall_progress(self, task: TaskState) -> float:
        if task.total <= 0:
            return 1.0
        completed = sum(1.0 if item.status in {TaskStatus.success, TaskStatus.failed} else 0.0 for item in task.items)
        in_progress = sum(item.progress for item in task.items if item.status == TaskStatus.running)
        return max(0.0, min(1.0, (completed + in_progress) / float(task.total)))

    def _set_terminal_status(self, task: TaskState, status: TaskStatus, message: str) -> None:
        task.status = status
        task.progress = 1.0 if status in {TaskStatus.success, TaskStatus.failed} else task.progress
        task.message = message
        task.updated_at = _utcnow()

    async def _emit(self, event_name: str, task: TaskState) -> None:
        event = TaskEvent(event=event_name, taskId=task.id, task=task.to_view(), at=_utcnow())

        stale: list[asyncio.Queue[TaskEvent]] = []
        for queue, filter_task_id in self._subscribers:
            if filter_task_id and filter_task_id != task.id:
                continue
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                stale.append(queue)

        if stale:
            for queue in stale:
                self.unsubscribe(queue)
