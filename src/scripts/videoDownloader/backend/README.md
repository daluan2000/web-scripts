# VideoDownloader Backend

本目录是 videoDownloader 的本机后端，负责接收前端采集到的视频关键信息，并用 FastAPI + yt-dlp 执行下载。

## 功能

- HTTP API 创建/查询/取消下载任务
- WebSocket 实时推送任务状态和进度
- 下载完成后文件直接保存到本机目录
- 支持单视频文件名自定义
- 支持从前端请求“打开下载目录”

## 安装与启动

```bash
cd src/scripts/videoDownloader/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

## API

- `POST /api/video/tasks` 创建任务
- `GET /api/video/tasks` 查询任务列表
- `GET /api/video/tasks/{taskId}` 查询单任务
- `POST /api/video/tasks/{taskId}/cancel` 取消任务
- `POST /api/video/tasks/open-dir` 打开目录（支持 taskId；为空时打开默认下载目录）
- `WS /api/video/tasks/ws` 订阅任务事件（可选 `?taskId=...`）

## HTTPS 说明

默认建议本机 `http://127.0.0.1:8787` + `ws://127.0.0.1:8787`。若浏览器策略阻断，再切到 HTTPS/WSS。
