/**
 * DOM 操作工具模块
 * 提供常用的 DOM 操作辅助函数
 */

/**
 * 等待元素出现在 DOM 中
 * @param {string} selector - CSS 选择器
 * @param {object} options - 配置选项
 * @returns {Promise<Element>} - 元素 Promise
 */
export function waitForElement(selector, options = {}) {
  const { timeout = 5000, parent = document } = options;

  return new Promise((resolve, reject) => {
    const element = parent.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = parent.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(parent instanceof Document ? parent.body : parent, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`等待元素 ${selector} 超时`));
    }, timeout);
  });
}

/**
 * 创建元素
 * @param {string} tag - 标签名
 * @param {object} attrs - 属性对象
 * @param {string} html - HTML 内容（可选）
 * @param {string} text - 文本内容（可选，与 html 二选一）
 * @returns {HTMLElement} - 创建的元素
 */
export function createElement(tag, attrs = {}, html = '', text = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on')) {
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

/**
 * 添加样式到页面
 * @param {string} css - CSS 样式字符串
 * @returns {HTMLStyleElement} - 创建的 style 元素
 */
export function addStyle(css) {
  const style = createElement('style', { type: 'text/css' });
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/**
 * 移除元素
 * @param {Element} element - 要移除的元素
 */
export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * 检查元素是否在视口内
 * @param {Element} element - 要检查的元素
 * @returns {boolean}
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
