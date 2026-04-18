/**
 * 图片捕获模块
 * 获取当前页面中的所有图片
 */
import { enhanceImageUrl } from './imageEnhancers.js';

export class ImageCapture {
  /**
   * 获取当前页面所有图片
   * @returns {Array} 图片列表
   */
  getAllImages() {
    const images = [];
    const seen = new Set();

    // 1. 获取 <img> 标签
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach((img) => {
      this.processImageElement(img, 'img', seen, images);
    });

    // 2. 获取 <image> 标签 (SVG 内)
    const svgImages = document.querySelectorAll('image');
    svgImages.forEach((img) => {
      const src = this.getImageSrc(img.href?.baseVal || img.getAttribute('href'));
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, 'svg-image', img));
      }
    });

    // 3. 获取 CSS 背景图片
    const elements = document.querySelectorAll('*');
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const urls = this.extractUrls(bgImage);
        urls.forEach((url) => {
          const src = this.getImageSrc(url);
          if (src && !seen.has(src)) {
            seen.add(src);
            images.push(this.createImageInfo(src, 'background', el));
          }
        });
      }
    });

    // 4. 获取 <source> 标签 (picture 元素)
    const sources = document.querySelectorAll('source');
    sources.forEach((source) => {
      const src = this.getImageSrc(source.srcset?.split(',')[0]?.trim()?.split(' ')[0]);
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, 'source', source));
      }
    });

    // 5. 获取懒加载的 data-src
    elements.forEach((el) => {
      this.processLazySrc(el, seen, images);
    });

    // 6. 获取 <video> 和 <audio> 的 poster
    const mediaWithPoster = document.querySelectorAll('video, audio');
    mediaWithPoster.forEach((media) => {
      const poster = media.getAttribute('poster');
      if (poster) {
        const src = this.getImageSrc(poster);
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push(this.createImageInfo(src, 'media-poster', media));
        }
      }
    });

    // 7. 获取 <link> 图标
    const icons = document.querySelectorAll('link[rel*="icon"], link[rel*="image"]');
    icons.forEach((link) => {
      const src = this.getImageSrc(link.href);
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push(this.createImageInfo(src, 'icon', link));
      }
    });

    // 所有站点统一采用“最小有效性”过滤：
    // 不按域名或路径后缀做白名单判定，只排除明显无效链接。
    return images.filter((img) => this.isValidImage(img.src));
  }

  /**
   * 处理图片元素，支持多种懒加载属性
   */
  processImageElement(img, type, seen, images) {
    // 优先使用真实 URL（非空、非占位符）
    const src = this.getImageSrc(img.src) || this.getImageSrc(img.dataset?.src) || 
                this.getImageSrc(img.dataset?.original) || this.getImageSrc(img.dataset?.lazy) ||
                this.getImageSrc(img.getAttribute('data-src')) || this.getImageSrc(img.getAttribute('data-original'));

    if (src && !seen.has(src)) {
      seen.add(src);
      images.push(this.createImageInfo(src, type, img));
    }
  }

  /**
   * 处理懒加载属性
   */
  processLazySrc(el, seen, images) {
    // 常见的懒加载属性
    const lazyAttrs = [
      'data-src', 'data-original', 'data-lazy', 'data-srcset',
      'data:image', 'data-ks-lazyload', 'data-url', 'data-ks-observersrc'
    ];

    lazyAttrs.forEach((attr) => {
      let value = el.dataset?.[attr.replace('data-', '')] || el.getAttribute(attr);
      
      if (attr === 'data-image' && value) {
        // 特殊处理 data-image JSON 格式
        try {
          const data = JSON.parse(value);
          value = data.src || data.url || data.original;
        } catch {}
      }
      
      if (value) {
        // 处理 srcset 格式
        if (attr.includes('srcset') || attr === 'data-srcset') {
          value = value.split(',')[0]?.trim()?.split(' ')[0];
        }
        
        const src = this.getImageSrc(value);
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push(this.createImageInfo(src, 'lazy', el));
        }
      }
    });
  }

  /**
   * 从 URL 中提取真实路径
   * @param {string} url - 可能包含参数的 URL
   * @returns {string|null} 清理后的 URL
   */
  getImageSrc(url) {
    if (!url || typeof url !== 'string') return null;

    // 跳过 data URI（除非是 SVG）
    if (url.startsWith('data:')) {
      // 只保留 SVG data URI
      if (!url.startsWith('data:image/svg')) {
        return null;
      }
    }

    // 跳过 base64
    if (url.includes(';base64,')) {
      return null;
    }

    // 跳过空 URL
    if (!url.trim()) return null;

    // 跳过占位符/默认图
    const placeholderPatterns = [
      'placeholder', 'default', 'blank', 'transparent',
      'data:image/gif', 'loading', 'lazy'
    ];
    if (placeholderPatterns.some(p => url.toLowerCase().includes(p)) && !url.match(/\.(jpg|jpeg|png|webp|gif|svg|awebp|avif|bmp)/i)) {
      return null;
    }

    // 清理 URL，保留查询参数（对于字节等平台很重要）
    let cleanUrl = url.split('#')[0].trim();

    // 应用网站特定的增强规则
    cleanUrl = enhanceImageUrl(cleanUrl);

    return cleanUrl;
  }

  /**
   * 从 CSS 属性中提取 URL
   * @param {string} bgImage - background-image 属性值
   * @returns {string[]} URL 列表
   */
  extractUrls(bgImage) {
    const urls = [];
    const regex = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
    let match;
    while ((match = regex.exec(bgImage)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }

  /**
   * 检查是否是有效图片 URL
   * @param {string} src - 图片 URL
   * @returns {boolean}
   */
  isValidImage(src) {
    if (!src || typeof src !== 'string') return false;

    const value = src.trim();
    if (!value) return false;

    const lowerValue = value.toLowerCase();

    // 明确排除非资源协议
    if (
      lowerValue.startsWith('javascript:') ||
      lowerValue.startsWith('vbscript:') ||
      lowerValue.startsWith('mailto:') ||
      lowerValue.startsWith('tel:')
    ) {
      return false;
    }

    // data URL 仅保留 image 类型
    if (lowerValue.startsWith('data:')) {
      return lowerValue.startsWith('data:image/');
    }

    // blob URL 由页面上下文生成，按有效图片处理
    if (lowerValue.startsWith('blob:')) {
      return true;
    }

    // 仅校验资源协议，不按域名/后缀做过滤
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 创建图片信息对象
   * @param {string} src - 图片地址
   * @param {string} type - 图片类型
   * @param {HTMLElement} element - 来源元素
   * @returns {object} 图片信息
   */
  createImageInfo(src, type, element) {
    return {
      src,
      type,
      alt: element?.alt || '',
      width: element?.naturalWidth || element?.width || 0,
      height: element?.naturalHeight || element?.height || 0,
      fileSize: null,
      element: element,
    };
  }

  /**
   * 获取图片文件大小
   * @param {string} url - 图片 URL
   * @returns {Promise<number>} 文件大小（字节）
   */
  async getFileSize(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的字符串
   */
  formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
