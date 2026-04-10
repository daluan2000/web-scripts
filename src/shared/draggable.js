/**
 * 通用拖拽工具
 * 支持点击/拖拽区分、视口边界限制和拖拽生命周期回调
 */

/**
 * @typedef {Object} DraggableOptions
 * @property {HTMLElement} target - 被拖拽元素
 * @property {HTMLElement} [handle=target] - 拖拽手柄元素
 * @property {Function} [onClick] - 点击（非拖拽）回调
 * @property {Function} [shouldStart] - 是否允许开始拖拽
 * @property {number} [dragThreshold=4] - 判定为拖拽的最小位移（px）
 * @property {boolean} [clampToViewport=true] - 是否限制在视口内
 * @property {string} [dragClassName] - 拖拽时附加的类名
 * @property {string} [bodyCursor] - 拖拽时 body 光标样式
 * @property {boolean} [removeTransformOnStart=false] - 开始拖拽时是否移除 transform
 * @property {Function} [onDragStart] - 开始拖拽回调
 * @property {Function} [onDrag] - 拖拽中回调
 * @property {Function} [onDragEnd] - 结束拖拽回调
 */

/**
 * 启用元素拖拽
 * @param {DraggableOptions} options - 配置项
 * @returns {Function} 清理监听器函数
 */
export function enableDraggable(options) {
  const {
    target,
    handle = target,
    onClick,
    shouldStart,
    dragThreshold = 4,
    clampToViewport = true,
    dragClassName,
    bodyCursor = '',
    removeTransformOnStart = false,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options || {};

  if (!target || !handle) {
    return () => {};
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
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }

    if (typeof shouldStart === 'function' && !shouldStart(e)) {
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
    target.style.right = 'auto';
    target.style.bottom = 'auto';

    if (removeTransformOnStart) {
      target.style.transform = 'none';
    }

    if (dragClassName) {
      target.classList.add(dragClassName);
    }

    handle.setPointerCapture(pointerId);
    document.body.style.userSelect = 'none';
    if (bodyCursor) {
      document.body.style.cursor = bodyCursor;
    }

    if (typeof onDragStart === 'function') {
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

    if (typeof onDrag === 'function') {
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

    document.body.style.userSelect = '';
    if (bodyCursor) {
      document.body.style.cursor = '';
    }

    if (typeof onDragEnd === 'function') {
      onDragEnd(e);
    }
  };

  handle.addEventListener('click', clickHandler);
  handle.addEventListener('pointerdown', pointerDownHandler);
  handle.addEventListener('pointermove', pointerMoveHandler);
  handle.addEventListener('pointerup', stopDragging);
  handle.addEventListener('pointercancel', stopDragging);

  return () => {
    handle.removeEventListener('click', clickHandler);
    handle.removeEventListener('pointerdown', pointerDownHandler);
    handle.removeEventListener('pointermove', pointerMoveHandler);
    handle.removeEventListener('pointerup', stopDragging);
    handle.removeEventListener('pointercancel', stopDragging);
  };
}
