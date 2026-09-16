# Image Downloader

批量捕获并下载网页图片，支持常见网站的原画质图片下载。

当前版本：`1.1.2`

## 核心功能

- **图片捕获**：获取页面中的 `<img>`、CSS 背景图、懒加载图片等资源，支持抖音表情包动图导出。
- **自动累计**：页面滚动或内容变化时继续捕获新图片；自动捕获期间不会移除暂时离开 DOM 的 URL。
- **DOM Path 排序**：按图片的 DOM Path 自然排序，同一容器中的第 2 张会排在第 10 张之前。
- **自动重排**：捕获到新 URL 或已有 URL 的 Path 发生变化时，立即刷新列表顺序。
- **尺寸筛选**：可分别设置图片宽度、高度的最小值和最大值，并选择是否展示尺寸未知的图片。
- **自动识别尺寸**：以有限并发补全背景图、poster、图标等资源的原始像素尺寸，无需滚动到对应缩略图。
- **批量下载**：支持选择多张图片批量下载，并可将 WebP 自动转换为 PNG/GIF。
- **快捷键**：使用 `Ctrl+Shift+I` 快速唤起图片捕获。

## 原图增强

脚本会针对以下网站优化图片地址，以获取原始大图：

| 网站 | 处理方式 |
|------|----------|
| 哔哩哔哩 | 去除 `@1256w_708h_` 等压缩参数 |
| 字节跳动/抖音 | 去除图片尺寸和质量参数 |
| 微信公众号 | 去除缩略图参数，恢复原图 |
| 小红书 | 优化图片域名和参数 |

## 安装

本脚本需要 Tampermonkey（油猴）浏览器扩展。

使用演示：[Bilibili - 图片下载脚本使用演示](https://www.bilibili.com/video/BV1uNDEB8EDu)

> 使用脚本前，请在浏览器的 Tampermonkey 扩展设置中打开“允许用户脚本”，否则脚本无法正常运行。

### 1. 安装 Tampermonkey

- Chrome / Edge：在 [Chrome 网上应用店](https://chrome.google.com/webstore) 搜索并安装 Tampermonkey。
- Firefox：在 [Firefox 附加组件商店](https://addons.mozilla.org) 搜索并安装 Tampermonkey。
- 其他浏览器：建议使用支持 Tampermonkey 的 Chrome、Edge 或 Firefox。

### 2. 安装脚本

构建后，在 `dist/` 中选择前缀最新的 `<前缀>-imageDownloader.user.js` 文件。前缀是构建时自动生成的版本标识。

可以使用以下任一方式安装：

1. 用浏览器打开 `.user.js` 文件，在 Tampermonkey 的提示页面中确认安装。
2. 打开 Tampermonkey 管理面板，在“工具”中选择“从本地文件导入”，然后选择该文件。

## 使用方法

1. 打开包含图片的网页，例如微博、小红书或哔哩哔哩。
2. 点击右下角悬浮图标打开可移动、缩放的操作面板。
3. 点击“捕获图片”，或按 `Ctrl+Shift+I`，捕获当前页面中的图片。
4. 如需持续捕获动态内容，开启“自动捕获”后滚动页面。
5. 如需过滤图片，在尺寸筛选栏填写宽高上下限；留空表示不限，也可以选择是否包含尺寸未知的图片。
6. 点击图片进行选择，选中项会显示勾号。
7. 点击“下载选中”。Tampermonkey 询问下载权限时，选择允许。

## 常见问题

### 为什么下载的图片是压缩过的？

部分网站会使用 CDN 参数压缩图片。脚本已内置哔哩哔哩、抖音、小红书、知乎等网站的增强规则，会尝试去除压缩参数获取原图。

### 为什么某些图片无法下载？

常见原因包括图片跨域限制、资源需要登录认证，或图片尚未动态加载。可以滚动页面后重新捕获。

### 如何只下载一张图片？

打开面板后仅选中目标图片，再点击“下载选中”。

### 图片按照什么顺序排列？

图片按 DOM Path 自然排序。对于同一个容器下的直接 `<img>` 子元素，顺序与 DOM 中的先后顺序一致。同一个 URL 多次出现时只保留一项，并使用最后扫描到的 Path。

### 脚本没有反应怎么办？

确认 Tampermonkey 已正确安装并启用，并检查脚本是否在“已安装”列表中正常启用。

## 开发

### 主要源码

| 文件 | 说明 |
|------|------|
| `main.js` | 用户脚本入口与功能初始化 |
| `imageCapture.js` | 捕获页面图片并生成 DOM Path |
| `imageCollection.js` | 管理图片集合、更新和排序 |
| `autoCapture.js` | 监听页面滚动与内容变化，调度自动扫描 |
| `imageDimensionResolver.js` | 补全图片原始尺寸 |
| `imageEnhancers.js` | 网站原图增强规则 |
| `imageSizeFilter.js` | 图片尺寸筛选逻辑 |
| `panel.js`、`styles.css` | 操作面板与样式 |

通用配置、请求、存储、日志和界面工具位于 `src/shared/` 与 `src/styles/`，由不同用户脚本共享。

### 构建与测试

在项目根目录执行：

```bash
npm install
npm run dev
npm run build:image
npm run test:image
```

- `npm run dev`：监听图片脚本的文件变化并自动构建。
- `npm run build:image`：构建图片脚本。
- `npm run test:image`：运行图片脚本测试。
- `npm run build`：构建项目中的全部用户脚本。

构建产物输出到 `dist/<前缀>-imageDownloader.user.js`。产物是可直接安装的单文件用户脚本；默认不压缩，并使用自动生成的前缀保留历次构建。需要手动指定前缀时，可执行：

```bash
BUILD_PREFIX=my1 npm run build:image
```

自定义前缀只能包含字母、数字、下划线和连字符。

### 添加原图增强规则

在 `src/scripts/imageDownloader/imageEnhancers.js` 中注册规则：

```javascript
registerEnhancer({
  name: 'example-site',
  priority: 10,
  urlPattern: /example\.com/i,
  enhance(url) {
    return url
      .replace(/&width=[^&]*/, '')
      .replace(/&quality=[^&]*/, '');
  },
});
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 唯一规则名称 |
| `urlPattern` | `RegExp` | 匹配图片 URL 的正则表达式 |
| `enhance` | `function` | 接收原 URL 并返回增强后的 URL |
| `priority` | `number` | 可选优先级，数值越大优先级越高 |

共享模块依赖 Tampermonkey 的 `GM_*` API；样式需要在脚本中导入并注入。
