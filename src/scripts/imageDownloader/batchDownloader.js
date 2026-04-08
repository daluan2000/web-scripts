/**
 * 批量下载模块
 * 支持批量下载图片文件
 */
export class BatchDownloader {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.prefix - 文件名前缀
   * @param {Function} options.onProgress - 进度回调 (current, total)
   * @param {Function} options.onComplete - 完成回调 (success, failed)
   */
  constructor(options) {
    this.prefix = options.prefix || '';
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.downloadQueue = [];
    this.isDownloading = false;
    this.successCount = 0;
    this.failedCount = 0;
  }

  /**
   * 开始下载
   * @param {Array} images - 图片列表
   */
  download(images) {
    if (this.isDownloading) {
      console.warn('下载进行中，请稍候');
      return;
    }

    this.downloadQueue = images.map((img, index) => ({
      ...img,
      index,
      filename: this.generateFilename(img.src, index),
    }));

    this.isDownloading = true;
    this.successCount = 0;
    this.failedCount = 0;

    this.processQueue();
  }

  /**
   * 处理下载队列
   */
  async processQueue() {
    if (this.downloadQueue.length === 0) {
      this.isDownloading = false;
      this.onComplete(this.successCount, this.failedCount);
      return;
    }

    const item = this.downloadQueue.shift();
    const current = this.successCount + this.failedCount + 1;
    const total = this.successCount + this.failedCount + this.downloadQueue.length;

    this.onProgress(current, total);

    try {
      await this.downloadFile(item.src, item.filename);
      this.successCount++;
    } catch (error) {
      console.error(`下载失败: ${item.src}`, error);
      this.failedCount++;
    }

    // 递归处理下一个
    this.processQueue();
  }

  /**
   * 下载单个文件
   * @param {string} url - 文件 URL
   * @param {string} filename - 保存的文件名
   * @returns {Promise<void>}
   */
  async downloadFile(url, filename) {
    // 如果是 data URI，直接下载
    if (url.startsWith('data:')) {
      this.downloadDataURL(url, filename);
      return;
    }

    // 远程图片需要用 fetch 获取后下载
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.triggerDownload(blobUrl, filename);

      // 清理 blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      // 如果 fetch 失败，尝试使用 a 标签直接下载（跨域限制）
      console.warn(`fetch 下载失败，尝试直接下载: ${url}`);
      this.triggerDownload(url, filename);
    }
  }

  /**
   * 触发下载
   * @param {string} url - 文件 URL 或 blob URL
   * @param {string} filename - 文件名
   */
  triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * 下载 Data URL
   * @param {string} dataUrl - data URL
   * @param {string} filename - 文件名
   */
  downloadDataURL(dataUrl, filename) {
    this.triggerDownload(dataUrl, filename);
  }

  /**
   * 生成文件名
   * @param {string} url - 图片 URL
   * @param {number} index - 索引
   * @returns {string}
   */
  generateFilename(url, index) {
    // 获取原扩展名
    let ext = this.getExtension(url);

    // 如果没有扩展名，根据 MIME 类型判断
    if (!ext) {
      const mimeType = this.guessMimeType(url);
      ext = this.mimeToExt(mimeType);
    }

    // 构建文件名
    const paddedIndex = String(index + 1).padStart(3, '0');
    const prefix = this.prefix ? `${this.prefix}_` : '';

    return `${prefix}${paddedIndex}.${ext}`;
  }

  /**
   * 获取文件扩展名
   * @param {string} url - 文件 URL
   * @returns {string}
   */
  getExtension(url) {
    const parts = url.split('.');
    if (parts.length > 1) {
      const ext = parts[parts.length - 1].toLowerCase().split('?')[0];
      if (ext.length >= 2 && ext.length <= 4) {
        return ext;
      }
    }
    return null;
  }

  /**
   * 根据 URL 猜测 MIME 类型
   * @param {string} url - URL
   * @returns {string}
   */
  guessMimeType(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('png')) return 'image/png';
    if (urlLower.includes('gif')) return 'image/gif';
    if (urlLower.includes('webp')) return 'image/webp';
    if (urlLower.includes('bmp')) return 'image/bmp';
    if (urlLower.includes('svg')) return 'image/svg+xml';
    return 'image/jpeg';
  }

  /**
   * MIME 类型转扩展名
   * @param {string} mime - MIME 类型
   * @returns {string}
   */
  mimeToExt(mime) {
    const map = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
    };
    return map[mime] || 'jpg';
  }
}
