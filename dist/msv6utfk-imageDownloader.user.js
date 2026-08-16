// ==UserScript==
// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_download
// ==/UserScript==

var _a, _b, _c, _d;
function createElement(tag, attrs = {}, html = "", text = "") {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      element.className = value;
    } else if (key === "dataset") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith("on")) {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  }
  if (html) {
    element.innerHTML = html;
  } else if (text) {
    element.textContent = text;
  }
  return element;
}
function addStyle(css) {
  const style = createElement("style", { type: "text/css" });
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}
const config = {
  // 日志配置
  logLevel: "info",
  // debug, info, warn, error
  // 存储键名前缀
  storagePrefix: "userscript_",
  // imageDownloader 专用配置
  imageDownloader: {
    storageKeys: {
      downloadHistory: "imageDownloader_download_history",
      gifQualityMode: "imageDownloader_gif_quality_mode"
    },
    autoCapture: {
      minScanInterval: 200,
      fallbackInterval: 1e3
    }
  }
};
function getStorageKey(key) {
  return config.storagePrefix + key;
}
const LogLevel = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function log(level, message, ...args) {
  const currentLevel = LogLevel[config.logLevel];
  if (LogLevel[level] < currentLevel) {
    return;
  }
  const prefix = `[${level.toUpperCase()}]`;
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  switch (level) {
    case "debug":
    case "info":
      console.log(`${prefix} [${timestamp}]`, message, ...args);
      break;
    case "warn":
      console.warn(`${prefix} [${timestamp}]`, message, ...args);
      break;
    case "error":
      console.error(`${prefix} [${timestamp}]`, message, ...args);
      break;
  }
}
const logger = {
  debug: (msg, ...args) => log("debug", msg, ...args),
  info: (msg, ...args) => log("info", msg, ...args),
  warn: (msg, ...args) => log("warn", msg, ...args),
  error: (msg, ...args) => log("error", msg, ...args)
};
async function setItem(key, value) {
  return new Promise((resolve) => {
    const serialized = JSON.stringify(value);
    GM_setValue(getStorageKey(key), serialized);
    resolve();
  });
}
async function getItem(key, defaultValue = null) {
  const value = await GM_getValue(getStorageKey(key));
  if (value === void 0) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
const styles = `/**
 * 图片批量下载器样式
 */

/* ===========================
   悬浮按钮
   =========================== */
#id-floating-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 2147483647;
  transition: all 0.3s ease;
  touch-action: none;
}

#id-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

#id-floating-btn.active {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

#id-floating-btn.dragging {
  cursor: grabbing;
  transition: none;
}

#id-floating-btn.dragging:hover {
  transform: none;
}

#id-floating-btn svg {
  width: 20px;
  height: 20px;
}

/* ===========================
   主面板
   =========================== */
.id-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 450px;
  min-width: 300px;
  min-height: 200px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 面板头部 */
.id-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.id-panel-title {
  font-size: 15px;
  font-weight: 600;
}

.id-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.id-panel-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 增强器状态提示 */
.id-enhancer-status {
  padding: 8px 16px;
  font-size: 12px;
  color: #333;
  background: linear-gradient(90deg, #fff9e6 0%, #fff3cd 100%);
  border-bottom: 1px solid #ffeaa7;
  display: none;
}

.id-enhancer-status.active {
  display: block;
}

/* ===========================
   工具栏
   =========================== */
.id-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap;
}

.id-toolbar-spacer {
  flex: 1;
}

.id-btn {
  padding: 8px 14px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.id-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #ccc;
}

.id-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.id-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.id-btn-primary {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.id-btn-primary:hover:not(:disabled) {
  background: #5a6fd6;
  border-color: #5a6fd6;
}

.id-btn-success {
  background: #48bb78;
  border-color: #48bb78;
  color: white;
}

.id-btn-success:hover:not(:disabled) {
  background: #38a169;
  border-color: #38a169;
}

.id-btn-warning {
  background: #f59e0b;
  border-color: #d97706;
  color: white;
}

.id-btn-warning:hover:not(:disabled) {
  background: #ea580c;
  border-color: #ea580c;
}

.id-prefix-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.id-switch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #555;
  user-select: none;
  cursor: pointer;
}

.id-switch-label input {
  margin: 0;
  cursor: pointer;
}

.id-auto-capture-label.is-active {
  color: #276749;
  background: #f0fff4;
  border-color: #48bb78;
  box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.12);
}

.id-input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 100px;
  outline: none;
  transition: border-color 0.2s;
}

.id-input:focus {
  border-color: #667eea;
}

/* ===========================
   图片网格
   =========================== */
.id-image-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  align-content: start;
  background: #fafafa;
}

.id-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

/* 图片项 */
.id-image-item {
  position: relative;
  min-height: 160px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.id-image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.id-image-item.selected {
  box-shadow: 0 0 0 3px #667eea;
}

/* 缩略图 */
.id-image-thumb {
  position: relative;
  width: 100%;
  min-height: 100px;
  background: #f0f0f0;
  overflow: hidden;
}

.id-image-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* 选择框 */
.id-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.id-image-item:hover .id-checkbox,
.id-image-item.selected .id-checkbox {
  opacity: 1;
}

.id-image-item.selected .id-checkbox {
  background: #667eea;
}

.id-image-item.selected .id-checkbox svg rect {
  fill: #667eea;
}

/* 图片信息 */
.id-image-info {
  padding: 8px;
  min-height: 50px;
  font-size: 11px;
  color: #666;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.id-filename {
  display: block;
  word-break: break-all;
  line-height: 1.4;
}

.id-size {
  display: block;
  color: #999;
  margin-top: 4px;
  font-size: 10px;
}

/* ===========================
   面板底部
   =========================== */
.id-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px 10px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.id-status {
  font-size: 12px;
  color: #666;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-downloaded-count {
  font-size: 12px;
  color: #4a5568;
  margin-right: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 改变大小手柄 */
.id-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  z-index: 5;
  background: linear-gradient(
    135deg,
    transparent 50%,
    #ddd 50%,
    #ddd 60%,
    transparent 60%,
    transparent 70%,
    #ddd 70%,
    #ddd 80%,
    transparent 80%
  );
}

/* ===========================
   滚动条美化
   =========================== */
.id-image-grid::-webkit-scrollbar {
  width: 8px;
}

.id-image-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.id-image-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.id-image-grid::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* ===========================
   响应式调整
   =========================== */
@media (max-width: 640px) {
  .id-panel {
    width: 95%;
    height: 80%;
    min-width: 280px;
    min-height: 300px;
  }

  .id-toolbar {
    gap: 6px;
    padding: 8px 12px;
  }

  .id-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .id-image-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    padding: 8px;
  }
}

/* 小窗口下确保图片信息可见 */
@media (max-width: 500px) {
  .id-panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    min-width: 100%;
  }

  .id-image-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }

  .id-image-info {
    padding: 6px 4px;
    font-size: 10px;
  }

  .id-prefix-label {
    width: 100%;
    margin-top: 4px;
  }

  .id-input {
    flex: 1;
    width: auto;
  }
}
`;
function enableDraggable(options) {
  const {
    target,
    handle = target,
    onClick,
    shouldStart,
    dragThreshold = 4,
    clampToViewport = true,
    dragClassName,
    bodyCursor = "",
    removeTransformOnStart = false,
    onDragStart,
    onDrag,
    onDragEnd
  } = options || {};
  if (!target || !handle) {
    return () => {
    };
  }
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let suppressClick = false;
  const clickHandler = (e) => {
    if (!onClick) return;
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
      return;
    }
    onClick(e);
  };
  const pointerDownHandler = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    if (typeof shouldStart === "function" && !shouldStart(e)) {
      return;
    }
    const rect = target.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    moved = false;
    pointerId = e.pointerId;
    target.style.left = `${startLeft}px`;
    target.style.top = `${startTop}px`;
    target.style.right = "auto";
    target.style.bottom = "auto";
    if (removeTransformOnStart) {
      target.style.transform = "none";
    }
    if (dragClassName) {
      target.classList.add(dragClassName);
    }
    handle.setPointerCapture(pointerId);
    document.body.style.userSelect = "none";
    if (bodyCursor) {
      document.body.style.cursor = bodyCursor;
    }
    if (typeof onDragStart === "function") {
      onDragStart(e);
    }
    e.preventDefault();
  };
  const pointerMoveHandler = (e) => {
    if (e.pointerId !== pointerId) {
      return;
    }
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    if (!moved && Math.hypot(deltaX, deltaY) >= dragThreshold) {
      moved = true;
      suppressClick = true;
    }
    if (!moved) {
      return;
    }
    let nextLeft = startLeft + deltaX;
    let nextTop = startTop + deltaY;
    if (clampToViewport) {
      const maxLeft = Math.max(0, window.innerWidth - target.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - target.offsetHeight);
      nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
      nextTop = Math.max(0, Math.min(nextTop, maxTop));
    }
    target.style.left = `${nextLeft}px`;
    target.style.top = `${nextTop}px`;
    if (typeof onDrag === "function") {
      onDrag(e);
    }
  };
  const stopDragging = (e) => {
    if (e.pointerId !== pointerId) {
      return;
    }
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
    pointerId = null;
    if (dragClassName) {
      target.classList.remove(dragClassName);
    }
    document.body.style.userSelect = "";
    if (bodyCursor) {
      document.body.style.cursor = "";
    }
    if (typeof onDragEnd === "function") {
      onDragEnd(e);
    }
  };
  handle.addEventListener("click", clickHandler);
  handle.addEventListener("pointerdown", pointerDownHandler);
  handle.addEventListener("pointermove", pointerMoveHandler);
  handle.addEventListener("pointerup", stopDragging);
  handle.addEventListener("pointercancel", stopDragging);
  return () => {
    handle.removeEventListener("click", clickHandler);
    handle.removeEventListener("pointerdown", pointerDownHandler);
    handle.removeEventListener("pointermove", pointerMoveHandler);
    handle.removeEventListener("pointerup", stopDragging);
    handle.removeEventListener("pointercancel", stopDragging);
  };
}
const DEFAULT_RIGHT_PX = 30;
const DEFAULT_BOTTOM_PX = 30;
function updateButtonRatio(button) {
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const maxLeft = Math.max(1, window.innerWidth - rect.width);
  const maxTop = Math.max(1, window.innerHeight - rect.height);
  button.dataset.ratioX = String(Math.min(1, Math.max(0, rect.left / maxLeft)));
  button.dataset.ratioY = String(Math.min(1, Math.max(0, rect.top / maxTop)));
}
function applyRatioPosition(button) {
  if (!button) return;
  const ratioX = Number(button.dataset.ratioX);
  const ratioY = Number(button.dataset.ratioY);
  if (!Number.isFinite(ratioX) || !Number.isFinite(ratioY)) {
    return;
  }
  const maxLeft = Math.max(0, window.innerWidth - button.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - button.offsetHeight);
  button.style.left = `${Math.round(maxLeft * ratioX)}px`;
  button.style.top = `${Math.round(maxTop * ratioY)}px`;
  button.style.right = "auto";
  button.style.bottom = "auto";
}
function initFloatingButton(options) {
  const existing = document.getElementById("id-floating-btn");
  if (existing) {
    return existing;
  }
  const button = createElement("div", {
    id: "id-floating-btn",
    title: "图片批量下载器"
  }, `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);
  document.body.appendChild(button);
  button.style.right = `${DEFAULT_RIGHT_PX}px`;
  button.style.bottom = `${DEFAULT_BOTTOM_PX}px`;
  enableDraggable({
    target: button,
    onClick: () => options.onToggle(),
    dragClassName: "dragging",
    onDragEnd: () => {
      updateButtonRatio(button);
    }
  });
  requestAnimationFrame(() => {
    updateButtonRatio(button);
  });
  window.addEventListener("resize", () => {
    applyRatioPosition(button);
  });
  return button;
}
function showPanel() {
  const panel = document.getElementById("id-panel");
  if (panel) {
    panel.style.display = "flex";
    panel.style.opacity = "1";
  }
  const button = document.getElementById("id-floating-btn");
  if (button) {
    button.classList.add("active");
  }
}
function hidePanel() {
  const panel = document.getElementById("id-panel");
  if (panel) {
    panel.style.display = "none";
  }
  const button = document.getElementById("id-floating-btn");
  if (button) {
    button.classList.remove("active");
  }
}
function togglePanel() {
  const panel = document.getElementById("id-panel");
  if (!panel) return;
  if (panel.style.display === "none" || panel.style.display === "") {
    showPanel();
  } else {
    hidePanel();
  }
}
const bilibiliEnhancer = {
  name: "bilibili",
  displayName: "B站（哔哩哔哩）",
  priority: 10,
  // 匹配图片 URL
  urlPattern: /hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,
  // 匹配页面 URL
  pagePattern: /bilibili\.com|b23\.tv/i,
  /**
   * 增强图片 URL - 获取更高质量版本
   * @param {string} url - 原始 URL
   * @returns {string} 增强后的 URL
   */
  enhance(url) {
    if (!this.urlPattern.test(url)) {
      return url;
    }
    const queryIndex = url.indexOf("?");
    const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : url.slice(queryIndex);
    const atIndex = path.indexOf("@");
    if (atIndex === -1) {
      return url;
    }
    const baseUrl = path.slice(0, atIndex);
    const transformPart = path.slice(atIndex + 1);
    const formatMatch = transformPart.match(/\.([a-z0-9]+)$/i);
    const format = formatMatch ? formatMatch[1].toLowerCase() : "";
    if (format === "avif" || format === "awebp" || format === "webp") {
      return `${baseUrl}@3840w.${format}${query}`;
    }
    return `${baseUrl}@3840w${query}`;
  }
};
const bytedanceEnhancer = {
  name: "bytedance",
  displayName: "抖音（字节跳动）",
  priority: 10,
  // 匹配图片 URL
  urlPattern: /douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,
  // 匹配页面 URL
  pagePattern: /douyin\.com|douyin(?:pic|img)\.com/i,
  enhance(url) {
    return url;
  }
};
const xiaohongshuEnhancer = {
  name: "xiaohongshu",
  displayName: "小红书",
  priority: 10,
  // 匹配图片 URL
  urlPattern: /xhscdn\.com/i,
  // 匹配页面 URL
  pagePattern: /xiaohongshu\.com|xh(?:s|s)cdn\.com/i,
  enhance(url) {
    return url;
  }
};
const zhihuEnhancer = {
  name: "zhihu",
  displayName: "知乎",
  priority: 10,
  // 匹配图片 URL
  urlPattern: /zhimg\.com/i,
  // 匹配页面 URL
  pagePattern: /zhihu\.com/i,
  enhance(url) {
    return url.replace(/_\w+(\.\w+)$/i, "$1");
  }
};
const enhancers = [
  bilibiliEnhancer,
  bytedanceEnhancer,
  xiaohongshuEnhancer,
  zhihuEnhancer
];
function getMatchingEnhancer(url) {
  for (const enhancer of enhancers) {
    if (enhancer.urlPattern.test(url)) {
      return enhancer;
    }
  }
  return null;
}
function getActiveEnhancer(pageUrl) {
  const url = window.location.href;
  for (const enhancer of enhancers) {
    if (enhancer.pagePattern && enhancer.pagePattern.test(url)) {
      return enhancer;
    }
  }
  return null;
}
function getActiveEnhancerName(pageUrl) {
  const enhancer = getActiveEnhancer();
  return enhancer ? enhancer.name : null;
}
function getEnhancerDisplayName(name) {
  const enhancer = enhancers.find((e) => e.name === name);
  return (enhancer == null ? void 0 : enhancer.displayName) || (enhancer == null ? void 0 : enhancer.name) || name;
}
function enhanceImageUrl(url) {
  const enhancer = getMatchingEnhancer(url);
  if (enhancer) {
    return enhancer.enhance(url);
  }
  return url;
}
const DOWNLOADER_UI_SELECTOR$1 = "#id-panel, #id-floating-btn";
class ImageCapture {
  /**
   * 获取当前页面所有图片
   * @returns {Array} 图片列表
   */
  getAllImages() {
    const images = [];
    const seen = /* @__PURE__ */ new Set();
    this.rectCache = /* @__PURE__ */ new WeakMap();
    this.pathSegmentCache = /* @__PURE__ */ new WeakMap();
    const imgElements = document.querySelectorAll("img");
    imgElements.forEach((img) => {
      this.processImageElement(img, "img", seen, images);
    });
    const svgImages = document.querySelectorAll("image");
    svgImages.forEach((img) => {
      var _a2;
      const src = this.getImageSrc(((_a2 = img.href) == null ? void 0 : _a2.baseVal) || img.getAttribute("href"));
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, "svg-image", img));
      }
    });
    const elements = document.querySelectorAll("*");
    elements.forEach((el) => {
      if (this.isDownloaderUiElement(el)) return;
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== "none") {
        const urls = this.extractUrls(bgImage);
        urls.forEach((url) => {
          const src = this.getImageSrc(url);
          if (src && !seen.has(src)) {
            seen.add(src);
            images.push(this.createImageInfo(src, "background", el));
          }
        });
      }
    });
    const sources = document.querySelectorAll("source");
    sources.forEach((source) => {
      var _a2, _b2, _c2;
      const src = this.getImageSrc((_c2 = (_b2 = (_a2 = source.srcset) == null ? void 0 : _a2.split(",")[0]) == null ? void 0 : _b2.trim()) == null ? void 0 : _c2.split(" ")[0]);
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, "source", source));
      }
    });
    elements.forEach((el) => {
      this.processLazySrc(el, seen, images);
    });
    const mediaWithPoster = document.querySelectorAll("video, audio");
    mediaWithPoster.forEach((media) => {
      const poster = media.getAttribute("poster");
      if (poster) {
        const src = this.getImageSrc(poster);
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push(this.createImageInfo(src, "media-poster", media));
        }
      }
    });
    const icons = document.querySelectorAll('link[rel*="icon"], link[rel*="image"]');
    icons.forEach((link) => {
      const src = this.getImageSrc(link.href);
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, "icon", link));
      }
    });
    return images.filter((img) => this.isValidImage(img.src));
  }
  /**
   * 处理图片元素，支持多种懒加载属性
   */
  processImageElement(img, type, seen, images) {
    var _a2, _b2, _c2;
    if (this.isDownloaderUiElement(img)) return;
    const src = this.getImageSrc(img.src) || this.getImageSrc((_a2 = img.dataset) == null ? void 0 : _a2.src) || this.getImageSrc((_b2 = img.dataset) == null ? void 0 : _b2.original) || this.getImageSrc((_c2 = img.dataset) == null ? void 0 : _c2.lazy) || this.getImageSrc(img.getAttribute("data-src")) || this.getImageSrc(img.getAttribute("data-original"));
    if (src && !seen.has(src)) {
      seen.add(src);
      images.push(this.createImageInfo(src, type, img));
    }
  }
  /**
   * 处理懒加载属性
   */
  processLazySrc(el, seen, images) {
    if (this.isDownloaderUiElement(el)) return;
    const lazyAttrs = [
      "data-src",
      "data-original",
      "data-lazy",
      "data-srcset",
      "data:image",
      "data-ks-lazyload",
      "data-url",
      "data-ks-observersrc"
    ];
    lazyAttrs.forEach((attr) => {
      var _a2, _b2, _c2;
      let value = ((_a2 = el.dataset) == null ? void 0 : _a2[attr.replace("data-", "")]) || el.getAttribute(attr);
      if (attr === "data-image" && value) {
        try {
          const data = JSON.parse(value);
          value = data.src || data.url || data.original;
        } catch {
        }
      }
      if (value) {
        if (attr.includes("srcset") || attr === "data-srcset") {
          value = (_c2 = (_b2 = value.split(",")[0]) == null ? void 0 : _b2.trim()) == null ? void 0 : _c2.split(" ")[0];
        }
        const src = this.getImageSrc(value);
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push(this.createImageInfo(src, "lazy", el));
        }
      }
    });
  }
  /**
   * 从 URL 中提取真实路径
   * @param {string} url - 可能包含参数的 URL
   * @returns {string|null} 清理后的 URL
   */
  getImageSrc(url) {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("data:")) {
      if (!url.startsWith("data:image/svg")) {
        return null;
      }
    }
    if (url.includes(";base64,")) {
      return null;
    }
    if (!url.trim()) return null;
    const placeholderPatterns = [
      "placeholder",
      "default",
      "blank",
      "transparent",
      "data:image/gif",
      "loading",
      "lazy"
    ];
    if (placeholderPatterns.some((p) => url.toLowerCase().includes(p)) && !url.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i)) {
      return null;
    }
    let cleanUrl = url.split("#")[0].trim();
    cleanUrl = enhanceImageUrl(cleanUrl);
    return cleanUrl;
  }
  /**
   * 从 CSS 属性中提取 URL
   * @param {string} bgImage - background-image 属性值
   * @returns {string[]} URL 列表
   */
  extractUrls(bgImage) {
    const urls = [];
    const regex = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
    let match;
    while ((match = regex.exec(bgImage)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }
  /**
   * 检查是否是有效图片 URL
   * @param {string} src - 图片 URL
   * @returns {boolean}
   */
  isValidImage(src) {
    if (!src || typeof src !== "string") return false;
    const value = src.trim();
    if (!value) return false;
    const lowerValue = value.toLowerCase();
    if (lowerValue.startsWith("javascript:") || lowerValue.startsWith("vbscript:") || lowerValue.startsWith("mailto:") || lowerValue.startsWith("tel:")) {
      return false;
    }
    if (lowerValue.startsWith("data:")) {
      return lowerValue.startsWith("data:image/");
    }
    if (lowerValue.startsWith("blob:")) {
      return true;
    }
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  /**
   * 创建图片信息对象
   * @param {string} src - 图片地址
   * @param {string} type - 图片类型
   * @param {HTMLElement} element - 来源元素
   * @returns {object} 图片信息
   */
  createImageInfo(src, type, element) {
    const domMetadata = this.getDomMetadata(element);
    return {
      src,
      type,
      alt: (element == null ? void 0 : element.alt) || "",
      width: (element == null ? void 0 : element.naturalWidth) || (element == null ? void 0 : element.width) || 0,
      height: (element == null ? void 0 : element.naturalHeight) || (element == null ? void 0 : element.height) || 0,
      fileSize: null,
      element,
      ...domMetadata
    };
  }
  /**
   * 排除下载器自身的面板、悬浮按钮和其中生成的缩略图。
   */
  isDownloaderUiElement(element) {
    var _a2;
    return Boolean((_a2 = element == null ? void 0 : element.closest) == null ? void 0 : _a2.call(element, DOWNLOADER_UI_SELECTOR$1));
  }
  /**
   * 创建带同级序号的结构化 DOM path，并记录每一级祖先的内容坐标。
   */
  getDomMetadata(element) {
    if (!(element instanceof Element)) {
      return {
        domPath: [],
        pageRect: this.createEmptyRect(),
        ancestorRects: []
      };
    }
    const nodes = [];
    let current = element;
    while (current instanceof Element) {
      nodes.push(current);
      current = current.parentElement;
    }
    nodes.reverse();
    const ancestorRects = nodes.map((node) => this.getContentRect(node));
    return {
      domPath: nodes.map((node) => this.getPathSegment(node)),
      pageRect: ancestorRects[ancestorRects.length - 1] || this.createEmptyRect(),
      ancestorRects
    };
  }
  getPathSegment(element) {
    var _a2, _b2;
    const cached = (_a2 = this.pathSegmentCache) == null ? void 0 : _a2.get(element);
    if (cached) return cached;
    const tagName = String(element.tagName || "element").toLowerCase();
    let siblingIndex = 1;
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === element.tagName) siblingIndex += 1;
      sibling = sibling.previousElementSibling;
    }
    const segment = `${tagName}:nth-of-type(${siblingIndex})`;
    (_b2 = this.pathSegmentCache) == null ? void 0 : _b2.set(element, segment);
    return segment;
  }
  getContentRect(element) {
    var _a2, _b2;
    const cached = (_a2 = this.rectCache) == null ? void 0 : _a2.get(element);
    if (cached) return cached;
    const rect = element.getBoundingClientRect();
    let nestedScrollTop = 0;
    let nestedScrollLeft = 0;
    let ancestor = element.parentElement;
    while (ancestor) {
      if (ancestor !== document.scrollingElement) {
        nestedScrollTop += Number(ancestor.scrollTop || 0);
        nestedScrollLeft += Number(ancestor.scrollLeft || 0);
      }
      ancestor = ancestor.parentElement;
    }
    const top = Number(rect.top || 0) + Number(window.scrollY || 0) + nestedScrollTop;
    const left = Number(rect.left || 0) + Number(window.scrollX || 0) + nestedScrollLeft;
    const width = Math.max(0, Number(rect.width || 0));
    const height = Math.max(0, Number(rect.height || 0));
    const contentRect = {
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
    (_b2 = this.rectCache) == null ? void 0 : _b2.set(element, contentRect);
    return contentRect;
  }
  createEmptyRect() {
    return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 };
  }
  /**
   * 获取图片文件大小
   * @param {string} url - 图片 URL
   * @returns {Promise<number>} 文件大小（字节）
   */
  async getFileSize(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentLength = response.headers.get("content-length");
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch {
      return null;
    }
  }
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的字符串
   */
  formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
}
class ResourceSelector {
  /**
   * @param {object} options - 配置项
   * @param {HTMLElement} options.grid - 网格容器
   * @param {Function} [options.onSelectionChange] - 选择变化回调
   * @param {string} [options.emptyText] - 空状态文案
   * @param {object} [options.classNames] - 样式类名映射
   * @param {Function} [options.createThumbnail] - 缩略图渲染器
   * @param {Function} [options.createInfo] - 信息渲染器
   */
  constructor(options) {
    this.grid = options.grid;
    this.onSelectionChange = options.onSelectionChange || (() => {
    });
    this.emptyText = options.emptyText || "未找到资源";
    this.classNames = {
      item: "rs-item",
      selected: "selected",
      empty: "rs-empty",
      thumb: "rs-thumb",
      checkbox: "rs-checkbox",
      info: "rs-info",
      ...options.classNames
    };
    this.createThumbnail = options.createThumbnail || this.defaultCreateThumbnail.bind(this);
    this.createInfo = options.createInfo || this.defaultCreateInfo.bind(this);
    this.isSelectable = options.isSelectable || (() => true);
    this.getDisabledReason = options.getDisabledReason || (() => "当前资源不可选");
    this.selected = /* @__PURE__ */ new Set();
    this.resources = [];
  }
  /**
   * 渲染资源列表
   * @param {Array} resources - 资源数组
   */
  render(resources) {
    this.resources = resources;
    this.selected.clear();
    this.grid.innerHTML = "";
    if (!Array.isArray(resources) || resources.length === 0) {
      this.grid.innerHTML = `<div class="${this.classNames.empty}">${this.emptyText}</div>`;
      this.onSelectionChange([]);
      return;
    }
    resources.forEach((resource, index) => {
      const item = this.createResourceItem(resource, index);
      this.grid.appendChild(item);
    });
    this.onSelectionChange([]);
  }
  /**
   * 切换选择状态
   * @param {number} index - 资源索引
   */
  toggle(index) {
    const item = this.grid.querySelector(`[data-index="${index}"]`);
    if (!item) return;
    const resource = this.resources[index];
    if (!this.isSelectable(resource, index)) {
      const reason = this.getDisabledReason(resource, index);
      item.title = reason || "";
      return;
    }
    if (this.selected.has(index)) {
      this.selected.delete(index);
      item.classList.remove(this.classNames.selected);
    } else {
      this.selected.add(index);
      item.classList.add(this.classNames.selected);
    }
    this.onSelectionChange(this.getSelectedResources());
  }
  /**
   * 全选
   */
  selectAll() {
    this.selected.clear();
    this.resources.forEach((resource, index) => {
      if (this.isSelectable(resource, index)) {
        this.selected.add(index);
      }
    });
    this.updateUI();
    this.onSelectionChange(this.getSelectedResources());
  }
  /**
   * 全不选
   */
  selectNone() {
    this.selected.clear();
    this.updateUI();
    this.onSelectionChange([]);
  }
  /**
   * 获取当前选中资源
   * @returns {Array}
   */
  getSelectedResources() {
    return Array.from(this.selected).filter((index) => index >= 0 && index < this.resources.length).filter((index) => this.isSelectable(this.resources[index], index)).map((index) => this.resources[index]);
  }
  createResourceItem(resource, index) {
    const item = createElement("div", {
      className: this.classNames.item,
      dataset: { index }
    });
    if (!this.isSelectable(resource, index)) {
      item.classList.add("unselectable");
      item.title = this.getDisabledReason(resource, index) || "";
      item.setAttribute("aria-disabled", "true");
    }
    const helpers = {
      toggle: () => this.toggle(index),
      createElement,
      updateResource: (patch) => {
        if (!patch || typeof patch !== "object") return;
        if (this.resources[index] && typeof this.resources[index] === "object") {
          Object.assign(this.resources[index], patch);
          return;
        }
        this.resources[index] = {
          ...patch
        };
      }
    };
    const thumb = this.createThumbnail(resource, index, helpers);
    if (thumb) {
      item.appendChild(thumb);
    }
    const checkbox = createElement(
      "div",
      {
        className: this.classNames.checkbox,
        onClick: (e) => {
          e.stopPropagation();
          this.toggle(index);
        }
      },
      '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'
    );
    const info = this.createInfo(resource, index, helpers);
    item.appendChild(checkbox);
    if (info) {
      item.appendChild(info);
    }
    return item;
  }
  defaultCreateThumbnail(resource, index, helpers) {
    const thumb = createElement("div", { className: this.classNames.thumb });
    const imgEl = createElement("img", {
      src: (resource == null ? void 0 : resource.src) || "",
      alt: `资源 ${index + 1}`,
      loading: "lazy"
    });
    thumb.appendChild(imgEl);
    thumb.addEventListener("click", () => helpers.toggle());
    return thumb;
  }
  defaultCreateInfo(resource) {
    const info = createElement("div", { className: this.classNames.info });
    const filename = this.getFileName((resource == null ? void 0 : resource.src) || "");
    info.appendChild(createElement("span", {}, this.truncate(filename, 28)));
    return info;
  }
  updateUI() {
    const items = this.grid.querySelectorAll(`.${this.classNames.item}`);
    items.forEach((item) => {
      const index = parseInt(item.dataset.index || "-1", 10);
      if (this.selected.has(index)) {
        item.classList.add(this.classNames.selected);
      } else {
        item.classList.remove(this.classNames.selected);
      }
    });
  }
  getFileName(url) {
    var _a2;
    if (!url) return "未命名";
    const segments = String(url).split("/");
    const raw = ((_a2 = segments[segments.length - 1]) == null ? void 0 : _a2.split("?")[0]) || "未命名";
    try {
      return decodeURIComponent(raw) || "未命名";
    } catch {
      return raw || "未命名";
    }
  }
  truncate(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, Math.max(0, maxLen - 3)) + "...";
  }
}
function getFileName(url) {
  var _a2;
  if (!url) return "未命名";
  const parts = String(url).split("/");
  const filename = ((_a2 = parts[parts.length - 1]) == null ? void 0 : _a2.split("?")[0]) || "未命名";
  try {
    return decodeURIComponent(filename) || "未命名";
  } catch {
    return filename || "未命名";
  }
}
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
}
class ImageSelector extends ResourceSelector {
  /**
   * @param {object} options - 配置选项
   * @param {HTMLElement} options.grid - 图片网格容器
   * @param {Function} options.onSelectionChange - 选择变化回调
   */
  constructor(options) {
    super({
      ...options,
      emptyText: "未找到图片",
      classNames: {
        item: "id-image-item",
        selected: "selected",
        empty: "id-empty",
        thumb: "id-image-thumb",
        checkbox: "id-checkbox",
        info: "id-image-info"
      },
      createThumbnail: (img, index, helpers) => {
        const thumb = helpers.createElement("div", { className: "id-image-thumb" });
        const imgEl = helpers.createElement("img", {
          src: img.src,
          alt: img.alt || `图片 ${index + 1}`,
          loading: "lazy",
          onerror: () => {
            imgEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>';
          }
        });
        imgEl.onload = () => {
          if (imgEl.naturalWidth > 0) {
            helpers.updateResource({
              width: imgEl.naturalWidth,
              height: imgEl.naturalHeight
            });
          }
        };
        thumb.appendChild(imgEl);
        thumb.addEventListener("click", () => {
          helpers.toggle();
        });
        return thumb;
      },
      createInfo: (img, index, helpers) => {
        const info = helpers.createElement("div", { className: "id-image-info" });
        const filename = getFileName(img.src);
        const sizeEl = helpers.createElement("span", { className: "id-size" });
        sizeEl.textContent = img.width && img.height ? `${img.width}×${img.height}` : "";
        info.appendChild(
          helpers.createElement(
            "span",
            { className: "id-filename", title: img.src },
            truncate(filename, 20)
          )
        );
        info.appendChild(sizeEl);
        return info;
      }
    });
  }
  /**
   * 刷新图片列表时可按 URL 保留选择状态，并保持网格滚动位置。
   * @param {Array} resources - 图片数组
   * @param {object} options - 渲染选项
   * @param {boolean} options.preserveSelection - 是否保留已选 URL
   */
  render(resources, options = {}) {
    const preserveSelection = Boolean(options.preserveSelection);
    const selectedUrls = preserveSelection ? new Set(this.getSelectedResources().map((image) => image == null ? void 0 : image.src).filter(Boolean)) : /* @__PURE__ */ new Set();
    const previousScrollTop = this.grid.scrollTop;
    super.render(resources);
    if (preserveSelection && selectedUrls.size > 0) {
      this.resources.forEach((image, index) => {
        if (selectedUrls.has(image == null ? void 0 : image.src)) {
          this.selected.add(index);
        }
      });
      this.updateUI();
      this.onSelectionChange(this.getSelectedResources());
    }
    if (preserveSelection) {
      this.grid.scrollTop = previousScrollTop;
    }
  }
  /**
   * 兼容旧调用名称
   * @returns {Array}
   */
  getSelectedImages() {
    return this.getSelectedResources();
  }
}
var X = { trailer: 59 };
function F(t = 256) {
  let e = 0, s = new Uint8Array(t);
  return { get buffer() {
    return s.buffer;
  }, reset() {
    e = 0;
  }, bytesView() {
    return s.subarray(0, e);
  }, bytes() {
    return s.slice(0, e);
  }, writeByte(r) {
    n(e + 1), s[e] = r, e++;
  }, writeBytes(r, o = 0, i = r.length) {
    n(e + i);
    for (let c = 0; c < i; c++) s[e++] = r[c + o];
  }, writeBytesView(r, o = 0, i = r.byteLength) {
    n(e + i), s.set(r.subarray(o, o + i), e), e += i;
  } };
  function n(r) {
    var o = s.length;
    if (o >= r) return;
    var i = 1024 * 1024;
    r = Math.max(r, o * (o < i ? 2 : 1.125) >>> 0), o != 0 && (r = Math.max(r, 256));
    let c = s;
    s = new Uint8Array(r), e > 0 && s.set(c.subarray(0, e), 0);
  }
}
var O = 12, J = 5003, lt = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
function at(t, e, s, n, r = F(512), o = new Uint8Array(256), i = new Int32Array(J), c = new Int32Array(J)) {
  let x = i.length, a = Math.max(2, n);
  o.fill(0), c.fill(0), i.fill(-1);
  let l = 0, f = 0, g = a + 1, h = g, b = false, w = h, _ = (1 << w) - 1, u = 1 << g - 1, k = u + 1, B = u + 2, p = 0, A = s[0], z = 0;
  for (let y = x; y < 65536; y *= 2) ++z;
  z = 8 - z, r.writeByte(a), I(u);
  let d = s.length;
  for (let y = 1; y < d; y++) {
    t: {
      let m = s[y], v = (m << O) + A, M = m << z ^ A;
      if (i[M] === v) {
        A = c[M];
        break t;
      }
      let V = M === 0 ? 1 : x - M;
      for (; i[M] >= 0; ) if (M -= V, M < 0 && (M += x), i[M] === v) {
        A = c[M];
        break t;
      }
      I(A), A = m, B < 1 << O ? (c[M] = B++, i[M] = v) : (i.fill(-1), B = u + 2, b = true, I(u));
    }
  }
  return I(A), I(k), r.writeByte(0), r.bytesView();
  function I(y) {
    for (l &= lt[f], f > 0 ? l |= y << f : l = y, f += w; f >= 8; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
    if ((B > _ || b) && (b ? (w = h, _ = (1 << w) - 1, b = false) : (++w, _ = w === O ? 1 << w : (1 << w) - 1)), y == k) {
      for (; f > 0; ) o[p++] = l & 255, p >= 254 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0), l >>= 8, f -= 8;
      p > 0 && (r.writeByte(p), r.writeBytesView(o, 0, p), p = 0);
    }
  }
}
var $ = at;
function D(t, e, s) {
  return t << 8 & 63488 | e << 2 & 992 | s >> 3;
}
function G(t, e, s, n) {
  return t >> 4 | e & 240 | (s & 240) << 4 | (n & 240) << 8;
}
function j(t, e, s) {
  return t >> 4 << 8 | e & 240 | s >> 4;
}
function R(t, e, s) {
  return t < e ? e : t > s ? s : t;
}
function T(t) {
  return t * t;
}
function tt(t, e, s) {
  var n = 0, r = 1e100;
  let o = t[e], i = o.cnt;
  o.ac;
  let x = o.rc, a = o.gc, l = o.bc;
  for (var f = o.fw; f != 0; f = t[f].fw) {
    let h = t[f], b = h.cnt, w = i * b / (i + b);
    if (!(w >= r)) {
      var g = 0;
      g += w * T(h.rc - x), !(g >= r) && (g += w * T(h.gc - a), !(g >= r) && (g += w * T(h.bc - l), !(g >= r) && (r = g, n = f)));
    }
  }
  o.err = r, o.nn = n;
}
function Q() {
  return { ac: 0, rc: 0, gc: 0, bc: 0, cnt: 0, nn: 0, fw: 0, bk: 0, tm: 0, mtm: 0, err: 0 };
}
function ut(t, e) {
  let s = e === "rgb444" ? 4096 : 65536, n = new Array(s), r = t.length;
  if (e === "rgba4444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 24 & 255, x = i >> 16 & 255, a = i >> 8 & 255, l = i & 255, f = G(l, a, x, c), g = f in n ? n[f] : n[f] = Q();
    g.rc += l, g.gc += a, g.bc += x, g.ac += c, g.cnt++;
  }
  else if (e === "rgb444") for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = j(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  else for (let o = 0; o < r; ++o) {
    let i = t[o], c = i >> 16 & 255, x = i >> 8 & 255, a = i & 255, l = D(a, x, c), f = l in n ? n[l] : n[l] = Q();
    f.rc += a, f.gc += x, f.bc += c, f.cnt++;
  }
  return n;
}
function H(t, e, s = {}) {
  let { format: n = "rgb565", clearAlpha: r = true, clearAlphaColor: o = 0, clearAlphaThreshold: i = 0, oneBitAlpha: c = false } = s;
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  let x = new Uint32Array(t.buffer), a = s.useSqrt !== false, l = n === "rgba4444", f = ut(x, n), g = f.length, h = g - 1, b = new Uint32Array(g + 1);
  for (var w = 0, u = 0; u < g; ++u) {
    let C = f[u];
    if (C != null) {
      var _ = 1 / C.cnt;
      l && (C.ac *= _), C.rc *= _, C.gc *= _, C.bc *= _, f[w++] = C;
    }
  }
  T(e) / w < 0.022 && (a = false);
  for (var u = 0; u < w - 1; ++u) f[u].fw = u + 1, f[u + 1].bk = u, a && (f[u].cnt = Math.sqrt(f[u].cnt));
  a && (f[u].cnt = Math.sqrt(f[u].cnt));
  var k, B, p;
  for (u = 0; u < w; ++u) {
    tt(f, u);
    var A = f[u].err;
    for (B = ++b[0]; B > 1 && (p = B >> 1, !(f[k = b[p]].err <= A)); B = p) b[B] = k;
    b[B] = u;
  }
  var z = w - e;
  for (u = 0; u < z; ) {
    for (var d; ; ) {
      var I = b[1];
      if (d = f[I], d.tm >= d.mtm && f[d.nn].mtm <= d.tm) break;
      d.mtm == h ? I = b[1] = b[b[0]--] : (tt(f, I), d.tm = u);
      var A = f[I].err;
      for (B = 1; (p = B + B) <= b[0] && (p < b[0] && f[b[p]].err > f[b[p + 1]].err && p++, !(A <= f[k = b[p]].err)); B = p) b[B] = k;
      b[B] = I;
    }
    var y = f[d.nn], m = d.cnt, v = y.cnt, _ = 1 / (m + v);
    l && (d.ac = _ * (m * d.ac + v * y.ac)), d.rc = _ * (m * d.rc + v * y.rc), d.gc = _ * (m * d.gc + v * y.gc), d.bc = _ * (m * d.bc + v * y.bc), d.cnt += y.cnt, d.mtm = ++u, f[y.bk].fw = y.fw, f[y.fw].bk = y.bk, y.mtm = h;
  }
  let M = [];
  var V = 0;
  for (u = 0; ; ++V) {
    let L = R(Math.round(f[u].rc), 0, 255), C = R(Math.round(f[u].gc), 0, 255), Y = R(Math.round(f[u].bc), 0, 255), E = 255;
    if (l) {
      if (E = R(Math.round(f[u].ac), 0, 255), c) {
        let st = typeof c == "number" ? c : 127;
        E = E <= st ? 0 : 255;
      }
      r && E <= i && (L = C = Y = o, E = 0);
    }
    let K = l ? [L, C, Y, E] : [L, C, Y];
    if (xt(M, K) || M.push(K), (u = f[u].fw) == 0) break;
  }
  return M;
}
function xt(t, e) {
  for (let s = 0; s < t.length; s++) {
    let n = t[s], r = n[0] === e[0] && n[1] === e[1] && n[2] === e[2], o = n.length >= 4 && e.length >= 4 ? n[3] === e[3] : true;
    if (r && o) return true;
  }
  return false;
}
function nt(t, e, s = "rgb565") {
  if (!t || !t.buffer) throw new Error("quantize() expected RGBA Uint8Array data");
  if (!(t instanceof Uint8Array) && !(t instanceof Uint8ClampedArray)) throw new Error("quantize() expected RGBA Uint8Array data");
  if (e.length > 256) throw new Error("applyPalette() only works with 256 colors or less");
  let n = new Uint32Array(t.buffer), r = n.length, o = s === "rgb444" ? 4096 : 65536, i = new Uint8Array(r), c = new Array(o);
  if (s === "rgba4444") for (let a = 0; a < r; a++) {
    let l = n[a], f = l >> 24 & 255, g = l >> 16 & 255, h = l >> 8 & 255, b = l & 255, w = G(b, h, g, f), _ = w in c ? c[w] : c[w] = gt(b, h, g, f, e);
    i[a] = _;
  }
  else {
    let a = s === "rgb444" ? j : D;
    for (let l = 0; l < r; l++) {
      let f = n[l], g = f >> 16 & 255, h = f >> 8 & 255, b = f & 255, w = a(b, h, g), _ = w in c ? c[w] : c[w] = bt(b, h, g, e);
      i[l] = _;
    }
  }
  return i;
}
function gt(t, e, s, n, r) {
  let o = 0, i = 1e100;
  for (let c = 0; c < r.length; c++) {
    let x = r[c], a = x[3], l = q(a - n);
    if (l > i) continue;
    let f = x[0];
    if (l += q(f - t), l > i) continue;
    let g = x[1];
    if (l += q(g - e), l > i) continue;
    let h = x[2];
    l += q(h - s), !(l > i) && (i = l, o = c);
  }
  return o;
}
function bt(t, e, s, n) {
  let r = 0, o = 1e100;
  for (let i = 0; i < n.length; i++) {
    let c = n[i], x = c[0], a = q(x - t);
    if (a > o) continue;
    let l = c[1];
    if (a += q(l - e), a > o) continue;
    let f = c[2];
    a += q(f - s), !(a > o) && (o = a, r = i);
  }
  return r;
}
function q(t) {
  return t * t;
}
function ct(t = {}) {
  let { initialCapacity: e = 4096, auto: s = true } = t, n = F(e), r = 5003, o = new Uint8Array(256), i = new Int32Array(r), c = new Int32Array(r), x = false;
  return { reset() {
    n.reset(), x = false;
  }, finish() {
    n.writeByte(X.trailer);
  }, bytes() {
    return n.bytes();
  }, bytesView() {
    return n.bytesView();
  }, get buffer() {
    return n.buffer;
  }, get stream() {
    return n;
  }, writeHeader: a, writeFrame(l, f, g, h = {}) {
    let { transparent: b = false, transparentIndex: w = 0, delay: _ = 0, palette: u = null, repeat: k = 0, colorDepth: B = 8, dispose: p = -1 } = h, A = false;
    if (s ? x || (A = true, a(), x = true) : A = Boolean(h.first), f = Math.max(0, Math.floor(f)), g = Math.max(0, Math.floor(g)), A) {
      if (!u) throw new Error("First frame must include a { palette } option");
      pt(n, f, g, u, B), it(n, u), k >= 0 && dt(n, k);
    }
    let z = Math.round(_ / 10);
    wt(n, p, z, b, w);
    let d = Boolean(u) && !A;
    ht(n, f, g, d ? u : null), d && it(n, u), yt(n, l, f, g, B, o, i, c);
  } };
  function a() {
    ft(n, "GIF89a");
  }
}
function wt(t, e, s, n, r) {
  t.writeByte(33), t.writeByte(249), t.writeByte(4), r < 0 && (r = 0, n = false);
  var o, i;
  n ? (o = 1, i = 2) : (o = 0, i = 0), e >= 0 && (i = e & 7), i <<= 2;
  let c = 0;
  t.writeByte(0 | i | c | o), S(t, s), t.writeByte(r || 0), t.writeByte(0);
}
function pt(t, e, s, n, r = 8) {
  let o = 1, i = 0, c = Z(n.length) - 1, x = o << 7 | r - 1 << 4 | i << 3 | c, a = 0, l = 0;
  S(t, e), S(t, s), t.writeBytes([x, a, l]);
}
function dt(t, e) {
  t.writeByte(33), t.writeByte(255), t.writeByte(11), ft(t, "NETSCAPE2.0"), t.writeByte(3), t.writeByte(1), S(t, e), t.writeByte(0);
}
function it(t, e) {
  let s = 1 << Z(e.length);
  for (let n = 0; n < s; n++) {
    let r = [0, 0, 0];
    n < e.length && (r = e[n]), t.writeByte(r[0]), t.writeByte(r[1]), t.writeByte(r[2]);
  }
}
function ht(t, e, s, n) {
  if (t.writeByte(44), S(t, 0), S(t, 0), S(t, e), S(t, s), n) {
    let r = 0, o = 0, i = Z(n.length) - 1;
    t.writeByte(128 | r | o | 0 | i);
  } else t.writeByte(0);
}
function yt(t, e, s, n, r = 8, o, i, c) {
  $(s, n, e, r, t, o, i, c);
}
function S(t, e) {
  t.writeByte(e & 255), t.writeByte(e >> 8 & 255);
}
function ft(t, e) {
  for (var s = 0; s < e.length; s++) t.writeByte(e.charCodeAt(s));
}
function Z(t) {
  return Math.max(Math.ceil(Math.log2(t)), 1);
}
class BatchDownloader {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.prefix - 文件名前缀
   * @param {Function} options.onProgress - 进度回调 (current, total)
   * @param {Function} options.onComplete - 完成回调 (success, failed)
   */
  constructor(options) {
    this.prefix = options.prefix || "";
    this.animatedGifHighQuality = options.animatedGifHighQuality !== false;
    this.onProgress = options.onProgress || (() => {
    });
    this.onComplete = options.onComplete || (() => {
    });
    this.downloadQueue = [];
    this.isDownloading = false;
    this.successCount = 0;
    this.failedCount = 0;
    this.successUrls = [];
  }
  /**
   * 开始下载
   * @param {Array} images - 图片列表
   */
  download(images) {
    if (this.isDownloading) {
      logger.warn("下载进行中，请稍候");
      return;
    }
    this.downloadQueue = images.map((img, index) => ({
      ...img,
      index,
      filename: this.generateFilename(img.src, index)
    }));
    this.isDownloading = true;
    this.successCount = 0;
    this.failedCount = 0;
    this.successUrls = [];
    logger.info("开始批量下载", {
      total: this.downloadQueue.length,
      prefix: this.prefix
    });
    this.processQueue();
  }
  /**
   * 处理下载队列
   */
  async processQueue() {
    if (this.downloadQueue.length === 0) {
      this.isDownloading = false;
      logger.info("批量下载完成", {
        success: this.successCount,
        failed: this.failedCount,
        successUrls: this.successUrls.length
      });
      this.onComplete(this.successCount, this.failedCount, this.successUrls);
      return;
    }
    const item = this.downloadQueue.shift();
    const current = this.successCount + this.failedCount + 1;
    const total = this.successCount + this.failedCount + this.downloadQueue.length;
    this.onProgress(current, total);
    try {
      await this.downloadFile(item.src, item.filename);
      this.successCount++;
      this.successUrls.push(item.src);
    } catch (error) {
      logger.error(`下载失败: ${item.src}`, error);
      this.failedCount++;
    }
    this.processQueue();
  }
  /**
   * 下载单个文件
   * @param {string} url - 文件 URL
   * @param {string} filename - 保存的文件名
   * @returns {Promise<void>}
   */
  async downloadFile(url, filename) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || blob.type || "";
      const downloadTarget = await this.prepareDownloadTarget(url, blob, filename, contentType);
      await this.downloadViaGM(downloadTarget.blob, downloadTarget.filename);
    } catch (error) {
      logger.warn(`fetch 下载失败，直接使用 GM_download: ${url}`);
      await this.downloadViaGM(url, filename);
    }
  }
  /**
   * 下载前处理目标文件（例如 WebP 转码）
   * @param {string} url - 原始 URL
   * @param {Blob} blob - 原始 blob
   * @param {string} filename - 原始文件名
   * @param {string} contentType - 内容类型
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  async prepareDownloadTarget(url, blob, filename, contentType = "") {
    const normalizedFilename = await this.normalizeFilenameByContentType(filename, contentType, blob);
    if (!this.isWebpResource(url, contentType)) {
      return { blob, filename: normalizedFilename };
    }
    const animated = await this.isAnimatedWebp(blob);
    if (animated) {
      const gifBlob = this.animatedGifHighQuality ? await this.convertAnimatedWebpToGif(blob) : await this.convertAnimatedWebpToGifLegacy(blob);
      if (gifBlob) {
        return {
          blob: gifBlob,
          filename: this.replaceExtension(normalizedFilename, "gif")
        };
      }
      logger.warn("动态 WebP 转 GIF 失败，回退为原始 WebP 下载");
      return {
        blob,
        filename: this.replaceExtension(normalizedFilename, "webp")
      };
    }
    const pngBlob = await this.convertStaticWebpToPng(blob);
    if (pngBlob) {
      return {
        blob: pngBlob,
        filename: this.replaceExtension(normalizedFilename, "png")
      };
    }
    logger.warn("静态 WebP 转 PNG 失败，回退为原始 WebP 下载");
    return {
      blob,
      filename: this.replaceExtension(normalizedFilename, "webp")
    };
  }
  /**
   * 根据响应 MIME 与文件头修正文件名后缀
   * @param {string} filename
   * @param {string} contentType
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  async normalizeFilenameByContentType(filename, contentType = "", blob) {
    const mimeExt = this.mimeToExt(contentType);
    if (mimeExt) {
      return this.replaceExtension(filename, mimeExt);
    }
    const signatureExt = await this.detectImageExtFromBlob(blob);
    if (signatureExt) {
      return this.replaceExtension(filename, signatureExt);
    }
    return filename;
  }
  /**
   * 通过文件签名识别常见图片类型
   * @param {Blob} blob
   * @returns {Promise<string|null>}
   */
  async detectImageExtFromBlob(blob) {
    if (!blob || typeof blob.arrayBuffer !== "function") {
      return null;
    }
    try {
      const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      if (bytes.length < 4) {
        return null;
      }
      if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 56) {
        return "gif";
      }
      if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
        return "png";
      }
      if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
        return "jpg";
      }
      if (bytes[0] === 66 && bytes[1] === 77) {
        return "bmp";
      }
      if (bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
        return "webp";
      }
      return null;
    } catch (error) {
      logger.debug("文件签名识别失败:", error);
      return null;
    }
  }
  /**
   * 判断资源是否为 WebP
   * @param {string} url - 资源 URL
   * @param {string} contentType - 内容类型
   * @returns {boolean}
   */
  isWebpResource(url, contentType = "") {
    const lowerUrl = (url || "").toLowerCase();
    const lowerMime = (contentType || "").toLowerCase();
    if (lowerMime.includes("image/webp") || lowerMime.includes("image/x-webp")) {
      return true;
    }
    if (lowerUrl.startsWith("data:image/webp")) {
      return true;
    }
    return /\.(?:webp|awebp)(?:$|[?#])/i.test(lowerUrl);
  }
  /**
   * 判断 WebP 是否为动态图片
   * @param {Blob} blob - WebP 文件
   * @returns {Promise<boolean>}
   */
  async isAnimatedWebp(blob) {
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.length < 16) {
        return false;
      }
      if (this.readFourCC(bytes, 0) !== "RIFF" || this.readFourCC(bytes, 8) !== "WEBP") {
        return false;
      }
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const chunkType = this.readFourCC(bytes, offset);
        const chunkSize = new DataView(buffer).getUint32(offset + 4, true);
        const dataStart = offset + 8;
        const dataEnd = dataStart + chunkSize;
        if (dataEnd > bytes.length) {
          break;
        }
        if (chunkType === "ANIM" || chunkType === "ANMF") {
          return true;
        }
        if (chunkType === "VP8X" && chunkSize >= 1) {
          const flags = bytes[dataStart];
          if ((flags & 2) !== 0) {
            return true;
          }
        }
        offset = dataEnd + chunkSize % 2;
      }
      return false;
    } catch (error) {
      logger.warn("WebP 动静态检测失败:", error);
      return false;
    }
  }
  /**
   * 静态 WebP 转 PNG
   * @param {Blob} blob - 静态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertStaticWebpToPng(blob) {
    try {
      const bitmap = await this.decodeImageBitmap(blob);
      if (!bitmap) return null;
      const width = bitmap.width || bitmap.naturalWidth || 0;
      const height = bitmap.height || bitmap.naturalHeight || 0;
      if (!width || !height) {
        if (typeof bitmap.close === "function") {
          bitmap.close();
        }
        return null;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (typeof bitmap.close === "function") {
          bitmap.close();
        }
        return null;
      }
      ctx.drawImage(bitmap, 0, 0);
      if (typeof bitmap.close === "function") {
        bitmap.close();
      }
      const pngBlob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png");
      });
      return pngBlob || null;
    } catch (error) {
      logger.warn("静态 WebP 转 PNG 失败:", error);
      return null;
    }
  }
  /**
   * 动态 WebP 转 GIF（依赖 ImageDecoder）
   * @param {Blob} blob - 动态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertAnimatedWebpToGif(blob) {
    if (typeof ImageDecoder === "undefined") {
      logger.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF");
      return null;
    }
    let decoder;
    try {
      const data = new Uint8Array(await blob.arrayBuffer());
      decoder = new ImageDecoder({ data, type: "image/webp" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = (track == null ? void 0 : track.frameCount) || 0;
      if (frameCount <= 0) {
        return null;
      }
      const gif = ct();
      const frameCanvas = document.createElement("canvas");
      const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
      if (!frameCtx) {
        return null;
      }
      const firstDecoded = await decoder.decode({ frameIndex: 0 });
      const firstFrame = firstDecoded.image;
      const width = firstFrame.displayWidth || firstFrame.codedWidth;
      const height = firstFrame.displayHeight || firstFrame.codedHeight;
      firstFrame.close();
      if (!width || !height) {
        return null;
      }
      frameCanvas.width = width;
      frameCanvas.height = height;
      const palette = await this.buildGlobalGifPalette({
        decoder,
        frameCount,
        width,
        height
      });
      if (!palette || !palette.palette || palette.palette.length === 0) {
        return null;
      }
      const { palette: globalPalette, paletteFormat, hasTransparency } = palette;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const decoded = await decoder.decode({ frameIndex });
        const frame = decoded.image;
        const frameWidth = frame.displayWidth || frame.codedWidth;
        const frameHeight = frame.displayHeight || frame.codedHeight;
        frameCtx.clearRect(0, 0, width, height);
        frameCtx.drawImage(frame, 0, 0, frameWidth, frameHeight);
        const imageData = frameCtx.getImageData(0, 0, width, height).data;
        const index = this.applyPaletteWithFloydSteinberg(
          imageData,
          width,
          height,
          globalPalette,
          {
            hasTransparency,
            transparentIndex: 0,
            alphaThreshold: 16
          }
        );
        const delay = this.toGifDelayMs(frame.duration);
        const frameOptions = {
          delay,
          dispose: 1
        };
        if (hasTransparency) {
          frameOptions.transparent = true;
          frameOptions.transparentIndex = 0;
        }
        if (frameIndex === 0) {
          frameOptions.palette = globalPalette;
          frameOptions.repeat = 0;
        }
        gif.writeFrame(index, width, height, frameOptions);
        frame.close();
      }
      gif.finish();
      return new Blob([gif.bytesView()], { type: "image/gif" });
    } catch (error) {
      logger.warn("动态 WebP 转 GIF 失败:", error);
      return null;
    } finally {
      if (decoder && typeof decoder.close === "function") {
        decoder.close();
      }
    }
  }
  /**
   * 动态 WebP 转 GIF（低清快速模式，保留初始实现）
   * @param {Blob} blob - 动态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertAnimatedWebpToGifLegacy(blob) {
    if (typeof ImageDecoder === "undefined") {
      logger.warn("当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF");
      return null;
    }
    let decoder;
    try {
      const data = new Uint8Array(await blob.arrayBuffer());
      decoder = new ImageDecoder({ data, type: "image/webp" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = (track == null ? void 0 : track.frameCount) || 0;
      if (frameCount <= 0) {
        return null;
      }
      const gif = ct();
      let frameCanvas = null;
      let frameCtx = null;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const decoded = await decoder.decode({ frameIndex });
        const frame = decoded.image;
        const width = frame.displayWidth || frame.codedWidth;
        const height = frame.displayHeight || frame.codedHeight;
        if (!frameCanvas) {
          frameCanvas = document.createElement("canvas");
          frameCanvas.width = width;
          frameCanvas.height = height;
          frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
          if (!frameCtx) {
            frame.close();
            return null;
          }
        }
        frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
        frameCtx.drawImage(frame, 0, 0, width, height);
        const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
        const palette = H(imageData, 255, {
          format: "rgba4444",
          oneBitAlpha: true,
          clearAlpha: true,
          clearAlphaColor: 0,
          clearAlphaThreshold: 0
        });
        palette.unshift([0, 0, 0, 0]);
        const index = nt(imageData, palette, "rgba4444");
        const delay = this.toGifDelayMs(frame.duration);
        gif.writeFrame(index, frameCanvas.width, frameCanvas.height, {
          palette,
          delay,
          repeat: frameIndex === 0 ? 0 : -1,
          transparent: true,
          transparentIndex: 0,
          dispose: 2
        });
        frame.close();
      }
      gif.finish();
      return new Blob([gif.bytesView()], { type: "image/gif" });
    } catch (error) {
      logger.warn("动态 WebP 转 GIF（低清模式）失败:", error);
      return null;
    } finally {
      if (decoder && typeof decoder.close === "function") {
        decoder.close();
      }
    }
  }
  /**
   * 通过 GM_download 执行下载
   * @param {Blob|string} source - blob 或可下载 URL
   * @param {string} filename - 文件名
   * @returns {Promise<void>}
   */
  async downloadViaGM(source, filename) {
    if (typeof GM_download !== "function") {
      throw new Error("当前环境不支持 GM_download");
    }
    let objectUrl = null;
    const downloadUrl = typeof source === "string" ? source : URL.createObjectURL(source);
    if (typeof source !== "string") {
      objectUrl = downloadUrl;
    }
    try {
      await new Promise((resolve, reject) => {
        GM_download({
          url: downloadUrl,
          name: filename,
          saveAs: false,
          onload: () => resolve(),
          onerror: (error) => reject(error || new Error("GM_download 失败")),
          ontimeout: () => reject(new Error("GM_download 超时"))
        });
      });
    } finally {
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1e3);
      }
    }
  }
  /**
   * 生成全局调色板，减少帧间色表抖动导致的闪烁
   * @param {{decoder: ImageDecoder, frameCount: number, width: number, height: number}} options
    * @returns {Promise<{palette: Array<Array<number>>, paletteFormat: string, hasTransparency: boolean}|null>}
   */
  async buildGlobalGifPalette({ decoder, frameCount, width, height }) {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) {
      return null;
    }
    const sampleStep = 1;
    const maxSampledBytes = 256 * 1024 * 1024;
    const chunks = [];
    let totalBytes = 0;
    let hasTransparency = false;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += sampleStep) {
      const decoded = await decoder.decode({ frameIndex });
      const frame = decoded.image;
      const frameWidth = frame.displayWidth || frame.codedWidth;
      const frameHeight = frame.displayHeight || frame.codedHeight;
      sampleCtx.clearRect(0, 0, width, height);
      sampleCtx.drawImage(frame, 0, 0, frameWidth, frameHeight);
      const rgba = sampleCtx.getImageData(0, 0, width, height).data;
      if (!hasTransparency && this.hasTransparentPixels(rgba)) {
        hasTransparency = true;
      }
      const remainingBytes = maxSampledBytes - totalBytes;
      if (remainingBytes < rgba.length) {
        frame.close();
        break;
      }
      const sampled = this.sampleRgbaPixels(rgba, remainingBytes);
      if (sampled && sampled.length > 0) {
        chunks.push(sampled);
        totalBytes += sampled.length;
      }
      frame.close();
      if (totalBytes >= maxSampledBytes) {
        break;
      }
    }
    if (chunks.length === 0) {
      return null;
    }
    const merged = this.concatUint8Arrays(chunks, totalBytes);
    const paletteFormat = hasTransparency ? "rgba4444" : "rgb565";
    const paletteSize = hasTransparency ? 255 : 256;
    const palette = H(merged, paletteSize, {
      format: paletteFormat,
      oneBitAlpha: hasTransparency,
      clearAlpha: false,
      clearAlphaThreshold: 96,
      useSqrt: true
    });
    if (hasTransparency) {
      palette.unshift([0, 0, 0, 0]);
    }
    return {
      palette,
      paletteFormat,
      hasTransparency
    };
  }
  /**
   * 检测像素数据中是否存在透明像素
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @returns {boolean}
   */
  hasTransparentPixels(rgba) {
    if (!rgba || rgba.length < 4) {
      return false;
    }
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 16) {
        return true;
      }
    }
    return false;
  }
  /**
   * 使用 Floyd-Steinberg 抖动将 RGBA 映射到调色板索引
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @param {number} width
   * @param {number} height
   * @param {Array<Array<number>>} palette
   * @param {{hasTransparency?: boolean, transparentIndex?: number, alphaThreshold?: number}} options
   * @returns {Uint8Array}
   */
  applyPaletteWithFloydSteinberg(rgba, width, height, palette, options = {}) {
    const hasTransparency = Boolean(options.hasTransparency);
    const transparentIndex = Number.isInteger(options.transparentIndex) ? options.transparentIndex : 0;
    const alphaThreshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 16;
    const pixelCount = width * height;
    const index = new Uint8Array(pixelCount);
    const working = new Float32Array(rgba.length);
    const nearestCache = /* @__PURE__ */ new Map();
    for (let i = 0; i < rgba.length; i++) {
      working[i] = rgba[i];
    }
    const paletteStart = hasTransparency ? 1 : 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const base = pixelIndex * 4;
        const alpha = working[base + 3];
        if (hasTransparency && alpha < alphaThreshold) {
          index[pixelIndex] = transparentIndex;
          continue;
        }
        const srcR = this.clampColor(working[base]);
        const srcG = this.clampColor(working[base + 1]);
        const srcB = this.clampColor(working[base + 2]);
        const bestPaletteIndex = this.findNearestPaletteIndex(srcR, srcG, srcB, palette, paletteStart, nearestCache);
        const matched = palette[bestPaletteIndex] || [srcR, srcG, srcB];
        index[pixelIndex] = bestPaletteIndex;
        const errR = srcR - matched[0];
        const errG = srcG - matched[1];
        const errB = srcB - matched[2];
        this.distributeDitherError(working, width, height, x, y, errR, errG, errB);
      }
    }
    return index;
  }
  distributeDitherError(buffer, width, height, x, y, errR, errG, errB) {
    this.addDitherError(buffer, width, height, x + 1, y, errR, errG, errB, 7 / 16);
    this.addDitherError(buffer, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
    this.addDitherError(buffer, width, height, x, y + 1, errR, errG, errB, 5 / 16);
    this.addDitherError(buffer, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
  }
  addDitherError(buffer, width, height, x, y, errR, errG, errB, weight) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const base = (y * width + x) * 4;
    buffer[base] = this.clampColor(buffer[base] + errR * weight);
    buffer[base + 1] = this.clampColor(buffer[base + 1] + errG * weight);
    buffer[base + 2] = this.clampColor(buffer[base + 2] + errB * weight);
  }
  findNearestPaletteIndex(r, g, b, palette, startIndex, cache) {
    const key = r << 16 | g << 8 | b;
    if (cache.has(key)) {
      return cache.get(key);
    }
    let bestIndex = startIndex;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = startIndex; i < palette.length; i++) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    cache.set(key, bestIndex);
    return bestIndex;
  }
  clampColor(value) {
    if (value < 0) return 0;
    if (value > 255) return 255;
    return value;
  }
  /**
   * 将 WebP 帧时长（微秒）转换为 gifenc 期望的帧延迟（毫秒）
   * WebP frame.duration 单位是微秒，gifenc writeFrame.delay 单位是毫秒。
   * @param {number} durationUs
   * @returns {number}
   */
  toGifDelayMs(durationUs) {
    const safeDuration = Number.isFinite(durationUs) && durationUs > 0 ? durationUs : 1e5;
    const delayMs = Math.round(safeDuration / 1e3);
    return Math.max(20, delayMs);
  }
  /**
   * 从 RGBA 数据中按预算采样像素
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @param {number} maxBytes
   * @returns {Uint8Array|null}
   */
  sampleRgbaPixels(rgba, maxBytes) {
    if (!rgba || maxBytes <= 0) {
      return null;
    }
    const pixelCount = Math.floor(rgba.length / 4);
    const maxPixels = Math.floor(maxBytes / 4);
    if (pixelCount <= 0 || maxPixels <= 0) {
      return null;
    }
    if (pixelCount > maxPixels) {
      return null;
    }
    return new Uint8Array(rgba);
  }
  /**
   * 合并 Uint8Array 数组
   * @param {Uint8Array[]} chunks
   * @param {number} totalBytes
   * @returns {Uint8Array}
   */
  concatUint8Arrays(chunks, totalBytes) {
    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });
    return merged;
  }
  /**
   * 解码图片为可绘制对象
   * @param {Blob} blob - 图片 blob
   * @returns {Promise<ImageBitmap|HTMLImageElement|null>}
   */
  async decodeImageBitmap(blob) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(blob);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      img.src = url;
    });
  }
  /**
   * 读取 FourCC 字段
   * @param {Uint8Array} bytes - 二进制数据
   * @param {number} offset - 偏移
   * @returns {string}
   */
  readFourCC(bytes, offset) {
    if (offset + 4 > bytes.length) return "";
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  }
  /**
   * 替换文件扩展名
   * @param {string} filename - 原文件名
   * @param {string} ext - 新扩展名
   * @returns {string}
   */
  replaceExtension(filename, ext) {
    const normalizedExt = String(ext || "").replace(/^\./, "").toLowerCase() || "jpg";
    const baseName = (filename || "download").split("?")[0];
    const lastDot = baseName.lastIndexOf(".");
    if (lastDot <= 0) {
      return `${baseName}.${normalizedExt}`;
    }
    return `${baseName.slice(0, lastDot)}.${normalizedExt}`;
  }
  /**
   * 生成文件名
   * @param {string} url - 图片 URL
   * @param {number} index - 索引
   * @returns {string}
   */
  generateFilename(url, index) {
    let ext = this.getExtension(url);
    if (!ext) {
      const mimeType = this.guessMimeType(url);
      ext = this.mimeToExt(mimeType);
    }
    const paddedIndex = String(index + 1).padStart(3, "0");
    const prefix = this.prefix ? `${this.prefix}_` : "";
    return `${prefix}${paddedIndex}.${ext}`;
  }
  /**
   * 获取文件扩展名
   * @param {string} url - 文件 URL
   * @returns {string}
   */
  getExtension(url) {
    const parts = url.split(".");
    if (parts.length > 1) {
      const ext = parts[parts.length - 1].toLowerCase().split("?")[0];
      if (ext.length >= 2 && ext.length <= 4) {
        return ext;
      }
    }
    return null;
  }
  /**
   * 根据 URL 猜测 MIME 类型
   * @param {string} url - URL
   * @returns {string}
   */
  guessMimeType(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes("png")) return "image/png";
    if (urlLower.includes("gif")) return "image/gif";
    if (urlLower.includes("webp")) return "image/webp";
    if (urlLower.includes("bmp")) return "image/bmp";
    if (urlLower.includes("svg")) return "image/svg+xml";
    return "image/jpeg";
  }
  /**
   * MIME 类型转扩展名
   * @param {string} mime - MIME 类型
   * @returns {string}
   */
  mimeToExt(mime) {
    const normalized = String(mime || "").toLowerCase().split(";")[0].trim();
    const map = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/bmp": "bmp",
      "image/svg+xml": "svg",
      "image/avif": "avif"
    };
    return map[normalized] || null;
  }
}
function enableResizable(options = {}) {
  const {
    target,
    handle = target,
    minWidth = 300,
    minHeight = 200,
    onResizeStart,
    onResize,
    onResizeEnd
  } = options;
  if (!target || !handle) {
    return () => {
    };
  }
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  const onMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = target.offsetWidth;
    startHeight = target.offsetHeight;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "se-resize";
    onResizeStart == null ? void 0 : onResizeStart(event);
  };
  const onMouseMove = (event) => {
    if (!isResizing) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const width = Math.max(minWidth, startWidth + dx);
    const height = Math.max(minHeight, startHeight + dy);
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    onResize == null ? void 0 : onResize(event, { width, height });
  };
  const onMouseUp = (event) => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    onResizeEnd == null ? void 0 : onResizeEnd(event);
  };
  handle.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  return () => {
    handle.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
}
function createPanel() {
  const existing = document.getElementById("id-panel");
  if (existing) return existing;
  const panel = createElement("div", { id: "id-panel", className: "id-panel" });
  panel.innerHTML = `
    <div class="id-panel-header">
      <span class="id-panel-title">📷 图片批量下载器</span>
      <button class="id-panel-close" id="id-close-btn" title="关闭">×</button>
    </div>
    <div class="id-enhancer-status" id="id-enhancer-status"></div>
    <div class="id-toolbar">
      <button class="id-btn id-btn-primary" id="id-capture" title="快捷键: Ctrl+Shift+I">
        <span>🔍</span> 捕获图片
      </button>
      <label
        class="id-switch-label id-auto-capture-label"
        id="id-auto-capture-label"
        title="开启后会在滚动和页面变化时持续累计图片"
      >
        <input type="checkbox" id="id-auto-capture-toggle" />
        自动捕获
      </label>
      <button class="id-btn" id="id-select-all">全选</button>
      <button class="id-btn" id="id-select-none">全不选</button>
      <button class="id-btn" id="id-clear-captured">清空捕获</button>
      <button class="id-btn id-btn-success" id="id-download" disabled>
        下载选中
      </button>
      <button class="id-btn id-btn-warning" id="id-clear-storage">清除存储</button>
      <label
        class="id-switch-label"
        title="清晰下载速度更慢，体积更大"
      >
        <input type="checkbox" id="id-gif-quality-toggle" checked />
        动图清晰模式
      </label>
      <div class="id-toolbar-spacer"></div>
      <label class="id-prefix-label">
        文件前缀:
        <input type="text" id="id-prefix" class="id-input" placeholder="如: photo" />
      </label>
    </div>
    <div class="id-image-grid"></div>
    <div class="id-panel-footer">
      <span class="id-status">点击「捕获图片」开始</span>
      <span class="id-downloaded-count" id="id-downloaded-count">历史下载数: 0</span>
    </div>
    <div class="id-resize-handle"></div>
  `;
  document.body.appendChild(panel);
  initDraggable(panel);
  initResizable(panel);
  panel.querySelector("#id-close-btn").addEventListener("click", () => {
    hidePanel();
  });
  return panel;
}
function initDraggable(panel) {
  const header = panel.querySelector(".id-panel-header");
  enableDraggable({
    target: panel,
    handle: header,
    bodyCursor: "move",
    removeTransformOnStart: true,
    shouldStart: (e) => {
      return !e.target.closest(".id-panel-close");
    }
  });
}
function initResizable(panel) {
  const handle = panel.querySelector(".id-resize-handle");
  if (!handle) return;
  enableResizable({
    target: panel,
    handle,
    minWidth: 300,
    minHeight: 200
  });
}
const MIN_COMMON_PREFIX_RATIO = 0.7;
const ANCHOR_TOLERANCE_PX = 48;
function numberOr(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}
function normalizeRect(rect = {}) {
  const top = numberOr(rect.top);
  const left = numberOr(rect.left);
  const width = Math.max(0, numberOr(rect.width));
  const height = Math.max(0, numberOr(rect.height));
  return {
    top,
    left,
    width,
    height,
    right: numberOr(rect.right, left + width),
    bottom: numberOr(rect.bottom, top + height)
  };
}
function compareRects(a, b) {
  const rectA = normalizeRect(a);
  const rectB = normalizeRect(b);
  return rectA.top - rectB.top || rectA.left - rectB.left;
}
function areAnchorsCompatible(a, b) {
  const rectA = normalizeRect(a);
  const rectB = normalizeRect(b);
  const overlapsHorizontally = rectA.left <= rectB.right + ANCHOR_TOLERANCE_PX && rectB.left <= rectA.right + ANCHOR_TOLERANCE_PX;
  const overlapsVertically = rectA.top <= rectB.bottom + ANCHOR_TOLERANCE_PX && rectB.top <= rectA.bottom + ANCHOR_TOLERANCE_PX;
  return overlapsHorizontally && overlapsVertically;
}
function getAnchor(image, depth) {
  var _a2;
  return ((_a2 = image.ancestorRects) == null ? void 0 : _a2[depth - 1]) || image.pageRect || {};
}
function getPrefixKey(path, depth) {
  return `${path.length}|${depth}|${path.slice(0, depth).join(">")}`;
}
function createDisjointSet(size) {
  const parents = Array.from({ length: size }, (_, index) => index);
  function find(index) {
    let current = index;
    while (parents[current] !== current) {
      parents[current] = parents[parents[current]];
      current = parents[current];
    }
    return current;
  }
  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parents[rootB] = rootA;
    }
  }
  return { find, union };
}
function compareImages(a, b) {
  var _a2, _b2;
  return compareRects(a.pageRect, b.pageRect) || String(((_a2 = a.domPath) == null ? void 0 : _a2.join(">")) || "").localeCompare(String(((_b2 = b.domPath) == null ? void 0 : _b2.join(">")) || "")) || numberOr(a.captureOrder) - numberOr(b.captureOrder);
}
function sortImagesByDomGroup(images) {
  if (!Array.isArray(images) || images.length <= 1) {
    return Array.isArray(images) ? [...images] : [];
  }
  const ordered = [...images].sort(
    (a, b) => numberOr(a.captureOrder) - numberOr(b.captureOrder)
  );
  const disjointSet = createDisjointSet(ordered.length);
  const prefixIndex = /* @__PURE__ */ new Map();
  ordered.forEach((image, index) => {
    const path = Array.isArray(image.domPath) ? image.domPath : [];
    if (path.length === 0) return;
    const minDepth = Math.max(1, Math.ceil(path.length * MIN_COMMON_PREFIX_RATIO));
    for (let depth = path.length; depth >= minDepth; depth -= 1) {
      const key = getPrefixKey(path, depth);
      const priorIndexes = prefixIndex.get(key) || [];
      if (priorIndexes.length === 0) {
        continue;
      }
      const compatibleIndexes = priorIndexes.filter(
        (priorIndex) => areAnchorsCompatible(getAnchor(image, depth), getAnchor(ordered[priorIndex], depth))
      );
      if (compatibleIndexes.length === 0) {
        break;
      }
      compatibleIndexes.forEach((priorIndex) => disjointSet.union(index, priorIndex));
      break;
    }
    for (let depth = path.length; depth >= minDepth; depth -= 1) {
      const key = getPrefixKey(path, depth);
      const indexes = prefixIndex.get(key) || [];
      indexes.push(index);
      prefixIndex.set(key, indexes);
    }
  });
  const groups = /* @__PURE__ */ new Map();
  ordered.forEach((image, index) => {
    const root = disjointSet.find(index);
    const group = groups.get(root) || [];
    group.push(image);
    groups.set(root, group);
  });
  return Array.from(groups.values()).map((group) => group.sort(compareImages)).sort((a, b) => compareImages(a[0], b[0])).flat();
}
function copyImageRecord(image, captureOrder) {
  return {
    ...image,
    element: void 0,
    domPath: Array.isArray(image.domPath) ? [...image.domPath] : [],
    pageRect: normalizeRect(image.pageRect),
    ancestorRects: Array.isArray(image.ancestorRects) ? image.ancestorRects.map(normalizeRect) : [],
    captureOrder
  };
}
class ImageCollection {
  constructor() {
    this.records = /* @__PURE__ */ new Map();
    this.nextCaptureOrder = 0;
  }
  clear() {
    const changed = this.records.size > 0;
    this.records.clear();
    this.nextCaptureOrder = 0;
    return { added: 0, updated: 0, changed };
  }
  replace(images) {
    this.clear();
    const result = this.merge(images);
    return { ...result, changed: true };
  }
  merge(images) {
    let added = 0;
    let updated = 0;
    let changed = false;
    for (const image of Array.isArray(images) ? images : []) {
      const src = typeof (image == null ? void 0 : image.src) === "string" ? image.src : "";
      if (!src) continue;
      const existing = this.records.get(src);
      if (!existing) {
        this.records.set(src, copyImageRecord(image, this.nextCaptureOrder));
        this.nextCaptureOrder += 1;
        added += 1;
        changed = true;
        continue;
      }
      const patch = {};
      if (!existing.width && image.width) patch.width = image.width;
      if (!existing.height && image.height) patch.height = image.height;
      if (!existing.alt && image.alt) patch.alt = image.alt;
      if (compareRects(image.pageRect, existing.pageRect) < 0) {
        patch.domPath = Array.isArray(image.domPath) ? [...image.domPath] : [];
        patch.pageRect = normalizeRect(image.pageRect);
        patch.ancestorRects = Array.isArray(image.ancestorRects) ? image.ancestorRects.map(normalizeRect) : [];
      }
      if (Object.keys(patch).length > 0) {
        Object.assign(existing, patch);
        updated += 1;
        changed = true;
      }
    }
    return { added, updated, changed };
  }
  getSortedImages() {
    return sortImagesByDomGroup(Array.from(this.records.values()));
  }
  get size() {
    return this.records.size;
  }
}
const DOWNLOADER_UI_SELECTOR = "#id-panel, #id-floating-btn";
function isDownloaderUiNode(node) {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(DOWNLOADER_UI_SELECTOR));
}
class AutoCaptureController {
  constructor(options) {
    this.onScan = options.onScan;
    this.onError = options.onError || (() => {
    });
    this.minScanInterval = options.minScanInterval || 200;
    this.fallbackInterval = options.fallbackInterval || 1e3;
    this.active = false;
    this.scanning = false;
    this.scanRequested = false;
    this.lastScanAt = 0;
    this.scanTimer = null;
    this.fallbackTimer = null;
    this.observer = null;
    this.handleScroll = () => this.requestScan();
    this.handleVisibilityChange = () => {
      if (!document.hidden) this.requestScan({ immediate: true });
    };
    this.handlePageHide = () => this.stop();
  }
  start() {
    if (this.active) return false;
    this.active = true;
    window.addEventListener("scroll", this.handleScroll, true);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide, { once: true });
    this.observer = new MutationObserver((mutations) => {
      const hasPageMutation = mutations.some((mutation) => {
        if (isDownloaderUiNode(mutation.target)) return false;
        return Array.from(mutation.addedNodes || []).some((node) => !isDownloaderUiNode(node)) || mutation.type === "attributes";
      });
      if (hasPageMutation) this.requestScan();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "src",
        "srcset",
        "href",
        "poster",
        "style",
        "class",
        "data-src",
        "data-original",
        "data-lazy",
        "data-srcset",
        "data-image",
        "data-ks-lazyload",
        "data-url",
        "data-ks-observersrc"
      ]
    });
    this.fallbackTimer = window.setInterval(() => this.requestScan(), this.fallbackInterval);
    this.requestScan({ immediate: true });
    return true;
  }
  stop() {
    var _a2;
    if (!this.active) return false;
    this.active = false;
    window.removeEventListener("scroll", this.handleScroll, true);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("pagehide", this.handlePageHide);
    (_a2 = this.observer) == null ? void 0 : _a2.disconnect();
    this.observer = null;
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.fallbackTimer !== null) {
      window.clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.scanRequested = false;
    return true;
  }
  requestScan({ immediate = false } = {}) {
    if (!this.active || document.hidden) return;
    if (this.scanning) {
      this.scanRequested = true;
      return;
    }
    if (this.scanTimer !== null) return;
    const elapsed = Date.now() - this.lastScanAt;
    const delay = immediate ? 0 : Math.max(0, this.minScanInterval - elapsed);
    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = null;
      this.runScan();
    }, delay);
  }
  async runScan() {
    if (!this.active || document.hidden || this.scanning) return;
    this.scanning = true;
    this.scanRequested = false;
    try {
      await this.onScan();
    } catch (error) {
      this.onError(error);
    } finally {
      this.lastScanAt = Date.now();
      this.scanning = false;
      if (this.scanRequested) this.requestScan();
    }
  }
}
function isTopWindow() {
  try {
    return window.top === window.self;
  } catch {
    return false;
  }
}
if (isTopWindow()) {
  addStyle(styles);
}
const SHORTCUT_KEY = "i";
const DOWNLOADED_HISTORY_KEY = (_b = (_a = config.imageDownloader) == null ? void 0 : _a.storageKeys) == null ? void 0 : _b.downloadHistory;
const GIF_QUALITY_MODE_KEY = (_d = (_c = config.imageDownloader) == null ? void 0 : _c.storageKeys) == null ? void 0 : _d.gifQualityMode;
function normalizeGifQualityMode(mode) {
  return mode === "low" ? "low" : "high";
}
(function() {
  if (!isTopWindow()) {
    return;
  }
  if (window.__imageDownloaderInitialized) {
    return;
  }
  window.__imageDownloaderInitialized = true;
  let currentImages = [];
  let selectedImages = [];
  const downloadHistory = [];
  let useHighQualityGif = true;
  let shortcutEnabled = true;
  let isDownloading = false;
  const imageCapture = new ImageCapture();
  const imageCollection = new ImageCollection();
  function updateDownloadedCount(downloadedCountText) {
    if (!downloadedCountText) return;
    downloadedCountText.textContent = `历史下载数: ${downloadHistory.length}`;
  }
  function normalizeHistoryRecord(record) {
    if (record && typeof record === "object" && typeof record.url === "string" && record.url) {
      return {
        url: record.url,
        downloadedAt: typeof record.downloadedAt === "string" ? record.downloadedAt : null
      };
    }
    return null;
  }
  async function loadDownloadHistory(downloadedCountText) {
    try {
      const storedHistory = await getItem(DOWNLOADED_HISTORY_KEY, []);
      if (Array.isArray(storedHistory)) {
        storedHistory.forEach((record) => {
          const normalized = normalizeHistoryRecord(record);
          if (normalized) {
            downloadHistory.push(normalized);
          }
        });
      }
      updateDownloadedCount(downloadedCountText);
      logger.info("已加载下载历史", { count: downloadHistory.length });
    } catch (error) {
      logger.error("读取下载历史失败", error);
      updateDownloadedCount(downloadedCountText);
    }
  }
  async function saveDownloadHistory() {
    try {
      await setItem(DOWNLOADED_HISTORY_KEY, downloadHistory);
      logger.debug("下载历史已保存", { count: downloadHistory.length });
    } catch (error) {
      logger.error("保存下载历史失败", error);
    }
  }
  function setupShortcutKey(onCapture) {
    document.addEventListener("keydown", (e) => {
      const key = String(e.key || "").toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === SHORTCUT_KEY) {
        e.preventDefault();
        if (!shortcutEnabled) return;
        shortcutEnabled = false;
        const panel = document.getElementById("id-panel");
        if (!panel || panel.style.display === "none" || panel.style.display === "") {
          showPanel();
        }
        onCapture();
        setTimeout(() => {
          shortcutEnabled = true;
        }, 500);
      }
    });
  }
  async function init() {
    var _a2;
    logger.info("imageDownloader 初始化开始", { logLevel: config.logLevel });
    const panel = createPanel();
    const activeEnhancer = getActiveEnhancerName();
    const enhancerStatus = panel.querySelector("#id-enhancer-status");
    if (activeEnhancer) {
      const displayName = getEnhancerDisplayName(activeEnhancer);
      enhancerStatus.textContent = `✨ 当前网站已启用增强：${displayName}`;
      enhancerStatus.classList.add("active");
    } else {
      enhancerStatus.textContent = "";
      enhancerStatus.classList.remove("active");
    }
    initFloatingButton({
      onToggle: togglePanel
    });
    hidePanel();
    const grid = panel.querySelector(".id-image-grid");
    const selectAllBtn = panel.querySelector("#id-select-all");
    const selectNoneBtn = panel.querySelector("#id-select-none");
    const downloadBtn = panel.querySelector("#id-download");
    const clearStorageBtn = panel.querySelector("#id-clear-storage");
    const clearCapturedBtn = panel.querySelector("#id-clear-captured");
    const captureBtn = panel.querySelector("#id-capture");
    const autoCaptureToggle = panel.querySelector("#id-auto-capture-toggle");
    const autoCaptureLabel = panel.querySelector("#id-auto-capture-label");
    const prefixInput = panel.querySelector("#id-prefix");
    const gifQualityToggle = panel.querySelector("#id-gif-quality-toggle");
    const statusText = panel.querySelector(".id-status");
    const downloadedCountText = panel.querySelector("#id-downloaded-count");
    await loadDownloadHistory(downloadedCountText);
    try {
      const storedMode = normalizeGifQualityMode(await getItem(GIF_QUALITY_MODE_KEY, "high"));
      useHighQualityGif = storedMode !== "low";
    } catch (error) {
      logger.warn("读取 GIF 画质模式失败，使用默认清晰模式", error);
      useHighQualityGif = true;
    }
    if (gifQualityToggle) {
      gifQualityToggle.checked = useHighQualityGif;
      gifQualityToggle.addEventListener("change", async () => {
        useHighQualityGif = Boolean(gifQualityToggle.checked);
        try {
          await setItem(GIF_QUALITY_MODE_KEY, useHighQualityGif ? "high" : "low");
        } catch (error) {
          logger.warn("保存 GIF 画质模式失败", error);
        }
        statusText.textContent = useHighQualityGif ? "动态图画质：清晰（更慢、更大）" : "动态图画质：标准（更快、更小）";
      });
    }
    const imageSelector = new ImageSelector({
      grid,
      onSelectionChange: (selected) => {
        selectedImages = selected;
        updateDownloadButton();
      }
    });
    function scanAndUpdate({ replace = false, source = "manual" } = {}) {
      const scannedImages = imageCapture.getAllImages();
      const result = replace ? imageCollection.replace(scannedImages) : imageCollection.merge(scannedImages);
      if (result.changed || replace) {
        currentImages = imageCollection.getSortedImages();
        imageSelector.render(currentImages, { preserveSelection: !replace });
      }
      logger.info("图片捕获完成", {
        source,
        scanned: scannedImages.length,
        added: result.added,
        updated: result.updated,
        total: imageCollection.size
      });
      return result;
    }
    const autoCaptureSettings = ((_a2 = config.imageDownloader) == null ? void 0 : _a2.autoCapture) || {};
    const autoCaptureController = new AutoCaptureController({
      minScanInterval: autoCaptureSettings.minScanInterval,
      fallbackInterval: autoCaptureSettings.fallbackInterval,
      onScan: () => {
        const result = scanAndUpdate({ source: "auto" });
        if (!isDownloading) {
          statusText.textContent = result.added > 0 ? `自动捕获中：累计 ${imageCollection.size} 张，本轮新增 ${result.added} 张` : `自动捕获中：累计 ${imageCollection.size} 张`;
        }
      },
      onError: (error) => {
        logger.error("自动捕获失败", error);
        if (!isDownloading) statusText.textContent = "自动捕获扫描失败，将继续重试";
      }
    });
    function runManualCapture(source = "manual") {
      const isAutoCapturing = autoCaptureController.active;
      logger.info("开始手动捕获图片", { source, isAutoCapturing });
      const result = scanAndUpdate({ replace: !isAutoCapturing, source });
      statusText.textContent = isAutoCapturing ? `自动捕获中：累计 ${imageCollection.size} 张，本轮新增 ${result.added} 张` : `已捕获 ${imageCollection.size} 张图片`;
    }
    setupShortcutKey(() => runManualCapture("shortcut"));
    captureBtn.addEventListener("click", () => {
      runManualCapture("button");
    });
    autoCaptureToggle.addEventListener("change", () => {
      if (autoCaptureToggle.checked) {
        autoCaptureLabel.classList.add("is-active");
        statusText.textContent = `自动捕获中：累计 ${imageCollection.size} 张`;
        autoCaptureController.start();
        logger.info("自动捕获已开启");
        return;
      }
      autoCaptureController.stop();
      autoCaptureLabel.classList.remove("is-active");
      statusText.textContent = `自动捕获已停止，共捕获 ${imageCollection.size} 张图片`;
      logger.info("自动捕获已停止", { count: imageCollection.size });
    });
    selectAllBtn.addEventListener("click", () => {
      imageSelector.selectAll();
    });
    selectNoneBtn.addEventListener("click", () => {
      imageSelector.selectNone();
    });
    clearCapturedBtn.addEventListener("click", () => {
      imageCollection.clear();
      currentImages = [];
      imageSelector.render(currentImages);
      statusText.textContent = autoCaptureController.active ? "已清空捕获，自动捕获将继续累计" : "已清空捕获图片";
      logger.info("已清空当前捕获图片");
    });
    clearStorageBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("确认清除当前脚本的存储记录吗？");
      if (!confirmed) return;
      downloadHistory.length = 0;
      try {
        await setItem(DOWNLOADED_HISTORY_KEY, []);
        updateDownloadedCount(downloadedCountText);
        statusText.textContent = "存储已清除";
        logger.info("图片脚本存储已清除");
      } catch (error) {
        statusText.textContent = "清除存储失败";
        logger.error("清除图片脚本存储失败", error);
      }
    });
    downloadBtn.addEventListener("click", () => {
      if (selectedImages.length === 0) {
        alert("请先选择要下载的图片");
        return;
      }
      const imagesToDownload = [...selectedImages];
      const prefix = prefixInput.value || getDefaultPrefix();
      logger.info("开始下载选中图片", {
        count: imagesToDownload.length,
        prefix
      });
      isDownloading = true;
      const downloader = new BatchDownloader({
        prefix,
        animatedGifHighQuality: useHighQualityGif,
        onProgress: (current, total) => {
          statusText.textContent = `下载中: ${current}/${total}`;
        },
        onComplete: async (success, failed, successUrls = []) => {
          isDownloading = false;
          statusText.textContent = `完成: 成功 ${success}, 失败 ${failed}`;
          if (successUrls.length > 0) {
            const now = (/* @__PURE__ */ new Date()).toISOString();
            successUrls.forEach((url) => {
              if (typeof url === "string" && url) {
                downloadHistory.push({
                  url,
                  downloadedAt: now
                });
              }
            });
            updateDownloadedCount(downloadedCountText);
            await saveDownloadHistory();
          }
          logger.info("下载流程完成", {
            success,
            failed,
            historyAdded: successUrls.length,
            historyTotal: downloadHistory.length
          });
        }
      });
      downloader.download(imagesToDownload);
    });
    function updateDownloadButton() {
      const count = selectedImages.length;
      downloadBtn.disabled = count === 0;
      downloadBtn.textContent = count === 0 ? "下载选中" : `下载选中 (${count})`;
    }
    function getDefaultPrefix() {
      const now = /* @__PURE__ */ new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      return `${month}${day}${hours}${minutes}`;
    }
    updateDownloadButton();
    logger.info("imageDownloader 初始化完成", {
      downloadedCount: downloadHistory.length
    });
  }
  function startInit() {
    init().catch((error) => {
      logger.error("imageDownloader 初始化失败", error);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startInit);
  } else {
    startInit();
  }
})();
