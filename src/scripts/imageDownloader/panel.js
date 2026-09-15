import { createElement, removeElement } from '@/shared/dom.js';
import { enableDraggable } from '@/shared/draggable.js';
import { enableResizable } from '@/shared/resizable.js';
import { showPanel, hidePanel } from './floatingButton.js';

/**
 * 创建主面板
 * @returns {HTMLElement} 面板元素
 */
export function createPanel() {
  // 如果已存在则返回
  const existing = document.getElementById('id-panel');
  if (existing) return existing;

  const panel = createElement('div', { id: 'id-panel', className: 'id-panel' });
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
    <div class="id-size-filter" aria-label="图片尺寸筛选">
      <div class="id-size-filter-header">
        <span class="id-size-filter-title">尺寸筛选</span>
        <span class="id-size-filter-summary" id="id-size-filter-summary">展示 0/0 · 尺寸未知 0</span>
      </div>
      <div class="id-size-filter-controls">
        <div class="id-size-filter-group">
          <span class="id-size-filter-group-label">宽度</span>
          <div class="id-size-range-control">
            <input type="number" id="id-min-width" class="id-size-input" min="1" step="1" placeholder="最小" aria-label="最小宽度" />
            <span class="id-size-range-separator">至</span>
            <input type="number" id="id-max-width" class="id-size-input" min="1" step="1" placeholder="最大" aria-label="最大宽度" />
            <span class="id-size-unit">px</span>
          </div>
        </div>
        <div class="id-size-filter-group">
          <span class="id-size-filter-group-label">高度</span>
          <div class="id-size-range-control">
            <input type="number" id="id-min-height" class="id-size-input" min="1" step="1" placeholder="最小" aria-label="最小高度" />
            <span class="id-size-range-separator">至</span>
            <input type="number" id="id-max-height" class="id-size-input" min="1" step="1" placeholder="最大" aria-label="最大高度" />
            <span class="id-size-unit">px</span>
          </div>
        </div>
        <div class="id-size-filter-actions">
          <label class="id-switch-label id-include-unknown-label" title="尺寸未知的图片不受宽高条件限制">
            <input type="checkbox" id="id-include-unknown" checked />
            包含未知尺寸
          </label>
          <button type="button" class="id-btn id-size-filter-reset" id="id-reset-size-filter">重置</button>
        </div>
      </div>
      <span class="id-size-filter-error" id="id-size-filter-error" role="alert"></span>
    </div>
    <div class="id-image-grid"></div>
    <div class="id-panel-footer">
      <span class="id-status">点击「捕获图片」开始</span>
      <span class="id-downloaded-count" id="id-downloaded-count">历史下载数: 0</span>
    </div>
    <div class="id-resize-handle"></div>
  `;

  document.body.appendChild(panel);

  // 初始化拖拽功能
  initDraggable(panel);

  // 初始化改变大小功能
  initResizable(panel);

  // 关闭按钮 - 直接隐藏面板
  panel.querySelector('#id-close-btn').addEventListener('click', () => {
    hidePanel();
  });

  return panel;
}

/**
 * 初始化拖拽功能
 * @param {HTMLElement} panel - 面板元素
 */
function initDraggable(panel) {
  const header = panel.querySelector('.id-panel-header');
  enableDraggable({
    target: panel,
    handle: header,
    bodyCursor: 'move',
    removeTransformOnStart: true,
    shouldStart: (e) => {
      // 不允许在关闭按钮上拖拽
      return !e.target.closest('.id-panel-close');
    },
  });
}

/**
 * 初始化改变大小功能
 * @param {HTMLElement} panel - 面板元素
 */
function initResizable(panel) {
  const handle = panel.querySelector('.id-resize-handle');
  if (!handle) return;

  enableResizable({
    target: panel,
    handle,
    minWidth: 300,
    minHeight: 200,
  });
}

/**
 * 创建图片网格容器
 * @returns {HTMLElement} 网格容器
 */
export function createImageGrid() {
  const grid = document.createElement('div');
  grid.className = 'id-image-grid';
  return grid;
}

/**
 * 创建工具栏
 * @param {object} handlers - 事件处理器
 * @returns {HTMLElement} 工具栏元素
 */
export function createToolbar(handlers = {}) {
  const toolbar = document.createElement('div');
  toolbar.className = 'id-toolbar';
  toolbar.innerHTML = `
    <button class="id-btn id-btn-primary" id="id-capture">🔍 捕获图片</button>
    <label class="id-switch-label id-auto-capture-label" id="id-auto-capture-label">
      <input type="checkbox" id="id-auto-capture-toggle" />
      自动捕获
    </label>
    <button class="id-btn" id="id-select-all">全选</button>
    <button class="id-btn" id="id-select-none">全不选</button>
    <button class="id-btn" id="id-clear-captured">清空捕获</button>
    <button class="id-btn id-btn-success" id="id-download" disabled>下载选中</button>
  `;
  return toolbar;
}
