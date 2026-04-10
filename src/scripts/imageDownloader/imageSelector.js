import { ResourceSelector } from '@/shared/resourceSelector.js';

function getFileName(url) {
  if (!url) return '未命名';
  const parts = String(url).split('/');
  const filename = parts[parts.length - 1]?.split('?')[0] || '未命名';
  try {
    return decodeURIComponent(filename) || '未命名';
  } catch {
    return filename || '未命名';
  }
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * 图片选择器模块
 * 复用通用资源选择器，保留图片脚本的展示风格与对外 API。
 */
export class ImageSelector extends ResourceSelector {
  /**
   * @param {object} options - 配置选项
   * @param {HTMLElement} options.grid - 图片网格容器
   * @param {Function} options.onSelectionChange - 选择变化回调
   */
  constructor(options) {
    super({
      ...options,
      emptyText: '未找到图片',
      classNames: {
        item: 'id-image-item',
        selected: 'selected',
        empty: 'id-empty',
        thumb: 'id-image-thumb',
        checkbox: 'id-checkbox',
        info: 'id-image-info',
      },
      createThumbnail: (img, index, helpers) => {
        const thumb = helpers.createElement('div', { className: 'id-image-thumb' });

        const imgEl = helpers.createElement('img', {
          src: img.src,
          alt: img.alt || `图片 ${index + 1}`,
          loading: 'lazy',
          onerror: () => {
            imgEl.src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">加载失败</text></svg>';
          },
        });

        imgEl.onload = () => {
          if (imgEl.naturalWidth > 0) {
            helpers.updateResource({
              width: imgEl.naturalWidth,
              height: imgEl.naturalHeight,
            });
          }
        };

        thumb.appendChild(imgEl);
        thumb.addEventListener('click', () => {
          helpers.toggle();
        });

        return thumb;
      },
      createInfo: (img, index, helpers) => {
        const info = helpers.createElement('div', { className: 'id-image-info' });
        const filename = getFileName(img.src);

        const sizeEl = helpers.createElement('span', { className: 'id-size' });
        sizeEl.textContent =
          img.width && img.height ? `${img.width}×${img.height}` : '';

        info.appendChild(
          helpers.createElement(
            'span',
            { className: 'id-filename', title: img.src },
            truncate(filename, 20)
          )
        );
        info.appendChild(sizeEl);

        return info;
      },
    });
  }

  /**
   * 兼容旧调用名称
   * @returns {Array}
   */
  getSelectedImages() {
    return this.getSelectedResources();
  }
}
