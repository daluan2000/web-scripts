from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VD_BACKEND_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "video-downloader-backend"
    app_env: str = "development"

    host: str = "127.0.0.1"
    port: int = 8787

    cors_origins: str = "http://127.0.0.1,http://localhost"
    cors_allow_origin_regex: str = r"https?://.*"
    cors_allow_credentials: bool = True

    download_root: str = "~/Downloads/videoDownloader"
    max_concurrent_tasks: int = 2
    task_retention_seconds: int = 12 * 60 * 60

    progress_emit_interval_seconds: float = 0.5
    ws_ping_interval_seconds: int = 20

    yt_dlp_socket_timeout: int = 60
    yt_dlp_retries: int = 5

    log_level: str = "INFO"

    ssl_certfile: Optional[str] = None
    ssl_keyfile: Optional[str] = None

    def get_cors_origin_list(self) -> list[str]:
        values = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        return values or ["http://127.0.0.1", "http://localhost"]

    def get_download_root_path(self) -> Path:
        return Path(self.download_root).expanduser().resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
