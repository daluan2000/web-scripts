# My Userscripts

一个多入口油猴脚本工程，使用 Vite 作为构建工具，支持多个脚本共享公共模块。

---

## Image Downloader（图片批量下载脚本）

批量捕获并下载网页图片，支持所有网站图片下载，支持常见网站原画质图片下载

当前版本：`1.1.1`

### 核心功能

- **图片捕获** - 获取页面中的 `<img>`、CSS 背景图、懒加载图片等资源
- **自动累计** - 页面滚动或内容变化时继续捕获新图片，自动捕获期间不会移除暂时离开 DOM 的 URL
- **DOM Path 排序** - 按图片的 DOM Path 自然排序，同一容器中的第 2 张会排在第 10 张之前
- **自动重排** - 捕获到新 URL 或已有 URL 的 Path 发生变化时，立即刷新列表顺序
- **批量下载** - 支持选择多张图片批量下载
- **快捷键** - `Ctrl+Shift+I` 快速唤起图片捕获

### 原图增强
针对以下网站的图片进行优化，自动获取原始大图：

| 网站 | 处理方式 |
|------|---------|
| 哔哩哔哩 | 去除 `@1256w_708h_` 等压缩参数 |
| 字节跳动/抖音 | 去除图片尺寸和质量参数 |
| 微信公众号 | 去除缩略图参数，恢复原图 |
| 小红书 | 域名优化处理 |

### 如何使用？

**只需要一个浏览器扩展：Tampermonkey（油猴）**

