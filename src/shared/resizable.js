/**
 * 为元素启用右下角缩放。
 * @param {object} options
 * @param {HTMLElement} options.target - 需要缩放的目标元素
 * @param {HTMLElement} [options.handle] - 触发缩放的手柄，默认使用 target
 * @param {number} [options.minWidth=300]
 * @param {number} [options.minHeight=200]
 * @param {(event: MouseEvent) => void} [options.onResizeStart]
 * @param {(event: MouseEvent, size: { width: number, height: number }) => void} [options.onResize]
 * @param {(event: MouseEvent) => void} [options.onResizeEnd]
 * @returns {() => void} 清理监听器的方法
 */
export function enableResizable(options = {}) {
  const {
    target,
    handle = target,
    minWidth = 300,
    minHeight = 200,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  if (!target || !handle) {
    return () => {};
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

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';
    onResizeStart?.(event);
  };

  const onMouseMove = (event) => {
    if (!isResizing) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    const width = Math.max(minWidth, startWidth + dx);
    const height = Math.max(minHeight, startHeight + dy);

    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    onResize?.(event, { width, height });
  };

  const onMouseUp = (event) => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    onResizeEnd?.(event);
  };

  handle.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    handle.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}