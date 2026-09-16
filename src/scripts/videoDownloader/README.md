# Video Downloader

捕获网页播放器使用的媒体地址，并提交给本机 FastAPI + yt-dlp 后端下载。浏览器脚本负责捕获、选择和展示进度，实际文件由后端写入本机下载目录。

当前版本：`1.1.0`

## 核心功能

- 从页面加载开始捕获 fetch、XHR、Performance 中的媒体请求，并与 `video`、`source`、部分 `data-*` 属性和视频直链合并。
- 解析 HLS 主清单与子清单的引用关系，同一视频只展示主清单。
- 从播放器的 `blob:` video 元素补充时长、分辨率和封面等元数据。
- 支持选择多个视频，前端逐个创建独立下载任务。
- 通过 WebSocket 实时显示后端任务状态和进度，失败时自动降级为轮询。
- 可将当前播放页直接添加为候选，由 yt-dlp 的站点解析器尝试下载。
- 支持任务级透传可读取的 Cookie、Referer 和 User-Agent。
- 提交前检查后端下载目录；文件名已存在或有同名任务时显示提示并禁止提交。
- 使用 `Ctrl+Shift+V` 快速捕获。

## 安装

### 前置条件

1. Tampermonkey 浏览器扩展。
2. Python 3，并确保 `python` 命令可用。
3. FFmpeg（推荐）。DASH/MPD 和部分站点的视频、音频分轨需要 FFmpeg 合并，可用 `ffmpeg -version` 检查。

> 使用脚本前，请在浏览器的 Tampermonkey 扩展设置中打开“允许用户脚本”。

### 1. 安装用户脚本

1. 构建脚本，或直接使用 `dist/` 中前缀最新的 `<前缀>-videoDownloader.user.js`。
2. 用浏览器打开该文件，并在 Tampermonkey 中确认安装。
3. 更新脚本后刷新已经打开的视频页面；网络捕获器需要在页面加载开始时安装。

自动构建前缀固定为 4 个字符，例如 `ecqj-videoDownloader.user.js`。

### 2. 启动本机后端

默认 HTTP 地址为 `http://127.0.0.1:8787`，WebSocket 地址为 `ws://127.0.0.1:8787`。

Windows PowerShell：

```powershell
cd src\scripts\videoDownloader\backend
powershell -NoProfile -ExecutionPolicy Bypass -File .\start_backend.ps1
```

首次运行会自动创建 `.venv`、安装依赖，并从 `.env.example` 生成 `.env`。后续确认依赖没有变化时，可以执行：

```powershell
.\start_backend.ps1 -SkipDependencyInstall
```

Linux、macOS、Git Bash 或 WSL：

```bash
cd src/scripts/videoDownloader/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app/main.py
```

下载目录由 `.env` 控制，默认配置为：

```dotenv
VD_BACKEND_DOWNLOAD_ROOT=~/Downloads/videoDownloader
```

修改后端代码或 `.env` 后需要重启后端。看到 `Uvicorn running on http://127.0.0.1:8787` 表示启动成功。

后端打包、API 和 HTTPS 配置参见 [VideoDownloader Backend](backend/README.md)。

## 使用方法

1. 先启动后端，再打开或刷新视频页面。
2. 开始播放视频并等待播放器显示时长，以便捕获真实清单并补全元数据。
3. 点击右下角悬浮按钮打开面板。
4. 点击“捕获视频”，或按 `Ctrl+Shift+V`；脚本会同时检查当前页面及其 frame。
5. 如果显示“主清单（已合并 N 个子清单）”，只需提交主清单。
6. 填写最终文件名，不需要扩展名。同名文件或任务存在时输入框会变红，必须更名后才能提交。
7. 选择一个或多个候选项，点击“提交任务”。每个候选项会创建一个独立任务。
8. 在“后端任务进度”区域查看进度、取消任务或打开下载目录。

如果网络捕获没有找到可用地址，可以点击“添加当前页”，让 yt-dlp 尝试直接解析当前站点页面。

## 支持范围

