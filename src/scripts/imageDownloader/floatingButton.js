import { createElement } from '@/shared/dom.js';
import { enableDraggable } from '@/shared/draggable.js';

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
  button.style.right = 'auto';
  button.style.bottom = 'auto';
}

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
  const existing = document.getElementById('id-floating-btn');
  if (existing) {
    return existing;
  }

  const button = createElement('div', {
    id: 'id-floating-btn',
    title: '图片批量下载器',
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
    dragClassName: 'dragging',
    onDragEnd: () => {
      updateButtonRatio(button);
    },
  });

  requestAnimationFrame(() => {
    updateButtonRatio(button);
  });

  window.addEventListener('resize', () => {
    applyRatioPosition(button);
  });

  return button;
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
