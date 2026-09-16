# My Userscripts

一个使用 Vite 构建的多入口 Tampermonkey 用户脚本项目，多个脚本可共享公共模块。

## 脚本列表

| 脚本 | 功能简介 |
|------|----------|
| [Image Downloader（图片批量下载脚本）](src/scripts/imageDownloader/README.md) | 捕获网页图片，支持自动累计、尺寸筛选、原图增强、选择与批量下载；**支持抖音表情包动图导出，并可将 WebP 转为 PNG/GIF**。 |
| [Video Downloader（视频批量下载脚本）](src/scripts/videoDownloader/README.md) | 捕获网页中的视频媒体地址，并通过本机 yt-dlp 后端批量下载和展示任务进度。 |

## 快速使用

使用脚本前，请先安装 Tampermonkey，并在扩展设置中打开“允许用户脚本”。构建产物位于 `dist/`，安装时请选择对应脚本前缀最新的 `.user.js` 文件。

### Image Downloader

1. 打开包含图片的网页，点击右下角悬浮按钮，或按 `Ctrl+Shift+I` 捕获图片。
2. 根据尺寸筛选并选择图片，然后点击“下载选中”。
3. 如需持续收集动态内容，可开启“自动捕获”后滚动页面。

使用演示：[Bilibili - 图片下载脚本使用演示](https://www.bilibili.com/video/BV1uNDEB8EDu)

安装说明、完整功能与常见问题参见 [Image Downloader 文档](src/scripts/imageDownloader/README.md)。

### Video Downloader

1. 安装用户脚本，并按照 [Video Downloader 文档](src/scripts/videoDownloader/README.md) 启动本机后端。
2. 打开或刷新视频页面并开始播放，点击右下角悬浮按钮，或按 `Ctrl+Shift+V` 捕获视频。
3. 选择候选视频、填写文件名并提交任务，在面板中查看下载进度。

视频脚本需要 Python 3；DASH/MPD 和部分音视频分轨场景建议安装 FFmpeg。

## 界面预览

### Image Downloader

![图片批量下载器界面](assets/img-downloader.png)

### Video Downloader

![视频批量下载器界面](assets/vd-downloader.png)
