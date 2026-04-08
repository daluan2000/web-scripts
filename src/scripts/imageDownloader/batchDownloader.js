/**
 * 批量下载模块
 * 支持批量下载图片文件
 */
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

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
    const isDataUrl = url.startsWith('data:');

    // 统一通过 fetch 拿 blob，以便在下载前做格式转换
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentType = response.headers.get('content-type') || blob.type || '';
      const downloadTarget = await this.prepareDownloadTarget(url, blob, filename, contentType);
      const blobUrl = URL.createObjectURL(downloadTarget.blob);
      this.triggerDownload(blobUrl, downloadTarget.filename);

      // 清理 blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      // 如果 fetch 失败，非 data URL 尝试直接下载（跨域限制）
      if (!isDataUrl) {
        console.warn(`fetch 下载失败，尝试直接下载: ${url}`);
        this.triggerDownload(url, filename);
        return;
      }

      // data URL fetch 失败时，退回直接下载
      this.downloadDataURL(url, filename);
    }
  }

  /**
   * 下载前处理目标文件（例如 WebP 转码）
   * @param {string} url - 原始 URL
   * @param {Blob} blob - 原始 blob
   * @param {string} filename - 原始文件名
   * @param {string} contentType - 内容类型
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  async prepareDownloadTarget(url, blob, filename, contentType = '') {
    if (!this.isWebpResource(url, contentType)) {
      return { blob, filename };
    }

    const animated = await this.isAnimatedWebp(blob);

    if (animated) {
      const gifBlob = await this.convertAnimatedWebpToGif(blob);
      if (gifBlob) {
        return {
          blob: gifBlob,
          filename: this.replaceExtension(filename, 'gif'),
        };
      }

      console.warn('动态 WebP 转 GIF 失败，回退为原始 WebP 下载');
      return {
        blob,
        filename: this.replaceExtension(filename, 'webp'),
      };
    }

    const pngBlob = await this.convertStaticWebpToPng(blob);
    if (pngBlob) {
      return {
        blob: pngBlob,
        filename: this.replaceExtension(filename, 'png'),
      };
    }

    console.warn('静态 WebP 转 PNG 失败，回退为原始 WebP 下载');
    return {
      blob,
      filename: this.replaceExtension(filename, 'webp'),
    };
  }

  /**
   * 判断资源是否为 WebP
   * @param {string} url - 资源 URL
   * @param {string} contentType - 内容类型
   * @returns {boolean}
   */
  isWebpResource(url, contentType = '') {
    const lowerUrl = (url || '').toLowerCase();
    const lowerMime = (contentType || '').toLowerCase();

    if (lowerMime.includes('image/webp') || lowerMime.includes('image/x-webp')) {
      return true;
    }

    if (lowerUrl.startsWith('data:image/webp')) {
      return true;
    }

    return /\.(?:webp|awebp)(?:$|[?#])/i.test(lowerUrl);
  }

  /**
   * 判断 WebP 是否为动态图片
   * @param {Blob} blob - WebP 文件
   * @returns {Promise<boolean>}
   */
  async isAnimatedWebp(blob) {
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (bytes.length < 16) {
        return false;
      }

      if (this.readFourCC(bytes, 0) !== 'RIFF' || this.readFourCC(bytes, 8) !== 'WEBP') {
        return false;
      }

      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const chunkType = this.readFourCC(bytes, offset);
        const chunkSize = new DataView(buffer).getUint32(offset + 4, true);
        const dataStart = offset + 8;
        const dataEnd = dataStart + chunkSize;

        if (dataEnd > bytes.length) {
          break;
        }

        if (chunkType === 'ANIM' || chunkType === 'ANMF') {
          return true;
        }

        if (chunkType === 'VP8X' && chunkSize >= 1) {
          const flags = bytes[dataStart];
          if ((flags & 0x02) !== 0) {
            return true;
          }
        }

        offset = dataEnd + (chunkSize % 2);
      }

      return false;
    } catch (error) {
      console.warn('WebP 动静态检测失败:', error);
      return false;
    }
  }

  /**
   * 静态 WebP 转 PNG
   * @param {Blob} blob - 静态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertStaticWebpToPng(blob) {
    try {
      const bitmap = await this.decodeImageBitmap(blob);
      if (!bitmap) return null;

      const width = bitmap.width || bitmap.naturalWidth || 0;
      const height = bitmap.height || bitmap.naturalHeight || 0;
      if (!width || !height) {
        if (typeof bitmap.close === 'function') {
          bitmap.close();
        }
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (typeof bitmap.close === 'function') {
          bitmap.close();
        }
        return null;
      }

      ctx.drawImage(bitmap, 0, 0);

      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }

      const pngBlob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png');
      });

      return pngBlob || null;
    } catch (error) {
      console.warn('静态 WebP 转 PNG 失败:', error);
      return null;
    }
  }

  /**
   * 动态 WebP 转 GIF（依赖 ImageDecoder）
   * @param {Blob} blob - 动态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertAnimatedWebpToGif(blob) {
    if (typeof ImageDecoder === 'undefined') {
      console.warn('当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF');
      return null;
    }

    let decoder;

    try {
      const data = new Uint8Array(await blob.arrayBuffer());
      decoder = new ImageDecoder({ data, type: 'image/webp' });
      await decoder.tracks.ready;

      const track = decoder.tracks.selectedTrack;
      const frameCount = track?.frameCount || 0;

      if (frameCount <= 0) {
        return null;
      }

      const gif = GIFEncoder();
      let frameCanvas = null;
      let frameCtx = null;

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const decoded = await decoder.decode({ frameIndex });
        const frame = decoded.image;
        const width = frame.displayWidth || frame.codedWidth;
        const height = frame.displayHeight || frame.codedHeight;

        if (!frameCanvas || frameCanvas.width !== width || frameCanvas.height !== height) {
          frameCanvas = document.createElement('canvas');
          frameCanvas.width = width;
          frameCanvas.height = height;
          frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
          if (!frameCtx) {
            frame.close();
            return null;
          }
        }

        frameCtx.clearRect(0, 0, width, height);
        frameCtx.drawImage(frame, 0, 0, width, height);

        const imageData = frameCtx.getImageData(0, 0, width, height).data;
        const palette = quantize(imageData, 255, {
          format: 'rgba4444',
          oneBitAlpha: true,
          clearAlpha: true,
          clearAlphaColor: 0,
          clearAlphaThreshold: 0,
        });
        palette.unshift([0, 0, 0, 0]);

        const index = applyPalette(imageData, palette, 'rgba4444');
        const delay = Math.max(20, Math.round((frame.duration || 100000) / 1000));

        gif.writeFrame(index, width, height, {
          palette,
          delay,
          repeat: frameIndex === 0 ? 0 : -1,
          transparent: true,
          transparentIndex: 0,
          dispose: 2,
        });

        frame.close();
      }

      gif.finish();
      return new Blob([gif.bytesView()], { type: 'image/gif' });
    } catch (error) {
      console.warn('动态 WebP 转 GIF 失败:', error);
      return null;
    } finally {
      if (decoder && typeof decoder.close === 'function') {
        decoder.close();
      }
    }
  }

  /**
   * 解码图片为可绘制对象
   * @param {Blob} blob - 图片 blob
   * @returns {Promise<ImageBitmap|HTMLImageElement|null>}
   */
  async decodeImageBitmap(blob) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      img.src = url;
    });
  }

  /**
   * 读取 FourCC 字段
   * @param {Uint8Array} bytes - 二进制数据
   * @param {number} offset - 偏移
   * @returns {string}
   */
  readFourCC(bytes, offset) {
    if (offset + 4 > bytes.length) return '';
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  }

  /**
   * 替换文件扩展名
   * @param {string} filename - 原文件名
   * @param {string} ext - 新扩展名
   * @returns {string}
   */
  replaceExtension(filename, ext) {
    const normalizedExt = String(ext || '').replace(/^\./, '').toLowerCase() || 'jpg';
    const baseName = (filename || 'download').split('?')[0];
    const lastDot = baseName.lastIndexOf('.');

    if (lastDot <= 0) {
      return `${baseName}.${normalizedExt}`;
    }

    return `${baseName.slice(0, lastDot)}.${normalizedExt}`;
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
