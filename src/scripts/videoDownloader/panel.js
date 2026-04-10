import { createElement } from '@/shared/dom.js';
import { enableDraggable } from '@/shared/draggable.js';
import { hidePanel } from './floatingButton.js';

/**
 * 创建主面板
 * @returns {HTMLElement}
 */
export function createPanel() {
  const existing = document.getElementById('vd-panel');
  if (existing) return existing;

  const panel = createElement('div', { id: 'vd-panel', className: 'vd-panel' });
  panel.innerHTML = `
    <div class="vd-panel-header">
      <span class="vd-panel-title">🎬 视频批量下载器</span>
      <button class="vd-panel-close" id="vd-close-btn" title="关闭">×</button>
    </div>
    <div class="vd-panel-note">支持直链视频与 m3u8 基础下载，blob / dash / drm 暂不支持</div>
    <div class="vd-toolbar">
      <button class="vd-btn vd-btn-primary" id="vd-capture" title="快捷键: Ctrl+Shift+V">
        <span>🎯</span> 捕获视频
      </button>
      <button class="vd-btn" id="vd-select-all">全选</button>
      <button class="vd-btn" id="vd-select-none">全不选</button>
      <button class="vd-btn vd-btn-success" id="vd-download" disabled>下载选中</button>
      <button class="vd-btn vd-btn-warning" id="vd-clear-storage">清除存储</button>
      <div class="vd-toolbar-spacer"></div>
      <label class="vd-prefix-label">
        文件前缀:
        <input type="text" id="vd-prefix" class="vd-input" placeholder="如: video" />
      </label>
    </div>
    <div class="vd-video-grid"></div>
    <div class="vd-panel-footer">
      <span class="vd-status">点击「捕获视频」开始</span>
      <span class="vd-downloaded-count" id="vd-downloaded-count">历史下载数: 0</span>
      <div class="vd-resize-handle"></div>
    </div>
  `;

  document.body.appendChild(panel);

  initDraggable(panel);
  initResizable(panel);

  panel.querySelector('#vd-close-btn').addEventListener('click', () => {
    hidePanel();
  });

  return panel;
}

function initDraggable(panel) {
  const header = panel.querySelector('.vd-panel-header');
  enableDraggable({
    target: panel,
    handle: header,
    bodyCursor: 'move',
    removeTransformOnStart: true,
    shouldStart: (e) => {
      return !e.target.closest('.vd-panel-close');
    },
  });
}

function initResizable(panel) {
  const handle = panel.querySelector('.vd-resize-handle');
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = panel.offsetWidth;
    startHeight = panel.offsetHeight;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newWidth = Math.max(320, startWidth + dx);
    const newHeight = Math.max(220, startHeight + dy);

    panel.style.width = `${newWidth}px`;
    panel.style.height = `${newHeight}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  });
}