| 类型 | 支持情况 | 说明 |
|------|----------|------|
| HLS / m3u8 | 支持 | 识别主清单和已捕获的子清单关系，由 yt-dlp 选择可用画质和音轨 |
| DASH / MPD | 支持 | 视频和音频通常分轨，建议安装 FFmpeg 进行合并 |
| 视频直链 | 支持 | 支持 `mp4`、`webm`、`m4v`、`mov`、`mkv`、`avi`、`flv`、`ts` 等常见格式 |
| MIME 识别的动态地址 | 部分支持 | URL 没有扩展名时，可根据响应的 `Content-Type` 识别视频或清单 |
| yt-dlp 支持的站点页面 | 尝试支持 | 使用“添加当前页”；结果取决于 yt-dlp 版本、登录状态和站点变化 |

“支持”表示脚本存在相应下载路径，不代表所有网站都一定可以下载。登录、Cookie、防盗链、地区限制、验证码和接口变更都可能影响结果。

## 文件名和任务规则

- 后端任务 ID 使用独立 UUID，与输出文件名无关。
- 下载目录已存在相同文件名（不区分大小写）时，后端拒绝创建任务，不会覆盖文件或自动追加序号。
- 有同名未结束任务时同样拒绝创建。前端会提前检查，后端创建任务时会再次检查并发冲突。
- 每个后端任务只包含一个视频；前端批量提交时会依次创建多个任务。

## 当前限制

- `blob:` 地址本身无法提交后端；脚本会尝试捕获其背后的 m3u8、MPD 或完整视频请求。
- 只发现 TS/M4S 分片时仅显示汇总提示，不会将单个分片作为视频下载。
- 不支持绕过 DRM。
- 部分站点依赖 HttpOnly Cookie，前端无法直接读取。
- 平台私有接口或加密响应中的音视频轨地址不一定能够识别。
- 直播或播放器尚未加载完成时可能没有固定时长；HLS 清单通常也不包含封面。
- 如果 HTTPS 页面阻断本机 HTTP/WS，需要配置 HTTPS/WSS 后端。

## 常见问题

### 面板显示“后端未连接”怎么办？

确认后端窗口仍在运行，访问地址和端口与 `src/shared/config.js` 一致，然后点击“重连后端”。

### 为什么捕获到多个 `index.m3u8`？

HLS 播放器可能依次请求主清单和具体画质的子清单。能够从清单正文确认父子关系时，脚本会合并显示；无法证明关系的同名 URL 会保留，以免误合并不同视频。

### 为什么文件名输入框变红？

下载目录已有同名文件，或存在同名未结束任务。请修改文件名；后端不会覆盖或自动改名。

### 为什么有时长但没有封面？

时长通常来自 `<video>` 播放元数据，而 HLS/DASH 清单通常不包含封面。网站使用独立图片或 CSS 背景显示封面时，也可能无法自动关联。

## 开发

### 主要源码

| 文件或目录 | 说明 |
|------------|------|
| `main.js` | 用户脚本入口、面板交互与任务协调 |
| `networkMediaCapture.js` | 网络媒体和 HLS 清单捕获 |
| `videoCapture.js` | 页面视频元素与候选项捕获 |
| `capturedVideoMetadata.js` | 从播放器补充媒体元数据 |
| `videoSelector.js` | 视频选择与文件名检查界面 |
| `backendClient.js` | 后端 HTTP、WebSocket 与轮询客户端 |
| `panel.js`、`styles.css` | 操作面板与样式 |
| `backend/` | FastAPI + yt-dlp 本机后端 |

通用配置、请求、存储、日志和界面工具位于 `src/shared/` 与 `src/styles/`，由不同用户脚本共享。

### 构建与测试

在项目根目录执行：

```bash
npm install
npm run dev:video
npm run build:video
npm run test:video
```

- `npm run dev:video`：监听视频脚本的文件变化并自动构建。
- `npm run build:video`：构建视频脚本。
- `npm run test:video`：运行视频脚本测试。
- `npm run build`：构建项目中的全部用户脚本。

构建产物输出到 `dist/<前缀>-videoDownloader.user.js`。产物是可直接安装的单文件用户脚本，默认不压缩并保留历次构建。

后端开发、测试、打包与 API 说明参见 [后端 README](backend/README.md)。
