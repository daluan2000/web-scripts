import { isKnownImageSize } from './imageSizeFilter.js';

function defaultImageLoader(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = url;
  });
}

function withTimeout(promise, timeout) {
  let timer = null;
  const timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('图片尺寸识别超时')), timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

/**
 * 以有限并发加载未知尺寸图片。每个 URL 在 reset 前只尝试一次。
 */
export class ImageDimensionResolver {
  constructor(options = {}) {
    this.concurrency = Math.floor(Math.max(1, Number(options.concurrency) || 4));
    this.timeout = Math.max(1, Number(options.timeout) || 15000);
    this.loadImage = options.loadImage || defaultImageLoader;
    this.onResolved = options.onResolved || (() => {});
    this.onProgress = options.onProgress || (() => {});

    this.queue = [];
    this.queuedUrls = new Set();
    this.activeUrls = new Set();
    this.attemptedUrls = new Set();
    this.resolvedCache = new Map();
    this.generation = 0;
    this.activeCount = 0;
    this.currentActiveCount = 0;
    this.total = 0;
    this.completed = 0;
  }

  enqueue(images) {
    for (const image of Array.isArray(images) ? images : []) {
      const src = typeof image?.src === 'string' ? image.src : '';
      if (!src || isKnownImageSize(image)) continue;

      const cached = this.resolvedCache.get(src);
      if (cached) {
        this.onResolved(src, cached.width, cached.height);
        continue;
      }

      if (
        this.attemptedUrls.has(src) ||
        this.queuedUrls.has(src) ||
        this.activeUrls.has(src)
      ) {
        continue;
      }

      this.attemptedUrls.add(src);
      this.queuedUrls.add(src);
      this.queue.push({ src, generation: this.generation });
      this.total += 1;
    }

    this.emitProgress();
    this.pump();
  }

  pump() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      this.queuedUrls.delete(task.src);

      if (task.generation !== this.generation) continue;

      this.activeCount += 1;
      this.currentActiveCount += 1;
      this.activeUrls.add(task.src);
      this.runTask(task);
    }

    this.emitProgress();
  }

  async runTask(task) {
    try {
      const dimensions = await withTimeout(
        Promise.resolve().then(() => this.loadImage(task.src)),
        this.timeout
      );

      if (task.generation !== this.generation) return;

      const width = Number(dimensions?.width);
      const height = Number(dimensions?.height);
      if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
        throw new Error('图片尺寸无效');
      }

      const result = { width, height };
      this.resolvedCache.set(task.src, result);
      this.onResolved(task.src, width, height);
    } catch {
      // 加载失败、超时或无有效尺寸时保持 unknown。
    } finally {
      this.activeCount -= 1;
      this.activeUrls.delete(task.src);

      if (task.generation === this.generation) {
        this.currentActiveCount -= 1;
        this.completed += 1;
      }

      this.emitProgress();
      this.pump();
    }
  }

  getProgress() {
    return {
      total: this.total,
      completed: this.completed,
      active: this.currentActiveCount,
      pending: this.queue.length + this.currentActiveCount,
    };
  }

  emitProgress() {
    this.onProgress(this.getProgress());
  }

  reset() {
    this.generation += 1;
    this.queue = [];
    this.queuedUrls.clear();
    this.attemptedUrls.clear();
    this.resolvedCache.clear();
    this.currentActiveCount = 0;
    this.total = 0;
    this.completed = 0;
    this.emitProgress();
  }
}
