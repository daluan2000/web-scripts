import { request } from '@/shared/request.js';
import { logger } from '@/shared/logger.js';

const FFMPEG_CDN_CANDIDATES = [
  {
    name: 'unpkg',
    ffmpeg: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
    classWorker: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js',
    coreJs: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    coreWasm: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  },
  {
    name: 'jsdelivr',
    ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
    classWorker: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js',
    coreJs: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    coreWasm: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  },
];

let ffmpegInstancePromise = null;

function getRuntimeRoot() {
  return globalThis.unsafeWindow || window;
}

function resolveFfmpegRuntime(root) {
  const ffmpegNs = root.FFmpegWASM || root.FFmpeg || window.FFmpegWASM || window.FFmpeg;

  const FFmpegClass = ffmpegNs?.FFmpeg || null;

  return {
    FFmpegClass,
  };
}

function getRuntimeSourceList(key) {
  return FFMPEG_CDN_CANDIDATES.map((item) => item[key]).filter(Boolean);
}

function toArrayBuffer(data) {
  if (!data) {
    return null;
  }

  if (Object.prototype.toString.call(data) === '[object ArrayBuffer]') {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }

  if (data.buffer && Object.prototype.toString.call(data.buffer) === '[object ArrayBuffer]') {
    return data.buffer;
  }

  return null;
}

function isBlobLike(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (Object.prototype.toString.call(data) === '[object Blob]') {
    return true;
  }

  return typeof data.arrayBuffer === 'function' && typeof data.size === 'number';
}

async function fetchArrayBufferForRuntime(urls, label = 'runtime') {
  const candidates = Array.isArray(urls) ? urls : [urls];
  const errors = [];

  for (const url of candidates) {
    try {
      const response = await request(url, {
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 120000,
      });

      const arrayBuffer = toArrayBuffer(response.data);
      if (arrayBuffer) {
        return {
          arrayBuffer,
          sourceUrl: url,
          transport: 'GM_xmlhttpRequest',
        };
      }

      errors.push(`[GM] ${url} -> 返回数据不是二进制`);
    } catch (error) {
      errors.push(`[GM] ${url} -> ${error?.message || '未知错误'}`);
    }

    try {
      const fallback = await fetch(url);
      if (!fallback.ok) {
        throw new Error(`HTTP ${fallback.status}`);
      }

      return {
        arrayBuffer: await fallback.arrayBuffer(),
        sourceUrl: url,
        transport: 'fetch',
      };
    } catch (error) {
      errors.push(`[fetch] ${url} -> ${error?.message || '未知错误'}`);
    }
  }

  throw new Error(`运行时资源下载失败(${label}): ${errors.join(' | ')}`);
}

async function createBlobURLFromRemote(urls, mimeType, label) {
  const { arrayBuffer, sourceUrl, transport } = await fetchArrayBufferForRuntime(urls, label);
  logger.info('FFmpeg 运行时资源已加载', { label, sourceUrl, transport });
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-video-downloader-src="${url}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`脚本加载失败: ${url}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.videoDownloaderSrc = url;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`脚本加载失败: ${url}`));
    };
    document.head.appendChild(script);
  });
}

async function getFfmpegInstance() {
  if (ffmpegInstancePromise) {
    return ffmpegInstancePromise;
  }

  ffmpegInstancePromise = (async () => {
    const root = getRuntimeRoot();
    const ffmpegScriptCandidates = getRuntimeSourceList('ffmpeg');
    const classWorkerCandidates = getRuntimeSourceList('classWorker');
    const coreJsCandidates = getRuntimeSourceList('coreJs');
    const coreWasmCandidates = getRuntimeSourceList('coreWasm');

    let ffmpegScriptLoaded = false;
    for (const scriptUrl of ffmpegScriptCandidates) {
      try {
        await loadScript(scriptUrl);
        ffmpegScriptLoaded = true;
        logger.info('FFmpeg 脚本加载成功', { sourceUrl: scriptUrl });
        break;
      } catch (error) {
        logger.warn(`FFmpeg 脚本加载失败，尝试下一个源: ${scriptUrl}`);
      }
    }

    if (!ffmpegScriptLoaded) {
      throw new Error(`FFmpeg 脚本加载失败: ${ffmpegScriptCandidates.join(' | ')}`);
    }

    const runtime = resolveFfmpegRuntime(root);

    if (!runtime.FFmpegClass) {
      throw new Error('FFmpeg 运行时初始化失败：未找到 FFmpeg 导出对象');
    }

    const ffmpeg = new runtime.FFmpegClass();

    const classWorkerURL = await createBlobURLFromRemote(
      classWorkerCandidates,
      'text/javascript',
      'classWorker'
    );
    const coreURL = await createBlobURLFromRemote(coreJsCandidates, 'text/javascript', 'coreJs');
    const wasmURL = await createBlobURLFromRemote(coreWasmCandidates, 'application/wasm', 'coreWasm');

    try {
      await ffmpeg.load({
        classWorkerURL,
        coreURL,
        wasmURL,
        // For module-worker path, avoid invalid auto-derivation from blob coreURL.
        workerURL: classWorkerURL,
      });
    } finally {
      URL.revokeObjectURL(classWorkerURL);
      URL.revokeObjectURL(coreURL);
      URL.revokeObjectURL(wasmURL);
    }

    logger.info('FFmpeg 运行时加载完成');
    return {
      ffmpeg,
    };
  })();

  try {
    return await ffmpegInstancePromise;
  } catch (error) {
    ffmpegInstancePromise = null;
    throw error;
  }
}

