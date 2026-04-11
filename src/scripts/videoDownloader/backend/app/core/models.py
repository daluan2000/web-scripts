from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class VideoItemInput(BaseModel):
    src: str = Field(..., min_length=1)
    type: str = "unknown"
    title: str = ""
    duration: int = 0
    mimeType: str = ""
    fileName: str = ""
    requestHeaders: dict[str, str] = Field(default_factory=dict)


class TaskCreateRequest(BaseModel):
    videos: list[VideoItemInput] = Field(default_factory=list)


class TaskItemView(BaseModel):
    index: int
    src: str
    type: str
    title: str
    status: TaskStatus
    progress: float
    filename: str = ""
    error: str = ""


class TaskView(BaseModel):
    id: str
    taskName: str = ""
    status: TaskStatus
    createdAt: datetime
    updatedAt: datetime
    total: int
    completed: int
    success: int
    failed: int
    progress: float
    progressText: str = ""
    speed: str = ""
    eta: str = ""
    message: str = ""
    outputDir: str
    error: str = ""
    items: list[TaskItemView] = Field(default_factory=list)


class TaskEvent(BaseModel):
    event: str
    taskId: str
    task: TaskView
    at: datetime


class TaskCreateResponse(BaseModel):
    taskId: str
    taskName: str = ""
    outputDir: str = ""
    status: TaskStatus


class TaskCancelResponse(BaseModel):
    taskId: str
    status: TaskStatus
    message: str


class TaskListResponse(BaseModel):
    tasks: list[TaskView]


class OpenDirectoryRequest(BaseModel):
    taskId: str = ""


class OpenDirectoryResponse(BaseModel):
    opened: bool
    path: str
    message: str


class CleanupPartDirsResponse(BaseModel):
    deletedCount: int
    deletedDirs: list[str] = Field(default_factory=list)
    runningTaskIds: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    detail: str
    meta: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    service: str
    now: datetime
