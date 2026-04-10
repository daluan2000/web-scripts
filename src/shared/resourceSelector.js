import { createElement } from './dom.js';

/**
 * 通用资源选择器
 * 通过传入渲染器实现图片/视频等资源的统一选择交互。
 */
export class ResourceSelector {
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
    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.emptyText = options.emptyText || '未找到资源';
    this.classNames = {
      item: 'rs-item',
      selected: 'selected',
      empty: 'rs-empty',
      thumb: 'rs-thumb',
      checkbox: 'rs-checkbox',
      info: 'rs-info',
      ...options.classNames,
    };

    this.createThumbnail = options.createThumbnail || this.defaultCreateThumbnail.bind(this);
    this.createInfo = options.createInfo || this.defaultCreateInfo.bind(this);
    this.isSelectable = options.isSelectable || (() => true);
    this.getDisabledReason = options.getDisabledReason || (() => '当前资源不可选');

    this.selected = new Set();
    this.resources = [];
  }

  /**
   * 渲染资源列表
   * @param {Array} resources - 资源数组
   */
  render(resources) {
    this.resources = resources;
    this.selected.clear();
    this.grid.innerHTML = '';

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
      item.title = reason || '';
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
    return Array.from(this.selected)
      .filter((index) => index >= 0 && index < this.resources.length)
      .filter((index) => this.isSelectable(this.resources[index], index))
      .map((index) => this.resources[index]);
  }

  createResourceItem(resource, index) {
    const item = createElement('div', {
      className: this.classNames.item,
      dataset: { index },
    });

    if (!this.isSelectable(resource, index)) {
      item.classList.add('unselectable');
      item.title = this.getDisabledReason(resource, index) || '';
      item.setAttribute('aria-disabled', 'true');
    }

    const helpers = {
      toggle: () => this.toggle(index),
      createElement,
      updateResource: (patch) => {
        if (!patch || typeof patch !== 'object') return;
        if (this.resources[index] && typeof this.resources[index] === 'object') {
          Object.assign(this.resources[index], patch);
          return;
        }

        this.resources[index] = {
          ...patch,
        };
      },
    };

    const thumb = this.createThumbnail(resource, index, helpers);
    if (thumb) {
      item.appendChild(thumb);
    }

    const checkbox = createElement(
      'div',
      {
        className: this.classNames.checkbox,
        onClick: (e) => {
          e.stopPropagation();
          this.toggle(index);
        },
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
    const thumb = createElement('div', { className: this.classNames.thumb });
    const imgEl = createElement('img', {
      src: resource?.src || '',
      alt: `资源 ${index + 1}`,
      loading: 'lazy',
    });

    thumb.appendChild(imgEl);
    thumb.addEventListener('click', () => helpers.toggle());
    return thumb;
  }

  defaultCreateInfo(resource) {
    const info = createElement('div', { className: this.classNames.info });
    const filename = this.getFileName(resource?.src || '');
    info.appendChild(createElement('span', {}, this.truncate(filename, 28)));
    return info;
  }

  updateUI() {
    const items = this.grid.querySelectorAll(`.${this.classNames.item}`);
    items.forEach((item) => {
      const index = parseInt(item.dataset.index || '-1', 10);
      if (this.selected.has(index)) {
        item.classList.add(this.classNames.selected);
      } else {
        item.classList.remove(this.classNames.selected);
      }
    });
  }

  getFileName(url) {
    if (!url) return '未命名';
    const segments = String(url).split('/');
    const raw = segments[segments.length - 1]?.split('?')[0] || '未命名';
    try {
      return decodeURIComponent(raw) || '未命名';
    } catch {
      return raw || '未命名';
    }
  }

  truncate(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, Math.max(0, maxLen - 3)) + '...';
  }
}