/**
 * 视频批量下载模块
 * 支持直链视频与 m3u8 分片合并下载。
 */
export class VideoBatchDownloader {
  /**
   * @param {object} options - 配置项
   * @param {string} [options.prefix] - 文件名前缀
   * @param {Function} [options.onProgress] - 进度回调 (current, total)
   * @param {Function} [options.onComplete] - 完成回调 (success, failed, successUrls)
   * @param {Function} [options.onItemError] - 单项失败回调 (item, error)
   */
  constructor(options) {
    this.prefix = options.prefix || '';
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onItemError = options.onItemError || (() => {});

    this.downloadQueue = [];
    this.isDownloading = false;
    this.successCount = 0;
    this.failedCount = 0;
    this.successUrls = [];
  }

  /**
   * 开始下载
   * @param {Array} videos - 视频列表
   */
  download(videos) {
    if (this.isDownloading) {
      logger.warn('下载进行中，请稍候');
      return;
    }

    this.downloadQueue = (videos || []).map((video, index) => ({
      ...video,
      index,
      filename: this.generateFilename(video, index),
    }));

    this.successCount = 0;
    this.failedCount = 0;
    this.successUrls = [];
    this.isDownloading = true;

    logger.info('开始批量下载视频', { total: this.downloadQueue.length, prefix: this.prefix });

    this.processQueue();
  }

  async processQueue() {
    if (this.downloadQueue.length === 0) {
      this.isDownloading = false;
      logger.info('视频下载完成', {
        success: this.successCount,
        failed: this.failedCount,
      });
      this.onComplete(this.successCount, this.failedCount, this.successUrls);
      return;
    }

    const item = this.downloadQueue.shift();
    const current = this.successCount + this.failedCount + 1;
    const total = this.successCount + this.failedCount + this.downloadQueue.length + 1;

    this.onProgress(current, total);

    try {
      await this.downloadItem(item);
      this.successCount += 1;
      this.successUrls.push(item.src);
    } catch (error) {
      this.failedCount += 1;
      this.onItemError(item, error);
      logger.error(`视频下载失败: ${item.src}`, error);
    }

    this.processQueue();
  }

  async downloadItem(item) {
    if (!item?.src) {
      throw new Error('无效的视频地址');
    }

    if (!item.supported) {
      throw new Error(item.unsupportedReason || '该资源暂不支持下载');
    }

    if (item.type === 'm3u8') {
      await this.downloadM3u8(item);
      return;
    }

    if (item.type === 'dash') {
      throw new Error('dash/mpd 暂不支持');
    }

    if (item.src.startsWith('blob:')) {
      throw new Error('blob 资源无法直接提取源地址');
    }

    const blob = await this.fetchBlob(item.src);
    this.triggerBlobDownload(blob, item.filename);
  }

  async downloadM3u8(item) {
    const playlist = await this.resolveM3u8Playlist(item.src);
    const segments = this.parseSegments(playlist.content, playlist.url);

    if (segments.length === 0) {
      throw new Error('未解析到 m3u8 分片');
    }

    const chunkList = [];

    for (let i = 0; i < segments.length; i++) {
      const segmentUrl = segments[i];
      const arrayBuffer = await this.fetchArrayBuffer(segmentUrl);
      chunkList.push(new Uint8Array(arrayBuffer));
    }

    const merged = this.mergeUint8Arrays(chunkList);
    const tsBlob = new Blob([merged], { type: 'video/mp2t' });
    logger.info('m3u8 分片合并完成，开始转 mp4', { segmentCount: segments.length });

    const blob = await this.transmuxTsToMp4(tsBlob);
    const filename = this.replaceExtension(item.filename, 'mp4');

    this.triggerBlobDownload(blob, filename);
  }

  async transmuxTsToMp4(tsBlob) {
    const runtime = await getFfmpegInstance();
    const { ffmpeg } = runtime;
    const inputName = 'video_downloader_input.ts';
    const outputName = 'video_downloader_output.mp4';

    await ffmpeg.writeFile(inputName, new Uint8Array(await tsBlob.arrayBuffer()));

    try {
      await ffmpeg.exec([
        '-i',
        inputName,
        '-c',
        'copy',
        '-bsf:a',
        'aac_adtstoasc',
        '-movflags',
        '+faststart',
        outputName,
      ]);
    } catch (error) {
      logger.warn('无损转封装失败，尝试音频转码后输出 mp4');
      await ffmpeg.exec([
        '-i',
        inputName,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        outputName,
      ]);
    }

    const output = await ffmpeg.readFile(outputName);
    const bytes = output instanceof Uint8Array ? output : new Uint8Array(output);

    if (!bytes.length) {
      throw new Error('m3u8 转 mp4 失败，未生成有效文件');
    }

    return new Blob([bytes], { type: 'video/mp4' });
  }

