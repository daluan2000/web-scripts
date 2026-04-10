from __future__ import annotations

from fastapi import Request

from app.services.task_manager import DownloadTaskManager


def get_task_manager(request: Request) -> DownloadTaskManager:
    return request.app.state.task_manager
