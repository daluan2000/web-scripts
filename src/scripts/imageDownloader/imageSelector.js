import { createElement } from '@/shared/dom.js';

/**
 * 图片选择器模块
 * 管理图片网格中的选择状态
 */
export class ImageSelector {
  /**
   * @param {object} options - 配置选项
   * @param {HTMLElement} options.grid - 图片网格容器
   * @param {Function} options.onSelectionChange - 选择变化回调
   */
  constructor(options) {
    this.grid = options.grid;
    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.selected = new Set();
    this.images = [];
  }

  /**
   * 渲染图片列表
   * @param {Array} images - 图片列表
   */
  render(images) {
    this.images = images;
    this.selected.clear();
    this.grid.innerHTML = '';

    if (images.length === 0) {
      this.grid.innerHTML = '<div class="id-empty">未找到图片</div>';
      this.onSelectionChange([]);
      return;
    }

    images.forEach((img, index) => {
      const item = this.createImageItem(img, index);
      this.grid.appendChild(item);
    });
  }

  /**
   * 创建单个图片项
   * @param {object} img - 图片信息
   * @param {number} index - 索引
   * @returns {HTMLElement}
   */
  createImageItem(img, index) {
    const item = createElement('div', { className: 'id-image-item', dataset: { index } });

    // 缩略图容器
    const thumb = createElement('div', { className: 'id-image-thumb' });

    const imgEl = createElement('img', {
      src: img.src,
      alt: img.alt || `图片 ${index + 1}`,
      loading: 'lazy',
      onerror: () => {
        imgEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>';
      },
    });

    // 图片加载完成后更新尺寸显示（获取真实尺寸）
    imgEl.onload = () => {
      if (imgEl.naturalWidth > 0) {
        sizeEl.textContent = `${imgEl.naturalWidth}×${imgEl.naturalHeight}`;
        // 更新图片数据中的尺寸
        this.images[index].width = imgEl.naturalWidth;
        this.images[index].height = imgEl.naturalHeight;
      }
    };

    thumb.appendChild(imgEl);

    // 选择框
    const checkbox = createElement('div', {
      className: 'id-checkbox',
      onClick: (e) => {
        e.stopPropagation();
        this.toggle(index);
      },
    }, '<svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>');

    // 图片项点击也触发选择
    thumb.addEventListener('click', () => {
      this.toggle(index);
    });

    // 图片信息
    const info = createElement('div', { className: 'id-image-info' });
    const filename = this.getFileName(img.src);
    const sizeEl = createElement('span', { className: 'id-size' });
    sizeEl.textContent = img.width && img.height ? `${img.width}×${img.height}` : '';
    info.appendChild(createElement('span', { className: 'id-filename', title: img.src }, this.truncate(filename, 20)));
    info.appendChild(sizeEl);

    item.appendChild(thumb);
    item.appendChild(checkbox);
    item.appendChild(info);

    return item;
  }

  /**
   * 切换选择状态
   * @param {number} index - 图片索引
   */
  toggle(index) {
    const item = this.grid.querySelector(`[data-index="${index}"]`);
    if (!item) return;

    if (this.selected.has(index)) {
      this.selected.delete(index);
      item.classList.remove('selected');
    } else {
      this.selected.add(index);
      item.classList.add('selected');
    }

    this.onSelectionChange(this.getSelectedImages());
  }

  /**
   * 全选
   */
  selectAll() {
    this.selected.clear();
    this.images.forEach((_, index) => {
      this.selected.add(index);
    });
    this.updateUI();
    this.onSelectionChange(this.getSelectedImages());
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
   * 更新选中状态 UI
   */
  updateUI() {
    const items = this.grid.querySelectorAll('.id-image-item');
    items.forEach((item) => {
      const index = parseInt(item.dataset.index, 10);
      if (this.selected.has(index)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * 获取选中的图片列表
   * @returns {Array}
   */
  getSelectedImages() {
    return Array.from(this.selected).map((index) => this.images[index]);
  }

  /**
   * 从 URL 获取文件名
   * @param {string} url - 图片 URL
   * @returns {string}
   */
  getFileName(url) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('?')[0];
    return decodeURIComponent(filename) || '未命名';
  }

  /**
   * 截断字符串
   * @param {string} str - 字符串
   * @param {number} maxLen - 最大长度
   * @returns {string}
   */
  truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }
}