  async resolveM3u8Playlist(url, depth = 0) {
    if (depth > 3) {
      throw new Error('m3u8 变体层级过深，停止解析');
    }

    const content = await this.fetchText(url);
    const bestVariant = this.pickBestVariant(content, url);

    if (!bestVariant) {
      return {
        url,
        content,
      };
    }

    return this.resolveM3u8Playlist(bestVariant, depth + 1);
  }

  pickBestVariant(content, baseUrl) {
    const lines = String(content || '').split(/\r?\n/);
    const variants = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXT-X-STREAM-INF')) continue;

      const nextLine = this.findNextUriLine(lines, i + 1);
      if (!nextLine) continue;

      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/i);
      const bandwidth = bandwidthMatch ? Number(bandwidthMatch[1]) : 0;

      variants.push({
        url: this.resolveUrl(nextLine, baseUrl),
        bandwidth,
      });
    }

    if (variants.length === 0) return null;

    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return variants[0].url;
  }

  parseSegments(content, baseUrl) {
    const lines = String(content || '').split(/\r?\n/);
    const segments = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      segments.push(this.resolveUrl(line, baseUrl));
    }

    return segments;
  }

  findNextUriLine(lines, startIndex) {
    for (let i = startIndex; i < lines.length; i++) {
      const line = String(lines[i] || '').trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      return line;
    }
    return '';
  }

  resolveUrl(path, baseUrl) {
    try {
      return new URL(path, baseUrl).href;
    } catch {
      return path;
    }
  }

  async fetchText(url) {
    try {
      const response = await request(url, {
        method: 'GET',
        dataType: 'text',
        timeout: 60000,
      });

      if (typeof response.data === 'string') {
        return response.data;
      }

      throw new Error('返回数据不是文本');
    } catch (error) {
      const fallback = await fetch(url);
      if (!fallback.ok) {
        throw new Error(`请求 m3u8 失败: HTTP ${fallback.status}`);
      }
      return fallback.text();
    }
  }

  async fetchBlob(url) {
    try {
      const response = await request(url, {
        method: 'GET',
        responseType: 'blob',
        timeout: 120000,
      });

      if (isBlobLike(response.data)) {
        return response.data;
      }

      const asArrayBuffer = toArrayBuffer(response.data);
      if (asArrayBuffer) {
        return new Blob([asArrayBuffer]);
      }

      throw new Error('返回数据不是 Blob');
    } catch (error) {
      logger.warn(`GM 请求获取视频失败，回退 fetch: ${url}`);
      const fallback = await fetch(url);
      if (!fallback.ok) {
        throw new Error(`下载失败: HTTP ${fallback.status}`);
      }
      return fallback.blob();
    }
  }

  async fetchArrayBuffer(url) {
    try {
      const response = await request(url, {
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 120000,
      });

      const arrayBuffer = toArrayBuffer(response.data);
      if (arrayBuffer) {
        return arrayBuffer;
      }

      throw new Error('返回数据不是 ArrayBuffer');
    } catch (error) {
      const fallback = await fetch(url);
      if (!fallback.ok) {
        throw new Error(`分片下载失败: HTTP ${fallback.status}`);
      }
      return fallback.arrayBuffer();
    }
  }

  mergeUint8Arrays(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);

    let offset = 0;
    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.length;
    });

    return merged;
  }

  triggerBlobDownload(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    this.triggerDownload(blobUrl, filename);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }

  triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  generateFilename(video, index) {
    const ext = this.detectExtension(video);
    const paddedIndex = String(index + 1).padStart(3, '0');
    const prefix = this.prefix ? `${this.prefix}_` : '';
    return `${prefix}${paddedIndex}.${ext}`;
  }

  detectExtension(video) {
    if (video?.type === 'm3u8') {
      return 'mp4';
    }

    if (video?.type === 'dash') {
      return 'mpd';
    }

    const fromUrl = this.getExtensionFromUrl(video?.src || '');
    if (fromUrl) {
      return fromUrl;
    }

    const mimeMap = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-matroska': 'mkv',
      'video/x-msvideo': 'avi',
      'video/x-flv': 'flv',
      'video/mp2t': 'ts',
      'application/vnd.apple.mpegurl': 'mp4',
    };

    return mimeMap[video?.mimeType] || 'mp4';
  }

  getExtensionFromUrl(url) {
    const clean = String(url || '').split('?')[0];
    const parts = clean.split('.');
    if (parts.length < 2) return '';

    const ext = parts[parts.length - 1].toLowerCase();
    const validExt = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'ts'];
    return validExt.includes(ext) ? ext : '';
  }

  replaceExtension(filename, ext) {
    const normalizedExt = String(ext || '').replace(/^\./, '') || 'mp4';
    const baseName = (filename || 'download').split('?')[0];
    const lastDot = baseName.lastIndexOf('.');

    if (lastDot <= 0) {
      return `${baseName}.${normalizedExt}`;
    }

    return `${baseName.slice(0, lastDot)}.${normalizedExt}`;
  }
}