使用视频：[Bilibili - 图片下载脚本使用演示](https://www.bilibili.com/video/BV1uNDEB8EDu)

> **重要：** 使用脚本前，请在浏览器的 Tampermonkey 扩展设置中打开「允许用户脚本」选项，否则脚本无法正常运行。

### 第一步：安装 Tampermonkey 扩展

1. **Chrome / Edge 浏览器**
   - 打开 [Chrome 网上应用店](https://chrome.google.com/webstore)
   - 搜索 **Tampermonkey**
   - 点击「添加到 Chrome」

2. **Firefox 浏览器**
   - 打开 [Firefox 附加组件商店](https://addons.mozilla.org)
   - 搜索 **Tampermonkey**
   - 点击「添加到 Firefox」

3. **其他浏览器**
   - 建议使用 Chrome、Edge 或 Firefox
   - 安装完扩展后，浏览器右上角会出现一个🎨图标

### 第二步：安装脚本

可自行上网搜索“如何向Tampermonkey添加脚本”。

**方法一：直接安装（推荐）**

1. 找到 `dist/<前缀>-imageDownloader.user.js` 文件（选择前缀最新的一个）
2. 用浏览器打开这个文件（双击或在浏览器地址栏输入文件路径）
3. 浏览器会提示「Tampermonkey 想知道..."」，点击「继续安装」

**方法二：从文件导入**

1. 点击浏览器右上角的 Tampermonkey 图标
2. 点击「管理面板」
3. 点击左侧「工具」选项
4. 选择「从本地文件导入」
5. 选择 `dist/<前缀>-imageDownloader.user.js` 文件

### 第三步：使用脚本

1. 打开任意包含图片的网页（可以是微博、小红书、B站等）
2. 点击右下角悬浮图标，页面会弹出操作窗口，可移动或缩放大小
3. 点击「捕获图片」按钮（或快捷键`Ctrl + Shift + I`），自动捕获当前页面所有图片
4. 如需持续捕获动态内容，开启「自动捕获」后滚动页面
5. 点击图片可以选中（选中会显示勾号）
6. 点击「下载选中」按钮开始下载。图片会通过 Tampermonkey 扩展下载；当 Tampermonkey 弹出是否允许下载的提示时，请点击「允许」或「同意」

### 常见问题

Q: 为什么下载的图片是压缩过的？
A: 部分网站会使用 CDN 参数压缩图片。本脚本已内置 B站、抖音、小红书、知乎等网站的增强规则，会自动去除压缩参数获取原图。

Q: 无法下载某些图片？
A: 可能原因：
- 图片跨域限制
- 图片需要登录认证
- 图片是动态加载的（可尝试滚动页面后重新捕获）

Q: 如何下载单个图片？
A: 唤起面板后，只选中该图片，点击下载即可。

Q: 捕获窗口中的图片按照什么顺序排列？
A: 图片按 DOM Path 自然排序。对于同一个 `div` 下的直接 `<img>` 子元素，顺序与其 DOM 中的先后顺序一致，例如第 2 张会排在第 10 张之前。同一个 URL 多次出现时只保留一项，并使用最后扫描到的 Path。


Q: 脚本没有反应怎么办？
A: 请确认：
1. Tampermonkey 扩展已正确安装并启用
2. 脚本在「已安装」列表中显示正常

---

## Video Downloader（视频批量下载脚本）

批量捕获页面视频关键信息，并提交到本机后端下载，交互方式与图片下载器保持一致。

### 核心功能
- 自动捕获页面中的视频资源（video/source、部分 data-*、视频直链）
- 支持选择后批量提交下载任务（FastAPI + yt-dlp）
- 实时显示后端任务状态和进度（WebSocket，失败时自动降级轮询）
- 支持任务级透传 Cookie / Authorization / Referer / User-Agent
- 快捷键 `Ctrl+Shift+V` 快速捕获

### 当前支持范围
- 前端负责：捕获/选择/任务提交/进度展示
- 后端负责：使用 yt-dlp 下载并直接落盘到本机目录
- 协议默认：`http://127.0.0.1:8787` + `ws://127.0.0.1:8787`

### 当前限制
- `blob:` 资源无法直接提取源地址
- DRM 受保护视频通常无法通过常规方式下载
- 部分站点可能依赖 HttpOnly Cookie，前端无法直接读取
- 如 HTTPS 页面阻断本机 HTTP/WS，请切到 HTTPS/WSS 后端

---

## 📋 项目结构

## 目录结构

```
my-userscripts/
├── src/
│   ├── scripts/           # 各脚本的入口文件
│   │   └── imageDownloader/    # 图片批量下载器
│   │       ├── main.js         # 脚本主入口
│   │       ├── imageCapture.js # 页面图片和 DOM Path 捕获
│   │       ├── imageCollection.js # URL 累计、更新和排序
│   │       ├── autoCapture.js  # 自动捕获触发控制
│   │       └── imageEnhancers.js  # 原图增强规则
│   │
│   ├── shared/            # 共享模块（所有脚本共用）
│   │   ├── config.js      # 全局配置
│   │   ├── dom.js         # DOM 操作工具
│   │   ├── request.js     # 网络请求封装
│   │   ├── storage.js     # 存储工具
│   │   └── logger.js      # 日志工具
│   │
│   └── styles/            # 共享样式
│       ├── common.css     # 通用样式
│       └── popup.css      # 弹窗样式
│
├── dist/                  # 打包输出目录，保留历次构建
│   └── <前缀>-imageDownloader.user.js  # 打包产物（可直接安装）
│
├── package.json           # 项目配置
├── vite.config.js         # Vite 构建配置
└── README.md              # 本文档
```

## 目录说明

### `src/scripts/imageDownloader/`

图片批量下载器的核心代码。

| 文件 | 说明 |
|------|------|
| main.js | 脚本主入口，负责初始化和调用共享模块 |
| imageCapture.js | 捕获页面图片并生成 DOM Path |
| imageCollection.js | 按 URL 管理图片集合并按 DOM Path 自然排序 |
| autoCapture.js | 监听页面滚动和内容变化，调度自动扫描 |
| imageEnhancers.js | 原图增强规则配置 |

### `src/shared/`

存放各脚本共享的工具模块。

| 模块 | 说明 |
|------|------|
| config.js | 全局配置项（API地址、日志级别等） |
| dom.js | DOM 操作工具（等待元素、创建元素等） |
| request.js | 基于 GM_xmlhttpRequest 的请求封装 |
| storage.js | 基于 GM_setValue 的存储封装 |
| logger.js | 分级日志工具（debug/info/warn/error） |

### `src/styles/`

共享的 CSS 样式文件。

| 文件 | 说明 |
|------|------|
| common.css | 通用样式（按钮、输入框、卡片等） |
| popup.css | 弹窗相关样式 |

### `dist/`

打包输出的目录，包含可直接安装到 Tampermonkey 的 `.user.js` 文件。

## 打包命令

### 安装依赖

```bash
npm install
```

### 开发模式

监听文件变化自动重新打包：

```bash
npm run dev
```

如需监听视频脚本：

```bash
npm run dev:video
```

videoDownloader 需要配合本机后端运行：

```bash
cd src/scripts/videoDownloader/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

### 生产打包

只构建图片或视频脚本：

```bash
npm run build:image
npm run build:video
```

构建全部脚本：

```bash
npm run build
```

该命令会按脚本逐个打包，确保每个 userscript 都是单文件产物。
每次构建会生成一个约 8 位的 Base36 时间前缀，不清空或覆盖旧产物。
产物默认不压缩，保留正常的 JavaScript 换行和缩进，便于检查与调试。

打包后的文件会输出到：
- `dist/<前缀>-imageDownloader.user.js`
- `dist/<前缀>-videoDownloader.user.js`

两者都可直接安装使用。

说明：不会依赖 `dist/assets` 共享 chunk。如需手动指定前缀，可使用
`BUILD_PREFIX=my1 npm run build:image`；自定义前缀只能包含字母、数字、下划线和连字符。

## 添加新增强规则

如需添加新的网站原图增强规则，修改 `src/scripts/imageDownloader/imageEnhancers.js`：

```javascript
registerEnhancer({
  name: 'example-site',      // 规则名称（唯一标识）
  priority: 10,               // 优先级（数字越大优先级越高）
  urlPattern: /example\.com/i,  // 匹配图片 URL 的正则表达式
  enhance(url) {
    // 处理函数：接收原 URL，返回增强后的 URL
    return url
      .replace(/&width=[^&]*/, '')
      .replace(/&quality=[^&]*/, '');
  },
});
```

### 规则属性说明

| 属性 | 类型 | 说明 |
|------|------|------|
| name | string | 规则名称（唯一标识） |
| urlPattern | RegExp | 匹配图片 URL 的正则表达式 |
| enhance | function | 处理函数，接收原 URL，返回增强后的 URL |
| priority | number | 优先级（数字越大优先级越高，可选） |

## 使用共享模块

在脚本中按以下方式导入共享模块：

```javascript
import { config } from '../shared/config.js';
import { waitForElement, createElement } from '../shared/dom.js';
import { get, post } from '../shared/request.js';
import { getItem, setItem } from '../shared/storage.js';
import { logger } from '../shared/logger.js';
```

## 注意事项

- 共享模块依赖 Tampermonkey 的 GM_* API
- 打包后的文件头部会自动注入元数据信息
- 样式文件需要在脚本中手动引入或通过 GM_addStyle 注入



