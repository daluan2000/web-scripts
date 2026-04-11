/**
 * 批量下载模块
 * 支持批量下载图片文件
 */
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { logger } from '@/shared/logger.js';

export class BatchDownloader {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.prefix - 文件名前缀
   * @param {Function} options.onProgress - 进度回调 (current, total)
   * @param {Function} options.onComplete - 完成回调 (success, failed)
   */
  constructor(options) {
    this.prefix = options.prefix || '';
    this.animatedGifHighQuality = options.animatedGifHighQuality !== false;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.downloadQueue = [];
    this.isDownloading = false;
    this.successCount = 0;
    this.failedCount = 0;
    this.successUrls = [];
  }

  /**
   * 开始下载
   * @param {Array} images - 图片列表
   */
  download(images) {
    if (this.isDownloading) {
      logger.warn('下载进行中，请稍候');
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
    this.successUrls = [];

    logger.info('开始批量下载', {
      total: this.downloadQueue.length,
      prefix: this.prefix,
    });

    this.processQueue();
  }

  /**
   * 处理下载队列
   */
  async processQueue() {
    if (this.downloadQueue.length === 0) {
      this.isDownloading = false;
      logger.info('批量下载完成', {
        success: this.successCount,
        failed: this.failedCount,
        successUrls: this.successUrls.length,
      });
      this.onComplete(this.successCount, this.failedCount, this.successUrls);
      return;
    }

    const item = this.downloadQueue.shift();
    const current = this.successCount + this.failedCount + 1;
    const total = this.successCount + this.failedCount + this.downloadQueue.length;

    this.onProgress(current, total);

    try {
      await this.downloadFile(item.src, item.filename);
      this.successCount++;
      this.successUrls.push(item.src);
    } catch (error) {
      logger.error(`下载失败: ${item.src}`, error);
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
        logger.warn(`fetch 下载失败，尝试直接下载: ${url}`);
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
      const gifBlob = this.animatedGifHighQuality
        ? await this.convertAnimatedWebpToGif(blob)
        : await this.convertAnimatedWebpToGifLegacy(blob);
      if (gifBlob) {
        return {
          blob: gifBlob,
          filename: this.replaceExtension(filename, 'gif'),
        };
      }

      logger.warn('动态 WebP 转 GIF 失败，回退为原始 WebP 下载');
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

    logger.warn('静态 WebP 转 PNG 失败，回退为原始 WebP 下载');
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
      logger.warn('WebP 动静态检测失败:', error);
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
      logger.warn('静态 WebP 转 PNG 失败:', error);
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
      logger.warn('当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF');
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
      const frameCanvas = document.createElement('canvas');
      const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });

      if (!frameCtx) {
        return null;
      }

      const firstDecoded = await decoder.decode({ frameIndex: 0 });
      const firstFrame = firstDecoded.image;
      const width = firstFrame.displayWidth || firstFrame.codedWidth;
      const height = firstFrame.displayHeight || firstFrame.codedHeight;
      firstFrame.close();

      if (!width || !height) {
        return null;
      }

      frameCanvas.width = width;
      frameCanvas.height = height;

      const palette = await this.buildGlobalGifPalette({
        decoder,
        frameCount,
        width,
        height,
      });

      if (!palette || !palette.palette || palette.palette.length === 0) {
        return null;
      }

      const { palette: globalPalette, paletteFormat, hasTransparency } = palette;

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const decoded = await decoder.decode({ frameIndex });
        const frame = decoded.image;
        const frameWidth = frame.displayWidth || frame.codedWidth;
        const frameHeight = frame.displayHeight || frame.codedHeight;

        frameCtx.clearRect(0, 0, width, height);
        frameCtx.drawImage(frame, 0, 0, frameWidth, frameHeight);

        const imageData = frameCtx.getImageData(0, 0, width, height).data;
        const index = this.applyPaletteWithFloydSteinberg(
          imageData,
          width,
          height,
          globalPalette,
          {
            hasTransparency,
            transparentIndex: 0,
            alphaThreshold: 16,
          },
        );
        const delay = this.toGifDelay(frame.duration);

        const frameOptions = {
          delay,
          dispose: 1,
        };

        if (hasTransparency) {
          frameOptions.transparent = true;
          frameOptions.transparentIndex = 0;
        }

        if (frameIndex === 0) {
          frameOptions.palette = globalPalette;
          frameOptions.repeat = 0;
        }

        gif.writeFrame(index, width, height, frameOptions);

        frame.close();
      }

