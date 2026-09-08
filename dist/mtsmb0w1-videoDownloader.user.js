// ==UserScript==
// @name         Video Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  视频批量下载器 - 前端采集关键信息，后端执行下载
// @match        https://*/*
// @match        http://*/*
// @connect      *
// @connect      127.0.0.1
// @connect      localhost
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow
// ==/UserScript==

var _a, _b;
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
  // videoDownloader 专用配置
  videoDownloader: {
    storageKeys: {
      downloadHistory: "videoDownloader_download_history"
    },
    backend: {
      baseUrl: "http://127.0.0.1:8787",
      wsUrl: "",
      requestTimeout: 2e4,
      pollingInterval: 2500
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
async function request(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    body = null,
    dataType = "json",
    responseType = "",
    timeout = 3e4
  } = options;
  return new Promise((resolve, reject) => {
    const xhr = {
      method,
      url,
      headers,
      timeout,
      responseType,
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          try {
            let data;
            if (responseType === "blob" || responseType === "arraybuffer") {
              data = response.response;
            } else if (dataType === "text") {
              data = response.responseText;
            } else if (dataType === "json") {
              data = JSON.parse(response.responseText);
            } else {
              data = response.responseText;
            }
            resolve({ data, status: response.status, headers: response.responseHeaders });
          } catch (e) {
            resolve({ data: response.responseText, status: response.status });
          }
        } else {
          let detail = "";
          const text = String(response.responseText || "").trim();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              detail = String((parsed == null ? void 0 : parsed.detail) || text);
            } catch {
              detail = text;
            }
          }
          const message = detail ? `请求失败: ${response.status} - ${detail}` : `请求失败: ${response.status}`;
          reject(new Error(message));
        }
      },
      onerror: () => reject(new Error("网络请求失败")),
      ontimeout: () => reject(new Error("请求超时"))
    };
    if (body) {
      xhr.data = typeof body === "string" ? body : JSON.stringify(body);
      if (!xhr.headers["Content-Type"] && !xhr.headers["content-type"]) {
        xhr.headers["Content-Type"] = "application/json";
      }
    }
    GM_xmlhttpRequest(xhr);
  });
}
function normalizeBaseUrl(url) {
  const fallback = "http://127.0.0.1:8787";
  const value = String(url || "").trim() || fallback;
  try {
    const normalized = new URL(value);
    normalized.pathname = "";
    normalized.search = "";
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}
function toWsUrl(baseUrl, explicitWsUrl = "") {
  if (explicitWsUrl && String(explicitWsUrl).trim()) {
    return String(explicitWsUrl).trim().replace(/\/$/, "");
  }
  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://");
  }
  return normalized.replace("http://", "ws://");
}
class VideoBackendClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.wsUrl = toWsUrl(this.baseUrl, options.wsUrl);
    this.timeout = options.timeout || 2e4;
  }
  setBaseUrl(baseUrl, wsUrl = "") {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.wsUrl = toWsUrl(this.baseUrl, wsUrl);
  }
  getBaseUrl() {
    return this.baseUrl;
  }
  getWsUrl() {
    return this.wsUrl;
  }
  async createTask(payload) {
    const response = await request(this.buildUrl("/api/video/tasks"), {
      method: "POST",
      body: payload,
      timeout: this.timeout,
      dataType: "json"
    });
    return response.data;
  }
  async getTask(taskId) {
    const response = await request(this.buildUrl(`/api/video/tasks/${encodeURIComponent(taskId)}`), {
      method: "GET",
      timeout: this.timeout,
      dataType: "json"
    });
    return response.data;
  }
  async listTasks() {
    var _a2;
    const response = await request(this.buildUrl("/api/video/tasks"), {
      method: "GET",
      timeout: this.timeout,
      dataType: "json"
    });
    return ((_a2 = response.data) == null ? void 0 : _a2.tasks) || [];
  }
  async cancelTask(taskId) {
    const response = await request(
      this.buildUrl(`/api/video/tasks/${encodeURIComponent(taskId)}/cancel`),
      {
        method: "POST",
        timeout: this.timeout,
        dataType: "json"
      }
    );
    return response.data;
  }
  async openDirectory({ taskId = "", path = "" } = {}) {
    const response = await request(this.buildUrl("/api/video/tasks/open-dir"), {
      method: "POST",
      body: {
        taskId,
        path
      },
      timeout: this.timeout,
      dataType: "json"
    });
    return response.data;
  }
  async cleanupPartDirs() {
    const response = await request(this.buildUrl("/api/video/tasks/cleanup-part-dirs"), {
      method: "POST",
      timeout: this.timeout,
      dataType: "json"
    });
    return response.data;
  }
  connectTaskStream({ taskId = "", onOpen, onMessage, onClose, onError }) {
    const wsBase = this.getWsUrl();
    const endpoint = `${wsBase}/api/video/tasks/ws`;
    const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
    const wsUrl = `${endpoint}${query}`;
    logger.info("连接后端任务 WebSocket", { wsUrl });
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      onOpen == null ? void 0 : onOpen();
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage == null ? void 0 : onMessage(data);
      } catch (error) {
        logger.warn("WebSocket 消息解析失败", error);
      }
    };
    socket.onerror = (event) => {
      onError == null ? void 0 : onError(event);
    };
    socket.onclose = (event) => {
      onClose == null ? void 0 : onClose(event);
    };
    return {
      close() {
        try {
          socket.close();
        } catch (error) {
          logger.warn("关闭 WebSocket 失败", error);
        }
      }
    };
  }
  buildUrl(path) {
    return `${this.baseUrl}${path}`;
  }
}
const styles = `/* 视频批量下载器样式 */

#vd-floating-btn {
  position: fixed;
  bottom: 92px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5a4 0%, #f59e0b 100%);
  color: #ffffff;
  border: none;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(14, 165, 164, 0.38);
  z-index: 2147483647;
  transition: all 0.25s ease;
  touch-action: none;
}

#vd-floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 22px rgba(245, 158, 11, 0.4);
}

#vd-floating-btn.active {
  background: linear-gradient(135deg, #0f766e 0%, #ea580c 100%);
}

#vd-floating-btn.dragging {
  cursor: grabbing;
  transition: none;
}

#vd-floating-btn.dragging:hover {
  transform: none;
}

#vd-floating-btn svg {
  width: 20px;
  height: 20px;
}

.vd-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 675px;
  min-width: 300px;
  min-height: 200px;
  background: #fefefe;
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(3, 38, 55, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.vd-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #0f766e 0%, #0ea5a4 55%, #f59e0b 100%);
  color: #ffffff;
  cursor: move;
  user-select: none;
}

.vd-panel-title {
  font-size: 15px;
  font-weight: 700;
}

.vd-panel-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vd-panel-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.vd-panel-note {
  padding: 8px 16px;
  font-size: 12px;
  color: #0c4a6e;
  background: linear-gradient(90deg, #fef9c3 0%, #ffedd5 100%);
  border-bottom: 1px solid #fed7aa;
}

.vd-backend-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #d8e4eb;
  background: #eef6fb;
}

.vd-backend-status {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.vd-backend-status.connected {
  color: #047857;
}

.vd-backend-status.disconnected {
  color: #b45309;
}

.vd-backend-status.polling {
  color: #0369a1;
}

.vd-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f4f8fa;
  border-bottom: 1px solid #d6e3ea;
  flex-wrap: wrap;
}

.vd-btn {
  padding: 8px 14px;
  border-radius: 7px;
  border: 1px solid #b9c8d0;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.vd-btn:hover:not(:disabled) {
  background: #eef6f8;
}

.vd-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.vd-btn-primary {
  background: #0ea5a4;
  color: #ffffff;
  border-color: #0f766e;
}

.vd-btn-primary:hover:not(:disabled) {
  background: #0f766e;
}

.vd-btn-success {
  background: #f59e0b;
  color: #ffffff;
  border-color: #d97706;
}

.vd-btn-success:hover:not(:disabled) {
  background: #ea580c;
}

.vd-btn-warning {
  background: #f97316;
  color: #ffffff;
  border-color: #ea580c;
}

.vd-btn-warning:hover:not(:disabled) {
  background: #ea580c;
}

.vd-btn-ghost {
  background: #ffffff;
  color: #0f766e;
  border-color: #99b9c6;
}

.vd-btn-ghost:hover:not(:disabled) {
  background: #eff8f9;
}

.vd-prefix-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.vd-input {
  width: 100px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid #b8c5cf;
  outline: none;
  font-size: 13px;
}

.vd-input-wide {
  width: 180px;
}

.vd-input:focus {
  border-color: #0ea5a4;
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.18);
}

.vd-video-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 10px;
  align-content: start;
  background: linear-gradient(180deg, #f7fafc 0%, #f1f5f9 100%);
}

.vd-task-panel {
  display: flex;
  flex-direction: column;
  min-height: 96px;
  max-height: 45%;
  min-width: 0;
  flex-shrink: 0;
  border-top: 1px solid #d6e3ea;
  background: #f8fbfd;
}

.vd-task-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  border-bottom: 1px solid #d6e3ea;
}

.vd-task-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.vd-task-empty {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  padding: 12px;
}

.vd-task-item {
  border: 1px solid #d7e2ea;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
  display: grid;
  gap: 6px;
}

.vd-task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.vd-task-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.vd-task-id {
  font-size: 11px;
  color: #475569;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vd-task-status {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.vd-task-status.queued {
  color: #0f172a;
  background: #e2e8f0;
}

.vd-task-status.running {
  color: #075985;
  background: #dbeafe;
}

.vd-task-status.cancelling {
  color: #9a3412;
  background: #fef3c7;
}

.vd-task-status.success {
  color: #166534;
  background: #dcfce7;
}

.vd-task-status.failed {
  color: #991b1b;
  background: #fee2e2;
}

.vd-task-status.cancelled {
  color: #7c2d12;
  background: #ffedd5;
}

.vd-task-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.vd-task-progress-bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #0ea5a4, #f59e0b);
  transition: width 0.2s ease;
}

.vd-task-meta {
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.vd-task-message {
  font-size: 11px;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 6px;
  border: 1px solid #dbe6ee;
  border-radius: 6px;
  background: #f8fafc;
}

.vd-task-cancel {
  border: 1px solid #f59e0b;
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 8px;
  color: #9a3412;
  background: #fff7ed;
  cursor: pointer;
}

.vd-task-cancel:hover {
  background: #ffedd5;
}

.vd-task-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.vd-task-cancel.is-processing {
  border-color: #d97706;
  background: #fef3c7;
  color: #9a3412;
}

.vd-task-open {
  border: 1px solid #99b9c6;
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 8px;
  color: #0f766e;
  background: #ffffff;
  cursor: pointer;
}

.vd-task-open:hover {
  background: #eff8f9;
}

.vd-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 42px 10px;
  color: #64748b;
  font-size: 14px;
}

.vd-video-item {
  position: relative;
  min-height: 185px;
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.vd-video-item.unselectable {
  cursor: not-allowed;
  opacity: 0.72;
  filter: saturate(0.7);
}

.vd-video-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(14, 116, 144, 0.2);
}

.vd-video-item.unselectable:hover {
  transform: none;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
}

.vd-video-item.unselectable .vd-checkbox {
  display: none;
}

.vd-video-item.selected {
  box-shadow: 0 0 0 3px #0ea5a4;
}

.vd-video-thumb {
  position: relative;
  width: 100%;
  min-height: 110px;
  background: linear-gradient(135deg, #1f2937 0%, #0f172a 100%);
  overflow: hidden;
}

.vd-video-thumb video,
.vd-video-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vd-video-thumb-fallback::before {
  content: 'VIDEO';
  color: rgba(255, 255, 255, 0.88);
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 12px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.vd-play-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(15, 118, 110, 0.85);
  color: #ffffff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vd-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.vd-video-item:hover .vd-checkbox,
.vd-video-item.selected .vd-checkbox {
  opacity: 1;
}

.vd-video-item.selected .vd-checkbox {
  background: #0ea5a4;
}

.vd-video-item.selected .vd-checkbox svg rect {
  fill: #0ea5a4;
}

.vd-video-info {
  padding: 8px;
  min-height: 68px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.vd-filename {
  font-size: 12px;
  line-height: 1.35;
  color: #1e293b;
  word-break: break-all;
}

.vd-filename-input {
  width: 100%;
  border: 1px solid #c8d5dd;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  color: #1e293b;
}

.vd-filename-input:focus {
  border-color: #0ea5a4;
  box-shadow: 0 0 0 2px rgba(14, 165, 164, 0.16);
}

.vd-meta {
  font-size: 11px;
  color: #64748b;
}

.vd-badge {
  display: inline-flex;
  width: fit-content;
  font-size: 10px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 999px;
}

.vd-badge-hls {
  background: #cffafe;
  color: #115e59;
}

.vd-badge-unsupported {
  background: #fee2e2;
  color: #991b1b;
}

.vd-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px 10px 16px;
  background: #eff6f9;
  border-top: 1px solid #d6e3ea;
}

.vd-status {
  font-size: 12px;
  color: #334155;
}

.vd-downloaded-count {
  font-size: 12px;
  color: #0f766e;
  margin-right: 20px;
  white-space: nowrap;
}

.vd-resize-handle {
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
    #9ca3af 50%,
    #9ca3af 60%,
    transparent 60%,
    transparent 70%,
    #9ca3af 70%,
    #9ca3af 80%,
    transparent 80%
  );
}

.vd-video-grid::-webkit-scrollbar {
  width: 8px;
}

.vd-video-grid::-webkit-scrollbar-track {
  background: #e5edf1;
  border-radius: 4px;
}

.vd-video-grid::-webkit-scrollbar-thumb {
  background: #9fb7c2;
  border-radius: 4px;
}

.vd-video-grid::-webkit-scrollbar-thumb:hover {
  background: #7f9aa7;
}

@media (max-width: 680px) {
  .vd-panel {
    width: 95%;
    height: 90%;
  }

  .vd-toolbar {
    padding: 8px 12px;
    gap: 6px;
  }

  .vd-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .vd-video-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    padding: 8px;
  }

  .vd-input-wide {
    width: 100%;
  }

  .vd-task-panel {
    max-height: 42%;
  }
}

@media (max-width: 520px) {
  .vd-panel {
    width: 100%;
    height: 100%;
    min-width: 100%;
    border-radius: 0;
  }

  .vd-video-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }

  .vd-prefix-label {
    width: 100%;
    margin-top: 4px;
  }

  .vd-input {
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
const DEFAULT_BOTTOM_PX = 92;
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
  const button = createElement(
    "div",
    {
      id: "vd-floating-btn",
      title: "视频批量下载器"
    },
    `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v15l12-7.5z"/>
    </svg>
  `
  );
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
}
function showPanel() {
  const panel = document.getElementById("vd-panel");
  if (panel) {
    panel.style.display = "flex";
    panel.style.opacity = "1";
  }
  const button = document.getElementById("vd-floating-btn");
  if (button) {
    button.classList.add("active");
  }
}
function hidePanel() {
  const panel = document.getElementById("vd-panel");
  if (panel) {
    panel.style.display = "none";
  }
  const button = document.getElementById("vd-floating-btn");
  if (button) {
    button.classList.remove("active");
  }
}
function togglePanel() {
  const panel = document.getElementById("vd-panel");
  if (!panel) return;
  if (panel.style.display === "none" || panel.style.display === "") {
    showPanel();
  } else {
    hidePanel();
  }
}
const enhancers = [
  {
    name: "default",
    displayName: "通用视频源",
    priority: 0,
    urlPattern: /.*/i,
    pagePattern: /.*/i,
    enhance(url) {
      return url;
    }
  }
];
function getActiveEnhancer(pageUrl) {
  const url = window.location.href;
  for (const enhancer of enhancers) {
    if (enhancer.pagePattern.test(url)) {
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
  const enhancer = enhancers.find((item) => item.name === name);
  return (enhancer == null ? void 0 : enhancer.displayName) || (enhancer == null ? void 0 : enhancer.name) || name;
}
function enhanceVideoUrl(url) {
  if (!url) return url;
  for (const enhancer of enhancers) {
    if (enhancer.urlPattern.test(url)) {
      return enhancer.enhance(url);
    }
  }
  return url;
}
class VideoCapture {
  constructor() {
    this.videoExtensions = [
      "mp4",
      "webm",
      "m4v",
      "mov",
      "mkv",
      "avi",
      "flv",
      "m3u8",
      "mpd"
    ];
    this.dynamicScriptExtensions = ["php", "asp", "aspx", "jsp", "cgi", "do", "action"];
    this.pageExtensions = ["html", "htm", "shtml", "xhtml"];
  }
  /**
   * 捕获页面所有可识别视频资源
   * @returns {Array}
   */
  getAllVideos() {
    const videos = [];
    const seen = /* @__PURE__ */ new Set();
    this.captureFromVideoElements(videos, seen);
    this.captureFromLinks(videos, seen);
    this.captureFromDataAttrs(videos, seen);
    return videos.filter((item) => this.isLikelyVideoUrl(item.src, item.captureSource));
  }
  captureFromVideoElements(results, seen) {
    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((video) => {
      const candidates = [];
      if (video.currentSrc) candidates.push(video.currentSrc);
      if (video.src) candidates.push(video.src);
      const sourceElements = video.querySelectorAll("source");
      sourceElements.forEach((source) => {
        if (source.src) candidates.push(source.src);
        if (source.getAttribute("src")) candidates.push(source.getAttribute("src"));
      });
      this.captureFromCandidates(candidates, {
        poster: video.poster || "",
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : 0,
        width: video.videoWidth || video.clientWidth || 0,
        height: video.videoHeight || video.clientHeight || 0,
        title: video.getAttribute("title") || document.title || ""
      }, results, seen, "video-element");
    });
  }
  captureFromLinks(results, seen) {
    const links = document.querySelectorAll("a[href]");
    links.forEach((link) => {
      var _a2;
      const href = link.getAttribute("href");
      this.captureFromCandidates(
        [href],
        {
          poster: "",
          duration: 0,
          width: 0,
          height: 0,
          title: ((_a2 = link.textContent) == null ? void 0 : _a2.trim()) || link.getAttribute("title") || document.title || ""
        },
        results,
        seen,
        "link"
      );
    });
  }
  captureFromDataAttrs(results, seen) {
    const candidateSelectors = [
      "[data-video-url]",
      "[data-video]",
      "[data-src]",
      "[data-play-url]",
      "[data-playurl]",
      "[data-m3u8]",
      "[data-stream-url]"
    ];
    const elements = document.querySelectorAll(candidateSelectors.join(","));
    elements.forEach((el) => {
      const candidates = [
        el.getAttribute("data-video-url"),
        el.getAttribute("data-video"),
        el.getAttribute("data-src"),
        el.getAttribute("data-play-url"),
        el.getAttribute("data-playurl"),
        el.getAttribute("data-m3u8"),
        el.getAttribute("data-stream-url")
      ];
      this.captureFromCandidates(
        candidates,
        {
          poster: el.getAttribute("poster") || "",
          duration: 0,
          width: 0,
          height: 0,
          title: el.getAttribute("title") || document.title || ""
        },
        results,
        seen,
        "data-attr"
      );
    });
  }
  captureFromCandidates(candidates, metadata, results, seen, captureSource = "unknown") {
    candidates.map((value) => this.normalizeUrl(value)).filter(Boolean).forEach((normalizedUrl) => {
      if (seen.has(normalizedUrl)) {
        return;
      }
      seen.add(normalizedUrl);
      const enhancedUrl = enhanceVideoUrl(normalizedUrl);
      const mediaType = this.detectMediaType(enhancedUrl);
      if (mediaType === "ts" && this.isLikelyHlsSegmentUrl(enhancedUrl)) {
        return;
      }
      const supported = mediaType !== "blob" && mediaType !== "dash" && mediaType !== "dynamic";
      results.push({
        src: enhancedUrl,
        type: mediaType,
        captureSource,
        mimeType: this.guessMimeType(enhancedUrl),
        duration: metadata.duration || 0,
        width: metadata.width || 0,
        height: metadata.height || 0,
        poster: metadata.poster || "",
        title: metadata.title || "",
        supported,
        unsupportedReason: supported ? "" : this.getUnsupportedReason(mediaType)
      });
    });
  }
  normalizeUrl(url) {
    if (!url || typeof url !== "string") {
      return null;
    }
    const raw = url.trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith("data:")) {
      return null;
    }
    if (raw.startsWith("blob:")) {
      return raw;
    }
    if (raw.startsWith("//")) {
      return `${window.location.protocol}${raw}`;
    }
    try {
      return new URL(raw, window.location.href).href.split("#")[0];
    } catch {
      return null;
    }
  }
  getUrlMatchTarget(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname || ""}${parsed.search || ""}`.toLowerCase();
    } catch {
      return String(url || "").toLowerCase();
    }
  }
  isLikelyVideoUrl(url, captureSource = "unknown") {
    if (!url) return false;
    const rawLower = String(url).toLowerCase();
    if (rawLower.startsWith("blob:")) return true;
    const matchTarget = this.getUrlMatchTarget(url);
    const ext = this.extractExtension(matchTarget);
    if (ext && this.pageExtensions.includes(ext)) {
      return false;
    }
    if (ext && this.videoExtensions.includes(ext)) {
      return true;
    }
    if (ext && this.dynamicScriptExtensions.includes(ext)) {
      return true;
    }
    if (matchTarget.includes(".m3u8") || matchTarget.includes(".mpd")) {
      return true;
    }
    if (captureSource === "video-element") {
      return true;
    }
    const hintPattern = /(?:^|[/?#&=_-])(stream|playurl|m3u8|mpd)(?:[/?#&=_-]|$)/i;
    if (captureSource === "link" || captureSource === "data-attr") {
      return hintPattern.test(matchTarget);
    }
    if (captureSource === "unknown") {
      return hintPattern.test(matchTarget);
    }
    return false;
  }
  detectMediaType(url) {
    const lower = (url || "").toLowerCase();
    if (lower.startsWith("blob:")) return "blob";
    if (lower.includes(".m3u8")) return "m3u8";
    if (lower.includes(".mpd")) return "dash";
    const ext = this.extractExtension(lower);
    if (!ext) return "video";
    if (this.dynamicScriptExtensions.includes(ext)) return "dynamic";
    if (ext === "m3u8") return "m3u8";
    if (ext === "mpd") return "dash";
    return ext;
  }
  isLikelyHlsSegmentUrl(url) {
    const lower = (url || "").toLowerCase();
    if (!lower.includes(".ts")) {
      return false;
    }
    return /\/(seg|segment|chunk|frag|media|part)[^/]*\d+[^/]*\.ts(\?|$)/i.test(lower) || /[?&](seg|segment|chunk|frag|part|start|end)=/i.test(lower) || /\/\d{1,6}\.ts(\?|$)/i.test(lower);
  }
  extractExtension(url) {
    const noQuery = (url || "").split("?")[0];
    const parts = noQuery.split(".");
    if (parts.length < 2) return "";
    const ext = parts[parts.length - 1].trim();
    return ext.length > 6 ? "" : ext;
  }
  guessMimeType(url) {
    const ext = this.extractExtension((url || "").toLowerCase());
    const map = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      m4v: "video/x-m4v",
      m3u8: "application/vnd.apple.mpegurl",
      ts: "video/mp2t",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      flv: "video/x-flv",
      mpd: "application/dash+xml"
    };
    return map[ext] || "video/mp4";
  }
  getUnsupportedReason(mediaType) {
    if (mediaType === "blob") {
      return "blob 资源无法直接提取源地址";
    }
    if (mediaType === "dash") {
      return "dash/mpd 暂不支持";
    }
    if (mediaType === "dynamic") {
      return "动态脚本地址（如 .php）暂不支持自动下载";
    }
    return "当前资源暂不支持";
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
function getEditableFileName(video) {
  const rawName = String((video == null ? void 0 : video.fileName) || "").trim();
  if (rawName) {
    return rawName;
  }
  const fallback = getFileName((video == null ? void 0 : video.src) || "");
  return fallback.replace(/\.[0-9A-Za-z]{1,6}$/, "");
}
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
}
function formatDuration(seconds) {
  const value = Number(seconds || 0);
  if (!value || !Number.isFinite(value)) return "--:--";
  const hours = Math.floor(value / 3600);
  const mins = Math.floor(value % 3600 / 60);
  const secs = Math.floor(value % 60);
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
function formatType(type) {
  if (!type) return "video";
  if (type === "m3u8") return "HLS";
  if (type === "dash") return "DASH";
  if (type === "blob") return "BLOB";
  return String(type).toUpperCase();
}
function isVideoSelectable(video) {
  return (video == null ? void 0 : video.supported) !== false;
}
function getUnselectableReason(video) {
  const reason = String((video == null ? void 0 : video.unsupportedReason) || "").trim() || "当前资源暂不支持下载";
  return `不可下载: ${reason}`;
}
class VideoSelector extends ResourceSelector {
  constructor(options) {
    super({
      ...options,
      emptyText: "未找到视频资源",
      classNames: {
        item: "vd-video-item",
        selected: "selected",
        empty: "vd-empty",
        thumb: "vd-video-thumb",
        checkbox: "vd-checkbox",
        info: "vd-video-info"
      },
      isSelectable: (video) => isVideoSelectable(video),
      getDisabledReason: (video) => getUnselectableReason(video),
      createThumbnail: (video, index, helpers) => {
        const thumb = helpers.createElement("div", { className: "vd-video-thumb" });
        if (video.poster) {
          const imgEl = helpers.createElement("img", {
            src: video.poster,
            alt: video.title || `视频 ${index + 1}`,
            loading: "lazy",
            onerror: () => {
              thumb.classList.add("vd-video-thumb-fallback");
            }
          });
          thumb.appendChild(imgEl);
        } else if (video.type !== "m3u8" && video.type !== "dash" && video.type !== "blob") {
          const videoEl = helpers.createElement("video", {
            src: video.src,
            preload: "metadata",
            muted: "muted",
            playsinline: "playsinline"
          });
          videoEl.onloadedmetadata = () => {
            const nextDuration = Number.isFinite(videoEl.duration) ? Math.round(videoEl.duration) : 0;
            helpers.updateResource({
              duration: nextDuration,
              width: videoEl.videoWidth || video.width || 0,
              height: videoEl.videoHeight || video.height || 0
            });
          };
          videoEl.onerror = () => {
            thumb.classList.add("vd-video-thumb-fallback");
            videoEl.remove();
          };
          thumb.appendChild(videoEl);
        } else {
          thumb.classList.add("vd-video-thumb-fallback");
        }
        const playBadge = helpers.createElement("span", { className: "vd-play-badge" }, "▶");
        thumb.appendChild(playBadge);
        thumb.addEventListener("click", () => {
          helpers.toggle();
        });
        return thumb;
      },
      createInfo: (video, index, helpers) => {
        const info = helpers.createElement("div", { className: "vd-video-info" });
        const filename = getFileName(video.src);
        const editableName = getEditableFileName(video);
        const meta = `${formatType(video.type)}  ·  ${formatDuration(video.duration)}`;
        const nameInput = helpers.createElement("input", {
          className: "vd-filename-input",
          type: "text",
          value: editableName,
          placeholder: "自定义文件名",
          title: "下载文件名（无需扩展名）"
        });
        if (!isVideoSelectable(video)) {
          nameInput.disabled = true;
          nameInput.title = getUnselectableReason(video);
        }
        const commitFileName = () => {
          const value = String(nameInput.value || "").trim();
          helpers.updateResource({ fileName: value || editableName });
        };
        nameInput.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        nameInput.addEventListener("input", commitFileName);
        nameInput.addEventListener("change", commitFileName);
        info.appendChild(nameInput);
        info.appendChild(
          helpers.createElement("span", { className: "vd-filename", title: video.src }, truncate(filename, 26))
        );
        info.appendChild(
          helpers.createElement("span", { className: "vd-meta" }, meta)
        );
        if (!video.supported) {
          info.appendChild(
            helpers.createElement("span", { className: "vd-badge vd-badge-unsupported" }, "暂不支持")
          );
        } else if (video.type === "m3u8") {
          info.appendChild(
            helpers.createElement("span", { className: "vd-badge vd-badge-hls" }, "m3u8")
          );
        }
        return info;
      }
    });
  }
  getSelectedVideos() {
    return this.getSelectedResources();
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
  const existing = document.getElementById("vd-panel");
  if (existing) return existing;
  const panel = createElement("div", { id: "vd-panel", className: "vd-panel" });
  panel.innerHTML = `
    <div class="vd-panel-header">
      <span class="vd-panel-title">🎬 视频批量下载器</span>
      <button class="vd-panel-close" id="vd-close-btn" title="关闭">×</button>
    </div>
    <div class="vd-panel-note">前端仅采集视频关键信息，下载任务由本机后端执行</div>
    <div class="vd-backend-strip">
      <span class="vd-backend-status disconnected" id="vd-backend-status">后端: 未连接</span>
      <button class="vd-btn vd-btn-ghost" id="vd-reconnect">重连后端</button>
    </div>
    <div class="vd-toolbar">
      <button class="vd-btn vd-btn-primary" id="vd-capture" title="快捷键: Ctrl+Shift+V">
        <span>🎯</span> 捕获视频
      </button>
      <button class="vd-btn" id="vd-select-all">全选</button>
      <button class="vd-btn" id="vd-select-none">全不选</button>
      <button class="vd-btn vd-btn-success" id="vd-download" disabled>提交任务</button>
      <button class="vd-btn" id="vd-cleanup-parts">清理 part 目录</button>
      <button class="vd-btn vd-btn-warning" id="vd-clear-storage">清除存储</button>
    </div>
    <div class="vd-video-grid"></div>
    <div class="vd-task-panel">
      <div class="vd-task-header">
        <span>后端任务进度</span>
      </div>
      <div class="vd-task-list" id="vd-task-list"></div>
    </div>
    <div class="vd-panel-footer">
      <span class="vd-status">点击「捕获视频」开始</span>
      <span class="vd-downloaded-count" id="vd-downloaded-count">历史下载数: 0</span>
    </div>
    <div class="vd-resize-handle"></div>
  `;
  document.body.appendChild(panel);
  initDraggable(panel);
  initResizable(panel);
  panel.querySelector("#vd-close-btn").addEventListener("click", () => {
    hidePanel();
  });
  return panel;
}
function initDraggable(panel) {
  const header = panel.querySelector(".vd-panel-header");
  enableDraggable({
    target: panel,
    handle: header,
    bodyCursor: "move",
    removeTransformOnStart: true,
    shouldStart: (e) => {
      return !e.target.closest(".vd-panel-close");
    }
  });
}
function initResizable(panel) {
  const handle = panel.querySelector(".vd-resize-handle");
  if (!handle) return;
  enableResizable({
    target: panel,
    handle,
    minWidth: 300,
    minHeight: 200
  });
}
addStyle(styles);
const SHORTCUT_KEY = "v";
const DOWNLOADED_HISTORY_KEY = (_b = (_a = config.videoDownloader) == null ? void 0 : _a.storageKeys) == null ? void 0 : _b.downloadHistory;
const TERMINAL_STATUSES = /* @__PURE__ */ new Set(["success", "failed", "cancelled"]);
const FRAME_CAPTURE_CHANNEL = "videoDownloader.frameCapture.v1";
const FRAME_CAPTURE_REQUEST = "capture-request";
const FRAME_CAPTURE_RESPONSE = "capture-response";
const FRAME_CAPTURE_TIMEOUT_MS = 1200;
const FRAME_CAPTURE_REQUEST_TTL_MS = FRAME_CAPTURE_TIMEOUT_MS + 1e3;
(function() {
  var _a2, _b2, _c, _d, _e, _f;
  if (window.__videoDownloaderInitialized) {
    return;
  }
  window.__videoDownloaderInitialized = true;
  const isTopWindow = window.top === window.self;
  let currentVideos = [];
  let selectedVideos = [];
  const downloadHistory = [];
  const taskMap = /* @__PURE__ */ new Map();
  const pendingCancelTaskIds = /* @__PURE__ */ new Set();
  const historyRecordedTaskIds = /* @__PURE__ */ new Set();
  const taskPollers = /* @__PURE__ */ new Map();
  const handledCaptureRequestIds = /* @__PURE__ */ new Set();
  let shortcutEnabled = true;
  let wsHandle = null;
  let wsConnected = false;
  const backendClient = new VideoBackendClient({
    baseUrl: (_b2 = (_a2 = config.videoDownloader) == null ? void 0 : _a2.backend) == null ? void 0 : _b2.baseUrl,
    wsUrl: (_d = (_c = config.videoDownloader) == null ? void 0 : _c.backend) == null ? void 0 : _d.wsUrl,
    timeout: (_f = (_e = config.videoDownloader) == null ? void 0 : _e.backend) == null ? void 0 : _f.requestTimeout
  });
  function updateDownloadedCount(downloadedCountText) {
    if (!downloadedCountText) return;
    downloadedCountText.textContent = `历史下载数: ${downloadHistory.length}`;
  }
  function setStatusText(statusText, message) {
    if (!statusText) return;
    statusText.textContent = message;
  }
  function setBackendStatus(statusEl, type, message) {
    if (!statusEl) return;
    statusEl.classList.remove("connected", "disconnected", "polling");
    statusEl.classList.add(type);
    statusEl.textContent = message;
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
      logger.info("已加载视频下载历史", { count: downloadHistory.length });
    } catch (error) {
      logger.error("读取视频下载历史失败", error);
      updateDownloadedCount(downloadedCountText);
    }
  }
  async function saveDownloadHistory() {
    try {
      await setItem(DOWNLOADED_HISTORY_KEY, downloadHistory);
      logger.debug("视频下载历史已保存", { count: downloadHistory.length });
    } catch (error) {
      logger.error("保存视频下载历史失败", error);
    }
  }
  function getTaskStatusLabel(status) {
    switch (status) {
      case "queued":
        return "排队中";
      case "running":
        return "执行中";
      case "cancelling":
        return "取消中";
      case "success":
        return "已完成";
      case "failed":
        return "有失败";
      case "cancelled":
        return "已取消";
      default:
        return status || "未知";
    }
  }
  function getTaskProgressText(task) {
    if (!task) return "等待后端更新状态";
    if (task.status === "cancelling" || task.cancelRequested) {
      return task.message || "正在停止下载并清理临时文件...";
    }
    const rawLine = String(task.progressText || "").trim();
    if (task.status === "running" && rawLine) {
      return rawLine;
    }
    if (TERMINAL_STATUSES.has(task.status)) {
      return task.message || "任务已结束";
    }
    if (rawLine) {
      return rawLine;
    }
    return "等待后端进度输出...";
  }
  function isTaskCancellationInProgress(task) {
    if (!task || !task.id) return false;
    return pendingCancelTaskIds.has(task.id) || task.status === "cancelling" || Boolean(task.cancelRequested);
  }
  function updateTaskHistory(task, downloadedCountText) {
    if (!task || !TERMINAL_STATUSES.has(task.status)) {
      return;
    }
    if (historyRecordedTaskIds.has(task.id)) {
      return;
    }
    const successfulItems = (task.items || []).filter((item) => item.status === "success");
    if (successfulItems.length === 0) {
      historyRecordedTaskIds.add(task.id);
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    successfulItems.forEach((item) => {
      if (item.src) {
        downloadHistory.push({
          url: item.src,
          downloadedAt: now
        });
      }
    });
    historyRecordedTaskIds.add(task.id);
    updateDownloadedCount(downloadedCountText);
    saveDownloadHistory();
  }
  function renderTaskList(taskListEl) {
    if (!taskListEl) return;
    taskListEl.innerHTML = "";
    const tasks = Array.from(taskMap.values()).map((task, index) => ({ task, index })).sort((a, b) => {
      const aTime = Date.parse(a.task.createdAt || 0) || 0;
      const bTime = Date.parse(b.task.createdAt || 0) || 0;
      if (bTime !== aTime) {
        return bTime - aTime;
      }
      return a.index - b.index;
    }).map(({ task }) => task);
    if (tasks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "vd-task-empty";
      empty.textContent = "暂无任务，选择视频后点击「提交任务」";
      taskListEl.appendChild(empty);
      return;
    }
    tasks.forEach((task) => {
      const card = document.createElement("div");
      card.className = "vd-task-item";
      const rowTop = document.createElement("div");
      rowTop.className = "vd-task-row";
      const taskIdText = document.createElement("span");
      taskIdText.className = "vd-task-id";
      taskIdText.textContent = String(task.id || "-");
      const statusTag = document.createElement("span");
      statusTag.className = `vd-task-status ${task.status || "queued"}`;
      statusTag.textContent = getTaskStatusLabel(task.status);
      rowTop.appendChild(taskIdText);
      rowTop.appendChild(statusTag);
      card.appendChild(rowTop);
      const message = document.createElement("div");
      message.className = "vd-task-message";
      message.textContent = getTaskProgressText(task);
      card.appendChild(message);
      const rowBottom = document.createElement("div");
      rowBottom.className = "vd-task-row";
      const output = document.createElement("span");
      output.className = "vd-task-id";
      output.textContent = `目录: ${task.outputDir || "-"}`;
      const actions = document.createElement("div");
      actions.className = "vd-task-actions";
      const openBtn = document.createElement("button");
      openBtn.className = "vd-task-open";
      openBtn.dataset.action = "open-task-dir";
      openBtn.dataset.taskId = task.id;
      openBtn.textContent = "打开目录";
      actions.appendChild(openBtn);
      if (!TERMINAL_STATUSES.has(task.status)) {
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "vd-task-cancel";
        cancelBtn.dataset.action = "cancel-task";
        cancelBtn.dataset.taskId = task.id;
        if (isTaskCancellationInProgress(task)) {
          cancelBtn.disabled = true;
          cancelBtn.classList.add("is-processing");
          cancelBtn.textContent = "取消执行中...";
        } else {
          cancelBtn.textContent = "取消任务";
        }
        actions.appendChild(cancelBtn);
      }
      rowBottom.appendChild(output);
      rowBottom.appendChild(actions);
      card.appendChild(rowBottom);
      taskListEl.appendChild(card);
    });
  }
  function upsertTask(task, taskListEl, downloadedCountText) {
    if (!task || !task.id) return;
    taskMap.set(task.id, task);
    pendingCancelTaskIds.delete(task.id);
    if (TERMINAL_STATUSES.has(task.status)) {
      stopTaskPolling(task.id);
    }
    updateTaskHistory(task, downloadedCountText);
    renderTaskList(taskListEl);
  }
  function stopTaskPolling(taskId) {
    const timer = taskPollers.get(taskId);
    if (timer) {
      clearInterval(timer);
      taskPollers.delete(taskId);
    }
  }
  function stopAllTaskPolling() {
    taskPollers.forEach((timer) => clearInterval(timer));
    taskPollers.clear();
  }
  function startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText) {
    var _a3, _b3;
    if (!taskId || taskPollers.has(taskId)) return;
    const pollingInterval = (_b3 = (_a3 = config.videoDownloader) == null ? void 0 : _a3.backend) == null ? void 0 : _b3.pollingInterval;
    const timer = setInterval(async () => {
      try {
        const task = await backendClient.getTask(taskId);
        upsertTask(task, taskListEl, downloadedCountText);
        if (TERMINAL_STATUSES.has(task.status)) {
          stopTaskPolling(taskId);
        }
      } catch (error) {
        const message = String((error == null ? void 0 : error.message) || "");
        if (message.includes("请求失败: 404")) {
          stopTaskPolling(taskId);
          const staleTask = taskMap.get(taskId);
          if (staleTask && !TERMINAL_STATUSES.has(staleTask.status)) {
            upsertTask(
              {
                ...staleTask,
                status: "failed",
                message: "任务不存在，可能后端已重启或任务已清理",
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              },
              taskListEl,
              downloadedCountText
            );
          }
          logger.warn("任务不存在，停止轮询", { taskId });
          return;
        }
        setBackendStatus(backendStatusEl, "polling", "后端: 轮询中");
        logger.warn("轮询任务状态失败", { taskId, error: (error == null ? void 0 : error.message) || error });
        setStatusText(statusText, `任务轮询失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
      }
    }, pollingInterval);
    taskPollers.set(taskId, timer);
  }
  function startPollingActiveTasks(statusText, backendStatusEl, taskListEl, downloadedCountText) {
    taskMap.forEach((task) => {
      if (!TERMINAL_STATUSES.has(task.status)) {
        startTaskPolling(task.id, statusText, backendStatusEl, taskListEl, downloadedCountText);
      }
    });
  }
  async function refreshTaskList(taskListEl, downloadedCountText) {
    const tasks = await backendClient.listTasks();
    const serverTaskIds = new Set(tasks.map((task) => task.id).filter(Boolean));
    Array.from(taskMap.keys()).forEach((taskId) => {
      if (serverTaskIds.has(taskId)) {
        return;
      }
      stopTaskPolling(taskId);
      const staleTask = taskMap.get(taskId);
      if (staleTask && !TERMINAL_STATUSES.has(staleTask.status)) {
        pendingCancelTaskIds.delete(taskId);
        taskMap.set(taskId, {
          ...staleTask,
          status: "failed",
          message: "任务不存在，可能后端已重启或任务已清理",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    tasks.forEach((task) => upsertTask(task, taskListEl, downloadedCountText));
    renderTaskList(taskListEl);
  }
  function toBackendVideoItem(video) {
    const fallbackFileName = getFileNameFromUrl((video == null ? void 0 : video.src) || "");
    const editedFileName = String((video == null ? void 0 : video.fileName) || "").trim();
    return {
      src: video.src,
      type: video.type || "unknown",
      title: video.title || "",
      duration: Number(video.duration || 0) || 0,
      mimeType: video.mimeType || "",
      fileName: editedFileName || fallbackFileName,
      requestHeaders: buildRequestHeaders()
    };
  }
  function buildRequestHeaders() {
    var _a3;
    const headers = {};
    const userAgent = String((navigator == null ? void 0 : navigator.userAgent) || "").trim();
    const referer = String(((_a3 = window == null ? void 0 : window.location) == null ? void 0 : _a3.href) || "").trim();
    const cookie = String((document == null ? void 0 : document.cookie) || "").trim();
    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }
    if (referer) {
      headers.Referer = referer;
    }
    if (cookie) {
      headers.Cookie = cookie;
    }
    return headers;
  }
  function getFileNameFromUrl(url) {
    var _a3;
    const raw = ((_a3 = String(url || "").split("/").pop()) == null ? void 0 : _a3.split("?")[0]) || "";
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).replace(/\.[0-9A-Za-z]{1,6}$/, "");
    } catch {
      return raw.replace(/\.[0-9A-Za-z]{1,6}$/, "");
    }
  }
  function buildTaskPayload(videos) {
    return {
      videos: videos.map((video) => toBackendVideoItem(video)),
      pageUrl: window.location.href,
      pageTitle: document.title
    };
  }
  function isFrameCaptureMessage(data, type) {
    return data && typeof data === "object" && data.channel === FRAME_CAPTURE_CHANNEL && data.type === type && typeof data.requestId === "string";
  }
  function getDirectChildFrameWindows() {
    const nodes = document.querySelectorAll("iframe, frame");
    const windows = [];
    nodes.forEach((node) => {
      if (node == null ? void 0 : node.contentWindow) {
        windows.push(node.contentWindow);
      }
    });
    return windows;
  }
  function broadcastCaptureRequestToChildFrames(requestId) {
    const payload = {
      channel: FRAME_CAPTURE_CHANNEL,
      type: FRAME_CAPTURE_REQUEST,
      requestId
    };
    getDirectChildFrameWindows().forEach((frameWindow) => {
      try {
        frameWindow.postMessage(payload, "*");
      } catch (error) {
        logger.debug("向子 frame 分发捕获请求失败", error);
      }
    });
  }
  function captureCurrentFrameVideos() {
    const capture = new VideoCapture();
    const videos = capture.getAllVideos();
    return videos.map((video) => ({
      ...video,
      frameUrl: window.location.href,
      frameTitle: document.title || ""
    }));
  }
  function normalizeCapturedVideo(video, frameUrl = "", frameTitle = "") {
    if (!video || typeof video !== "object" || !video.src) {
      return null;
    }
    return {
      ...video,
      frameUrl: String(video.frameUrl || frameUrl || ""),
      frameTitle: String(video.frameTitle || frameTitle || "")
    };
  }
  function pickBetterVideo(existing, candidate) {
    if (!existing) return candidate;
    if ((candidate == null ? void 0 : candidate.supported) && (existing == null ? void 0 : existing.supported) === false) {
      return candidate;
    }
    if ((candidate == null ? void 0 : candidate.supported) === false && (existing == null ? void 0 : existing.supported)) {
      return existing;
    }
    const existingScore = Number((existing == null ? void 0 : existing.duration) || 0) + Number((existing == null ? void 0 : existing.width) || 0) * Number((existing == null ? void 0 : existing.height) || 0);
    const candidateScore = Number((candidate == null ? void 0 : candidate.duration) || 0) + Number((candidate == null ? void 0 : candidate.width) || 0) * Number((candidate == null ? void 0 : candidate.height) || 0);
    return candidateScore > existingScore ? candidate : existing;
  }
  function dedupeCapturedVideos(videos) {
    const map = /* @__PURE__ */ new Map();
    videos.forEach((video) => {
      const normalized = normalizeCapturedVideo(video);
      if (!normalized) return;
      const key = String(normalized.src || "").trim();
      if (!key) return;
      const previous = map.get(key);
      map.set(key, pickBetterVideo(previous, normalized));
    });
    return Array.from(map.values());
  }
  async function captureVideosFromAllFrames(timeoutMs = FRAME_CAPTURE_TIMEOUT_MS) {
    const requestId = `vd_capture_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const localVideos = captureCurrentFrameVideos();
    const collected = [...localVideos];
    const onMessage = (event) => {
      const data = event == null ? void 0 : event.data;
      if (!isFrameCaptureMessage(data, FRAME_CAPTURE_RESPONSE)) return;
      if (data.requestId !== requestId) return;
      if (!Array.isArray(data.videos)) return;
      data.videos.forEach((video) => {
        const normalized = normalizeCapturedVideo(video, data.frameUrl, data.frameTitle);
        if (normalized) {
          collected.push(normalized);
        }
      });
    };
    window.addEventListener("message", onMessage);
    try {
      broadcastCaptureRequestToChildFrames(requestId);
      await new Promise((resolve) => {
        window.setTimeout(resolve, timeoutMs);
      });
    } finally {
      window.removeEventListener("message", onMessage);
    }
    const merged = dedupeCapturedVideos(collected);
    logger.info("跨 frame 捕获完成", {
      localCount: localVideos.length,
      totalCount: merged.length,
      remoteCount: Math.max(0, merged.length - localVideos.length)
    });
    return merged;
  }
  function setupFrameCaptureBridge() {
    window.addEventListener("message", (event) => {
      const data = event == null ? void 0 : event.data;
      if (!isFrameCaptureMessage(data, FRAME_CAPTURE_REQUEST)) return;
      const requestId = data.requestId;
      if (handledCaptureRequestIds.has(requestId)) {
        return;
      }
      handledCaptureRequestIds.add(requestId);
      let videos = [];
      try {
        videos = captureCurrentFrameVideos();
      } catch (error) {
        logger.warn("子 frame 捕获视频失败", error);
      }
      broadcastCaptureRequestToChildFrames(requestId);
      try {
        window.top.postMessage(
          {
            channel: FRAME_CAPTURE_CHANNEL,
            type: FRAME_CAPTURE_RESPONSE,
            requestId,
            frameUrl: window.location.href,
            frameTitle: document.title || "",
            videos
          },
          "*"
        );
      } catch (error) {
        logger.warn("子 frame 回传捕获结果失败", error);
      }
      window.setTimeout(() => {
        handledCaptureRequestIds.delete(requestId);
      }, FRAME_CAPTURE_REQUEST_TTL_MS);
    });
  }
  function setupShortcutKey(videoSelector, statusText) {
    document.addEventListener("keydown", async (e) => {
      const key = String(e.key || "").toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === SHORTCUT_KEY) {
        e.preventDefault();
        if (!shortcutEnabled) return;
        shortcutEnabled = false;
        const panel = document.getElementById("vd-panel");
        if (!panel || panel.style.display === "none" || panel.style.display === "") {
          showPanel();
        }
        setStatusText(statusText, "正在跨 frame 捕获视频...");
        try {
          currentVideos = await captureVideosFromAllFrames();
          videoSelector.render(currentVideos);
          setStatusText(statusText, `已捕获 ${currentVideos.length} 个视频资源`);
        } catch (error) {
          logger.error("快捷键捕获视频失败", error);
          setStatusText(statusText, `捕获失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
        }
        setTimeout(() => {
          shortcutEnabled = true;
        }, 500);
      }
    });
  }
  function handleWsMessage(event, statusText, taskListEl, downloadedCountText) {
    if (!event || typeof event !== "object") return;
    if (event.event === "task.list" && Array.isArray(event.tasks)) {
      event.tasks.forEach((task) => upsertTask(task, taskListEl, downloadedCountText));
      return;
    }
    if (event.task) {
      upsertTask(event.task, taskListEl, downloadedCountText);
      if (event.event && event.event.startsWith("task.")) {
        setStatusText(statusText, `后端状态: ${getTaskStatusLabel(event.task.status)}`);
      }
    }
  }
  async function connectTaskStream(backendStatusEl, statusText, taskListEl, downloadedCountText) {
    if (wsHandle) {
      wsHandle.close();
      wsHandle = null;
    }
    setBackendStatus(backendStatusEl, "disconnected", "后端: 连接中");
    const enterPollingFallback = (message, error = null) => {
      wsConnected = false;
      setBackendStatus(backendStatusEl, "polling", message);
      if (error) {
        logger.warn("WebSocket 异常", error);
      }
      startPollingActiveTasks(statusText, backendStatusEl, taskListEl, downloadedCountText);
    };
    wsHandle = backendClient.connectTaskStream({
      onOpen: () => {
        wsConnected = true;
        setBackendStatus(backendStatusEl, "connected", "后端: WebSocket 已连接");
        stopAllTaskPolling();
      },
      onMessage: (event) => {
        handleWsMessage(event, statusText, taskListEl, downloadedCountText);
      },
      onClose: () => {
        enterPollingFallback("后端: WebSocket 断开，切换轮询");
      },
      onError: (error) => {
        enterPollingFallback("后端: 连接异常，切换轮询", error);
      }
    });
  }
  async function init() {
    var _a3, _b3;
    logger.info("videoDownloader 初始化开始", { logLevel: config.logLevel });
    const panel = createPanel();
    const activeEnhancer = getActiveEnhancerName();
    const note = panel.querySelector(".vd-panel-note");
    if (activeEnhancer && note) {
      const displayName = getEnhancerDisplayName(activeEnhancer);
      note.textContent = `支持直链视频与 m3u8 基础下载，当前来源策略：${displayName}`;
    }
    initFloatingButton({ onToggle: togglePanel });
    hidePanel();
    const grid = panel.querySelector(".vd-video-grid");
    const taskListEl = panel.querySelector("#vd-task-list");
    const selectAllBtn = panel.querySelector("#vd-select-all");
    const selectNoneBtn = panel.querySelector("#vd-select-none");
    const downloadBtn = panel.querySelector("#vd-download");
    const cleanupPartDirsBtn = panel.querySelector("#vd-cleanup-parts");
    const clearStorageBtn = panel.querySelector("#vd-clear-storage");
    const captureBtn = panel.querySelector("#vd-capture");
    const reconnectBtn = panel.querySelector("#vd-reconnect");
    const backendStatusEl = panel.querySelector("#vd-backend-status");
    const statusText = panel.querySelector(".vd-status");
    const downloadedCountText = panel.querySelector("#vd-downloaded-count");
    await loadDownloadHistory(downloadedCountText);
    backendClient.setBaseUrl(
      (_b3 = (_a3 = config.videoDownloader) == null ? void 0 : _a3.backend) == null ? void 0 : _b3.baseUrl,
      ""
    );
    const videoSelector = new VideoSelector({
      grid,
      onSelectionChange: (selected) => {
        selectedVideos = selected;
        updateDownloadButton();
      }
    });
    setupShortcutKey(videoSelector, statusText);
    captureBtn.addEventListener("click", async () => {
      logger.info("开始手动捕获视频");
      setStatusText(statusText, "正在跨 frame 捕获视频...");
      try {
        currentVideos = await captureVideosFromAllFrames();
        videoSelector.render(currentVideos);
        setStatusText(statusText, `已捕获 ${currentVideos.length} 个视频资源`);
        logger.info("手动捕获完成", { count: currentVideos.length });
      } catch (error) {
        logger.error("手动捕获失败", error);
        setStatusText(statusText, `捕获失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
      }
    });
    selectAllBtn.addEventListener("click", () => {
      videoSelector.selectAll();
    });
    selectNoneBtn.addEventListener("click", () => {
      videoSelector.selectNone();
    });
    clearStorageBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("确认清除当前脚本的存储记录吗？");
      if (!confirmed) return;
      downloadHistory.length = 0;
      try {
        await setItem(DOWNLOADED_HISTORY_KEY, []);
        updateDownloadedCount(downloadedCountText);
        setStatusText(statusText, "存储已清除");
        logger.info("视频脚本存储已清除");
      } catch (error) {
        setStatusText(statusText, "清除存储失败");
        logger.error("清除视频脚本存储失败", error);
      }
    });
    cleanupPartDirsBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("确认删除所有非当前下载中的 part 目录吗？");
      if (!confirmed) return;
      try {
        const result = await backendClient.cleanupPartDirs();
        const deletedCount = Number((result == null ? void 0 : result.deletedCount) || 0) || 0;
        setStatusText(statusText, `已清理 part 目录: ${deletedCount} 个`);
        logger.info("已清理非运行中的 part 目录", {
          deletedCount,
          deletedDirs: (result == null ? void 0 : result.deletedDirs) || [],
          runningTaskIds: (result == null ? void 0 : result.runningTaskIds) || []
        });
      } catch (error) {
        logger.error("清理 part 目录失败", error);
        setStatusText(statusText, `清理 part 目录失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
      }
    });
    reconnectBtn.addEventListener("click", async () => {
      await connectTaskStream(backendStatusEl, statusText, taskListEl, downloadedCountText);
      try {
        await refreshTaskList(taskListEl, downloadedCountText);
      } catch (error) {
        logger.warn("刷新任务列表失败", error);
      }
    });
    taskListEl.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const taskId = target.dataset.taskId;
      if (!taskId) return;
      const action = target.dataset.action;
      if (action === "open-task-dir") {
        try {
          const result = await backendClient.openDirectory({ taskId });
          setStatusText(statusText, (result == null ? void 0 : result.message) || "已请求后端打开目录");
        } catch (error) {
          logger.error("打开任务目录失败", error);
          setStatusText(statusText, `打开目录失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
        }
        return;
      }
      if (action !== "cancel-task") return;
      const currentTask = taskMap.get(taskId);
      if (currentTask && isTaskCancellationInProgress(currentTask)) {
        setStatusText(statusText, `任务 ${taskId} 的取消正在执行中，请稍候`);
        return;
      }
      pendingCancelTaskIds.add(taskId);
      renderTaskList(taskListEl);
      setStatusText(statusText, `任务 ${taskId} 正在取消...`);
      try {
        const result = await backendClient.cancelTask(taskId);
        const cancelled = Boolean(result == null ? void 0 : result.cancelled) || (result == null ? void 0 : result.status) === "cancelled";
        const fallbackMessage = cancelled ? "任务已取消" : "取消请求已发送，等待后端完成";
        setStatusText(statusText, `任务 ${taskId}: ${(result == null ? void 0 : result.message) || fallbackMessage}`);
        if (!wsConnected && !taskPollers.has(taskId)) {
          startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText);
        }
      } catch (error) {
        logger.error("取消任务失败", error);
        setStatusText(statusText, `取消任务失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
        if (!wsConnected && !taskPollers.has(taskId)) {
          startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText);
        }
      } finally {
        pendingCancelTaskIds.delete(taskId);
        renderTaskList(taskListEl);
      }
    });
    downloadBtn.addEventListener("click", async () => {
      if (selectedVideos.length === 0) {
        alert("请先选择要下载的视频");
        return;
      }
      const videosToSubmit = selectedVideos.filter(
        (video) => (video == null ? void 0 : video.src) && (video == null ? void 0 : video.supported) !== false && !String(video.src).startsWith("blob:")
      );
      if (videosToSubmit.length === 0) {
        alert("当前选中资源都不支持提交到后端，请至少选择一个可下载资源");
        return;
      }
      logger.info("提交后端视频任务", {
        count: videosToSubmit.length
      });
      setStatusText(statusText, `正在提交任务（${videosToSubmit.length} 个）...`);
      try {
        let submittedCount = 0;
        const failedMessages = [];
        for (const video of videosToSubmit) {
          const payload = buildTaskPayload([video]);
          try {
            const result = await backendClient.createTask(payload);
            const taskId = result == null ? void 0 : result.taskId;
            if (!taskId) {
              throw new Error("后端未返回 taskId");
            }
            const task = await backendClient.getTask(taskId);
            upsertTask(task, taskListEl, downloadedCountText);
            submittedCount += 1;
            if (!wsConnected) {
              startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText);
            }
          } catch (singleError) {
            const failedName = String((video == null ? void 0 : video.fileName) || getFileNameFromUrl((video == null ? void 0 : video.src) || "") || "未命名");
            failedMessages.push(`${failedName}: ${(singleError == null ? void 0 : singleError.message) || "未知错误"}`);
          }
        }
        if (failedMessages.length === 0) {
          setStatusText(statusText, `任务已提交: ${submittedCount} 个`);
        } else if (submittedCount > 0) {
          setStatusText(statusText, `部分提交失败（成功 ${submittedCount}，失败 ${failedMessages.length}）`);
          alert(`以下任务提交失败:
${failedMessages.join("\n")}`);
        } else {
          throw new Error(failedMessages.join("; "));
        }
      } catch (error) {
        logger.error("任务提交失败", error);
        setStatusText(statusText, `任务提交失败: ${(error == null ? void 0 : error.message) || "未知错误"}`);
      }
    });
    function updateDownloadButton() {
      const count = selectedVideos.length;
      downloadBtn.disabled = count === 0;
      downloadBtn.textContent = count === 0 ? "提交任务" : `提交任务 (${count})`;
    }
    await connectTaskStream(backendStatusEl, statusText, taskListEl, downloadedCountText);
    try {
      await refreshTaskList(taskListEl, downloadedCountText);
    } catch (error) {
      logger.warn("初始化任务列表失败", error);
      setStatusText(statusText, `后端暂不可用: ${(error == null ? void 0 : error.message) || "未知错误"}`);
      setBackendStatus(backendStatusEl, "polling", "后端: 请求失败，轮询模式");
    }
    updateDownloadButton();
    logger.info("videoDownloader 初始化完成", {
      downloadedCount: downloadHistory.length
    });
  }
  function startInit() {
    init().catch((error) => {
      logger.error("videoDownloader 初始化失败", error);
    });
  }
  setupFrameCaptureBridge();
  if (!isTopWindow) {
    logger.debug("videoDownloader 已在子 frame 启用捕获桥接");
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startInit);
  } else {
    startInit();
  }
})();
