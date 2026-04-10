import { createElement } from '@/shared/dom.js';
import { enableDraggable } from '@/shared/draggable.js';
import { enableResizable } from '@/shared/resizable.js';
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
  if (!handle) return;

  enableResizable({
    target: panel,
    handle,
    minWidth: 300,
    minHeight: 200,
  });
}
