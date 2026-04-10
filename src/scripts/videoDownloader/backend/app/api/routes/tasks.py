from __future__ import annotations

import platform
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect

from app.api.deps import get_task_manager
from app.core.models import (
    OpenDirectoryRequest,
    OpenDirectoryResponse,
    TaskCancelResponse,
    TaskCreateRequest,
    TaskCreateResponse,
    TaskListResponse,
    TaskView,
)
from app.services.task_manager import DownloadTaskManager

router = APIRouter(prefix="/api/video/tasks", tags=["video-tasks"])


@router.post("", response_model=TaskCreateResponse)
async def create_task(
    payload: TaskCreateRequest,
    manager: DownloadTaskManager = Depends(get_task_manager),
) -> TaskCreateResponse:
    try:
        task = await manager.create_task(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return TaskCreateResponse(
        taskId=task.id,
        taskName=task.task_name,
        outputDir=task.output_dir,
        status=task.status,
    )


def _open_directory_in_os(path: Path) -> tuple[bool, str]:
    system = platform.system().lower()
    try:
        if system == "darwin":
            subprocess.Popen(["open", str(path)])
        elif system == "windows":
            subprocess.Popen(["explorer", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except FileNotFoundError:
        return False, "系统未安装目录打开命令"
    except Exception as error:  # noqa: BLE001
        return False, f"打开目录失败: {error}"

    return True, "已请求系统打开目录"


@router.post("/open-dir", response_model=OpenDirectoryResponse)
async def open_directory(
    payload: OpenDirectoryRequest,
    manager: DownloadTaskManager = Depends(get_task_manager),
) -> OpenDirectoryResponse:
    target_dir: Path | None = None

    task_id = (payload.taskId or "").strip()

    if task_id:
        task = await manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="task not found")
        target_dir = Path(task.outputDir)
    else:
        target_dir = Path(manager.get_default_output_dir())

    target_dir = target_dir.expanduser().resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    opened, message = _open_directory_in_os(target_dir)
    return OpenDirectoryResponse(opened=opened, path=str(target_dir), message=message)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    manager: DownloadTaskManager = Depends(get_task_manager),
) -> TaskListResponse:
    tasks = await manager.list_tasks()
    return TaskListResponse(tasks=tasks)


@router.get("/{task_id}", response_model=TaskView)
async def get_task(task_id: str, manager: DownloadTaskManager = Depends(get_task_manager)) -> TaskView:
    task = await manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return task


@router.post("/{task_id}/cancel", response_model=TaskCancelResponse)
async def cancel_task(
    task_id: str,
    manager: DownloadTaskManager = Depends(get_task_manager),
) -> TaskCancelResponse:
    task = await manager.cancel_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return TaskCancelResponse(taskId=task.id, status=task.status, message=task.message)


@router.websocket("/ws")
async def task_events(
    websocket: WebSocket,
    taskId: str | None = Query(default=None),
) -> None:
    manager: DownloadTaskManager = websocket.app.state.task_manager
    await websocket.accept()
    queue = manager.subscribe(taskId)

    try:
        if taskId:
            task = await manager.get_task(taskId)
            if task:
                await websocket.send_json(
                    {
                        "event": "task.snapshot",
                        "taskId": taskId,
                        "task": task.model_dump(mode="json"),
                    }
                )
        else:
            tasks = await manager.list_tasks()
            await websocket.send_json(
                {
                    "event": "task.list",
                    "taskId": "",
                    "tasks": [task.model_dump(mode="json") for task in tasks],
                }
            )

        while True:
            event = await queue.get()
            await websocket.send_json(event.model_dump(mode="json"))
    except WebSocketDisconnect:
        return
    finally:
        manager.unsubscribe(queue)
