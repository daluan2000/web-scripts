from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path


def _prepare_direct_run() -> None:
    if __name__ != "__main__":
        return

    if getattr(sys, "frozen", False):
        runtime_dir = Path(sys.executable).resolve().parent
    else:
        runtime_dir = Path(__file__).resolve().parent.parent
        runtime_dir_text = str(runtime_dir)
        if runtime_dir_text not in sys.path:
            sys.path.insert(0, runtime_dir_text)

    os.chdir(runtime_dir)


_prepare_direct_run()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.routes.health import router as health_router
from app.api.routes.tasks import router as tasks_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.downloader import YtDlpDownloader
from app.services.task_manager import DownloadTaskManager

settings = get_settings()
configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    downloader = YtDlpDownloader(settings)
    manager = DownloadTaskManager(settings=settings, downloader=downloader)
    app.state.task_manager = manager
    yield
    await manager.shutdown()


app = FastAPI(
    title="Video Downloader Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origin_list(),
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(tasks_router)


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.app_name,
        "env": settings.app_env,
        "docs": "/docs",
    }


def main() -> None:
    options: dict[str, object] = {
        "host": settings.host,
        "port": settings.port,
        "log_level": settings.log_level.lower(),
    }

    if settings.ssl_certfile and settings.ssl_keyfile:
        options["ssl_certfile"] = settings.ssl_certfile
        options["ssl_keyfile"] = settings.ssl_keyfile

    uvicorn.run(app, **options)


if __name__ == "__main__":
    main()
