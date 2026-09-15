# VideoDownloader Backend

本目录是 videoDownloader 的本机后端，负责接收前端采集到的视频关键信息，并用 FastAPI + yt-dlp 执行下载。

## 功能

- HTTP API 创建/查询/取消下载任务
- WebSocket 实时推送任务状态和进度
- 下载完成后文件直接保存到本机目录
- 支持单视频文件名自定义
- 支持从前端请求“打开下载目录”
- 支持 yt-dlp 可处理的 HLS/m3u8、DASH/MPD、视频直链及站点页面

## FFmpeg

DASH/MPD 和部分站点会分别提供视频轨、音频轨，下载后需要 FFmpeg 合并。请安装 FFmpeg，并确认以下命令可执行：

```bash
ffmpeg -version
```

缺少 FFmpeg 时，相关任务会返回可操作的错误提示，不会静默保存单独的视频轨或音频轨。

## 安装与启动

### Windows（PowerShell/CMD）

Windows 不能在普通 PowerShell 或 CMD 中直接运行 `.sh`；如安装了 Git Bash 或 WSL 才能使用原脚本。Windows 原生环境可直接运行：

```powershell
cd src\scripts\videoDownloader\backend
powershell -NoProfile -ExecutionPolicy Bypass -File .\start_backend.ps1
```

脚本会自动创建 `.venv`、安装依赖、首次生成 `.env`，然后通过 Python 直接运行 `app/main.py`。监听地址和端口由 `.env` 中的 `VD_BACKEND_HOST`、`VD_BACKEND_PORT` 控制。

```powershell
# 跳过已有虚拟环境的依赖检查
.\start_backend.ps1 -SkipDependencyInstall
```

也可以使用虚拟环境中的 Python 直接运行 FastAPI 入口（读取 `.env`，不启用热重载）：

```powershell
.\.venv\Scripts\python.exe .\app\main.py
```

Windows 打包：

```powershell
.\package.ps1
```

打包脚本会安装 `requirements-build.txt` 中的 PyInstaller，并生成：

```text
dist\video-downloader-backend.exe
dist\.env.example
```

将 `.env.example` 复制为与 EXE 同目录的 `.env` 后即可配置运行。EXE 不带热重载，并会按照 `.env` 中的 `VD_BACKEND_HOST`、`VD_BACKEND_PORT` 和 HTTPS 证书配置启动。

### Linux/macOS/Git Bash/WSL

```bash
cd src/scripts/videoDownloader/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app/main.py
```

也可以执行 `./start_backend.sh`。打包时运行：

```bash
./package.sh
```

脚本会自动创建 `.venv`、安装 `requirements-build.txt` 中的构建依赖，并将产物和 `.env.example` 写入 `dist/`。WSL 使用独立的 `.venv-wsl`，避免与 Windows 虚拟环境冲突。已有完整构建环境时可执行 `./package.sh --skip-dependency-install`。Windows 推荐使用上述 `package.ps1`。

## API

- `POST /api/video/tasks` 创建任务
- `GET /api/video/tasks` 查询任务列表
- `GET /api/video/tasks/{taskId}` 查询单任务
- `POST /api/video/tasks/{taskId}/cancel` 取消任务
- `POST /api/video/tasks/open-dir` 打开目录（支持 taskId；为空时打开默认下载目录）
- `WS /api/video/tasks/ws` 订阅任务事件（可选 `?taskId=...`）

## HTTPS 说明

默认建议本机 `http://127.0.0.1:8787` + `ws://127.0.0.1:8787`。若浏览器策略阻断，再切到 HTTPS/WSS。
