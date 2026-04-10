import { createElement } from '@/shared/dom.js';
import { enableDraggable } from '@/shared/draggable.js';

/**
 * 悬浮按钮模块
 * 提供展开/折叠面板的悬浮按钮
 */

/**
 * 初始化悬浮按钮
 * @param {object} options - 配置选项
 * @param {Function} options.onToggle - 切换面板回调
 */
export function initFloatingButton(options) {
  const button = createElement('div', {
    id: 'id-floating-btn',
    title: '图片批量下载器',
  }, `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>
  `);

  document.body.appendChild(button);

  enableDraggable({
    target: button,
    onClick: () => options.onToggle(),
    dragClassName: 'dragging',
  });
}

/**
 * 显示面板
 */
export function showPanel() {
  const panel = document.getElementById('id-panel');
  if (panel) {
    panel.style.display = 'flex';
    panel.style.opacity = '1';
  }
  const button = document.getElementById('id-floating-btn');
  if (button) {
    button.classList.add('active');
  }
}

/**
 * 隐藏面板
 */
export function hidePanel() {
  const panel = document.getElementById('id-panel');
  if (panel) {
    panel.style.display = 'none';
  }
  const button = document.getElementById('id-floating-btn');
  if (button) {
    button.classList.remove('active');
  }
}

/**
 * 切换面板显示状态
 */
export function togglePanel() {
  const panel = document.getElementById('id-panel');
  if (!panel) return;

  if (panel.style.display === 'none' || panel.style.display === '') {
    showPanel();
  } else {
    hidePanel();
  }
}