      gif.finish();
      return new Blob([gif.bytesView()], { type: 'image/gif' });
    } catch (error) {
      logger.warn('动态 WebP 转 GIF 失败:', error);
      return null;
    } finally {
      if (decoder && typeof decoder.close === 'function') {
        decoder.close();
      }
    }
  }

  /**
   * 动态 WebP 转 GIF（低清快速模式，保留初始实现）
   * @param {Blob} blob - 动态 WebP
   * @returns {Promise<Blob|null>}
   */
  async convertAnimatedWebpToGifLegacy(blob) {
    if (typeof ImageDecoder === 'undefined') {
      logger.warn('当前浏览器不支持 ImageDecoder，无法将动态 WebP 转为 GIF');
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

        if (!frameCanvas) {
          frameCanvas = document.createElement('canvas');
          frameCanvas.width = width;
          frameCanvas.height = height;
          frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
          if (!frameCtx) {
            frame.close();
            return null;
          }
        }

        frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
        frameCtx.drawImage(frame, 0, 0, width, height);

        const imageData = frameCtx.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;

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

        gif.writeFrame(index, frameCanvas.width, frameCanvas.height, {
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
      logger.warn('动态 WebP 转 GIF（低清模式）失败:', error);
      return null;
    } finally {
      if (decoder && typeof decoder.close === 'function') {
        decoder.close();
      }
    }
  }

  /**
   * 生成全局调色板，减少帧间色表抖动导致的闪烁
   * @param {{decoder: ImageDecoder, frameCount: number, width: number, height: number}} options
    * @returns {Promise<{palette: Array<Array<number>>, paletteFormat: string, hasTransparency: boolean}|null>}
   */
  async buildGlobalGifPalette({ decoder, frameCount, width, height }) {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    if (!sampleCtx) {
      return null;
    }

    const sampleStep = 1;
    const maxSampledBytes = 256 * 1024 * 1024;
    const chunks = [];
    let totalBytes = 0;
    let hasTransparency = false;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += sampleStep) {
      const decoded = await decoder.decode({ frameIndex });
      const frame = decoded.image;
      const frameWidth = frame.displayWidth || frame.codedWidth;
      const frameHeight = frame.displayHeight || frame.codedHeight;

      sampleCtx.clearRect(0, 0, width, height);
      sampleCtx.drawImage(frame, 0, 0, frameWidth, frameHeight);

      const rgba = sampleCtx.getImageData(0, 0, width, height).data;
      if (!hasTransparency && this.hasTransparentPixels(rgba)) {
        hasTransparency = true;
      }

      const remainingBytes = maxSampledBytes - totalBytes;
      if (remainingBytes < rgba.length) {
        frame.close();
        break;
      }

      const sampled = this.sampleRgbaPixels(rgba, remainingBytes);
      if (sampled && sampled.length > 0) {
        chunks.push(sampled);
        totalBytes += sampled.length;
      }

      frame.close();

      if (totalBytes >= maxSampledBytes) {
        break;
      }
    }

    if (chunks.length === 0) {
      return null;
    }

    const merged = this.concatUint8Arrays(chunks, totalBytes);
    const paletteFormat = hasTransparency ? 'rgba4444' : 'rgb565';
    const paletteSize = hasTransparency ? 255 : 256;
    const palette = quantize(merged, paletteSize, {
      format: paletteFormat,
      oneBitAlpha: hasTransparency,
      clearAlpha: false,
      clearAlphaThreshold: 96,
      useSqrt: true,
    });

    if (hasTransparency) {
      palette.unshift([0, 0, 0, 0]);
    }

    return {
      palette,
      paletteFormat,
      hasTransparency,
    };
  }

  /**
   * 检测像素数据中是否存在透明像素
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @returns {boolean}
   */
  hasTransparentPixels(rgba) {
    if (!rgba || rgba.length < 4) {
      return false;
    }

    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 16) {
        return true;
      }
    }

    return false;
  }

  /**
   * 使用 Floyd-Steinberg 抖动将 RGBA 映射到调色板索引
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @param {number} width
   * @param {number} height
   * @param {Array<Array<number>>} palette
   * @param {{hasTransparency?: boolean, transparentIndex?: number, alphaThreshold?: number}} options
   * @returns {Uint8Array}
   */
  applyPaletteWithFloydSteinberg(rgba, width, height, palette, options = {}) {
    const hasTransparency = Boolean(options.hasTransparency);
    const transparentIndex = Number.isInteger(options.transparentIndex) ? options.transparentIndex : 0;
    const alphaThreshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 16;
    const pixelCount = width * height;
    const index = new Uint8Array(pixelCount);
    const working = new Float32Array(rgba.length);
    const nearestCache = new Map();

    for (let i = 0; i < rgba.length; i++) {
      working[i] = rgba[i];
    }

    const paletteStart = hasTransparency ? 1 : 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const base = pixelIndex * 4;
        const alpha = working[base + 3];

        if (hasTransparency && alpha < alphaThreshold) {
          index[pixelIndex] = transparentIndex;
          continue;
        }

        const srcR = this.clampColor(working[base]);
        const srcG = this.clampColor(working[base + 1]);
        const srcB = this.clampColor(working[base + 2]);
        const bestPaletteIndex = this.findNearestPaletteIndex(srcR, srcG, srcB, palette, paletteStart, nearestCache);
        const matched = palette[bestPaletteIndex] || [srcR, srcG, srcB];

        index[pixelIndex] = bestPaletteIndex;

        const errR = srcR - matched[0];
        const errG = srcG - matched[1];
        const errB = srcB - matched[2];

        this.distributeDitherError(working, width, height, x, y, errR, errG, errB);
      }
    }

    return index;
  }

  distributeDitherError(buffer, width, height, x, y, errR, errG, errB) {
    this.addDitherError(buffer, width, height, x + 1, y, errR, errG, errB, 7 / 16);
    this.addDitherError(buffer, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
    this.addDitherError(buffer, width, height, x, y + 1, errR, errG, errB, 5 / 16);
    this.addDitherError(buffer, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
  }

  addDitherError(buffer, width, height, x, y, errR, errG, errB, weight) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const base = (y * width + x) * 4;
    buffer[base] = this.clampColor(buffer[base] + errR * weight);
    buffer[base + 1] = this.clampColor(buffer[base + 1] + errG * weight);
    buffer[base + 2] = this.clampColor(buffer[base + 2] + errB * weight);
  }

  findNearestPaletteIndex(r, g, b, palette, startIndex, cache) {
    const key = (r << 16) | (g << 8) | b;
    if (cache.has(key)) {
      return cache.get(key);
    }

    let bestIndex = startIndex;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = startIndex; i < palette.length; i++) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr + dg * dg + db * db;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    cache.set(key, bestIndex);
    return bestIndex;
  }

  clampColor(value) {
    if (value < 0) return 0;
    if (value > 255) return 255;
    return value;
  }

  /**
   * 将 WebP 帧时长（微秒）转换为 GIF delay（1/100 秒）
   * @param {number} durationUs
   * @returns {number}
   */
  toGifDelay(durationUs) {
    const safeDuration = Number.isFinite(durationUs) && durationUs > 0 ? durationUs : 100000;
    return Math.max(2, Math.round(safeDuration / 10000));
  }

  /**
   * 从 RGBA 数据中按预算采样像素
   * @param {Uint8Array|Uint8ClampedArray} rgba
   * @param {number} maxBytes
   * @returns {Uint8Array|null}
   */
  sampleRgbaPixels(rgba, maxBytes) {
    if (!rgba || maxBytes <= 0) {
      return null;
    }

    const pixelCount = Math.floor(rgba.length / 4);
    const maxPixels = Math.floor(maxBytes / 4);

    if (pixelCount <= 0 || maxPixels <= 0) {
      return null;
    }

    if (pixelCount > maxPixels) {
      return null;
    }

    return new Uint8Array(rgba);
  }

  /**
   * 合并 Uint8Array 数组
   * @param {Uint8Array[]} chunks
   * @param {number} totalBytes
   * @returns {Uint8Array}
   */
  concatUint8Arrays(chunks, totalBytes) {
    const merged = new Uint8Array(totalBytes);
    let offset = 0;

    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });

    return merged;
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
