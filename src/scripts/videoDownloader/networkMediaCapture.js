const DIRECT_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'm4v',
  'mov',
  'mkv',
  'avi',
  'flv',
]);

const DIRECT_MIME_TYPES = new Map([
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/x-m4v', 'm4v'],
  ['video/quicktime', 'mov'],
  ['video/x-matroska', 'mkv'],
  ['video/x-msvideo', 'avi'],
  ['video/x-flv', 'flv'],
]);

const HLS_MIME_TYPES = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
]);

const DASH_MIME_TYPES = new Set([
  'application/dash+xml',
]);

const installedWindows = new WeakMap();

function normalizeMimeType(value) {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function normalizeUrl(value, baseUrl) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('data:')) return '';
  if (raw.startsWith('blob:')) return raw;

  try {
    const parsed = new URL(raw, baseUrl || undefined);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return '';
  }
}

function extractExtension(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.([0-9a-z]+)$/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

function hasUrlHint(url, hint) {
  const pattern = new RegExp(`(?:^|[/?#&=_\\-])${hint}(?:[/?#&=_\\-]|$)`, 'i');
  return pattern.test(url);
}

/**
 * 将网络请求归类为完整媒体、清单、分片或 blob。
 * 未表现出媒体特征的 URL 返回 null。
 */
export function classifyNetworkMedia(rawCandidate, options = {}) {
  const input = typeof rawCandidate === 'string'
    ? { src: rawCandidate }
    : (rawCandidate || {});
  const src = normalizeUrl(input.src, options.baseUrl);
  if (!src) return null;

  const mimeType = normalizeMimeType(input.mimeType);
  const common = {
    src,
    mimeType,
    captureSource: String(input.captureSource || 'network'),
    blobKind: String(input.blobKind || ''),
  };

  if (src.startsWith('blob:')) {
    const blobKind = common.blobKind || 'unknown';
    const reason = blobKind === 'media-source'
      ? 'MediaSource blob 需要捕获其背后的网络媒体地址'
      : 'blob 资源无法提交到本机后端';
    return {
      ...common,
      blobKind,
      type: 'blob',
      supported: false,
      unsupportedReason: reason,
      isSegment: false,
    };
  }

  const extension = extractExtension(src);
  let type = '';

  if (HLS_MIME_TYPES.has(mimeType) || extension === 'm3u8' || hasUrlHint(src, 'm3u8')) {
    type = 'm3u8';
  } else if (DASH_MIME_TYPES.has(mimeType) || extension === 'mpd' || hasUrlHint(src, 'mpd')) {
    type = 'dash';
  } else if (extension === 'm4s' || extension === 'ts') {
    type = extension;
  } else if (DIRECT_VIDEO_EXTENSIONS.has(extension)) {
    type = extension;
  } else if (DIRECT_MIME_TYPES.has(mimeType)) {
    type = DIRECT_MIME_TYPES.get(mimeType);
  } else if (mimeType.startsWith('video/')) {
    type = 'video';
  }

  if (!type) return null;

  const isSegment = type === 'm4s' || type === 'ts';
  return {
    ...common,
    type,
    supported: !isSegment,
    unsupportedReason: isSegment ? '媒体分片需要对应的 m3u8 或 MPD 清单' : '',
    isSegment,
  };
}

export class NetworkMediaCollector {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.maxCandidates = Math.max(1, Number(options.maxCandidates || 500));
    this.candidates = new Map();
    this.segmentSummary = { ts: 0, m4s: 0, blob: 0 };
    this.recentSegmentKeys = new Set();
    this.lastBlob = null;
  }

  add(rawCandidate) {
    const candidate = classifyNetworkMedia(rawCandidate, { baseUrl: this.baseUrl });
    if (!candidate) return null;

    if (candidate.isSegment) {
      const segmentKey = `${candidate.type}:${hashUrl(candidate.src)}`;
      if (!this.recentSegmentKeys.has(segmentKey)) {
        if (this.recentSegmentKeys.size >= 2000) {
          const oldestKey = this.recentSegmentKeys.values().next().value;
          if (oldestKey) this.recentSegmentKeys.delete(oldestKey);
        }
        this.recentSegmentKeys.add(segmentKey);
        this.segmentSummary[candidate.type] += 1;
      }
      return candidate;
    }

    if (candidate.type === 'blob') {
      this.segmentSummary.blob += 1;
      this.lastBlob = candidate;
      return candidate;
    }

    const existing = this.candidates.get(candidate.src);
    if (existing) {
      this.candidates.set(candidate.src, {
        ...existing,
        ...candidate,
        mimeType: candidate.mimeType || existing.mimeType,
      });
      return candidate;
    }

    if (this.candidates.size >= this.maxCandidates) {
      const oldestKey = this.candidates.keys().next().value;
      if (oldestKey) this.candidates.delete(oldestKey);
    }

    this.candidates.set(candidate.src, candidate);
    return candidate;
  }

  getSnapshot() {
    const videos = Array.from(this.candidates.values());
    if (this.lastBlob) {
      videos.push({
        ...this.lastBlob,
        blobCount: this.segmentSummary.blob,
      });
    }

    return {
      videos,
      segmentSummary: { ...this.segmentSummary },
    };
  }
}

function hashUrl(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getFetchInputUrl(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input.url === 'string') return input.url;
  if (input && typeof input.href === 'string') return input.href;
  return '';
}

function getObjectKind(pageWindow, object) {
  try {
    if (pageWindow.MediaSource && object instanceof pageWindow.MediaSource) {
      return 'media-source';
    }
    if (pageWindow.Blob && object instanceof pageWindow.Blob) {
      return 'blob';
    }
  } catch {
    return 'unknown';
  }
  return 'unknown';
}

/**
 * 在网页主环境中安装只读网络观察器。返回 cleanup 便于测试或卸载。
 */
export function installNetworkMediaHooks({ pageWindow, onCandidate }) {
  if (!pageWindow || typeof onCandidate !== 'function') {
    return { cleanup() {} };
  }

  const existing = installedWindows.get(pageWindow);
  if (existing) return existing;

  const baseUrl = pageWindow.location?.href || '';
  const safeEmit = (candidate) => {
    try {
      onCandidate(candidate);
    } catch {
      // 捕获失败不能影响页面本身。
    }
  };

  const restoreCallbacks = [];
  const observers = [];

  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch === 'function') {
    function wrappedFetch(...args) {
      const requestUrl = getFetchInputUrl(args[0]);
      safeEmit({ src: requestUrl, captureSource: 'network-fetch-request' });

      const result = originalFetch.apply(this, args);
      Promise.resolve(result).then((response) => {
        let mimeType = '';
        try {
          mimeType = response?.headers?.get?.('content-type') || '';
        } catch {
          // 跨域响应可能不允许读取响应头。
        }
        safeEmit({
          src: response?.url || requestUrl,
          mimeType,
          captureSource: 'network-fetch-response',
        });
      }, () => {});

      return result;
    }

    try {
      pageWindow.fetch = wrappedFetch;
      restoreCallbacks.push(() => {
        if (pageWindow.fetch === wrappedFetch) pageWindow.fetch = originalFetch;
      });
    } catch {
      // 某些页面可能锁定 fetch 属性，PerformanceObserver 仍可兜底。
    }
  }

  const xhrPrototype = pageWindow.XMLHttpRequest?.prototype;
  const originalOpen = xhrPrototype?.open;
  if (xhrPrototype && typeof originalOpen === 'function') {
    const requestUrls = new WeakMap();

    function wrappedOpen(method, url, ...rest) {
      requestUrls.set(this, url);
      safeEmit({ src: url, captureSource: 'network-xhr-request' });

      this.addEventListener?.('loadend', () => {
        let mimeType = '';
        try {
          mimeType = this.getResponseHeader?.('content-type') || '';
        } catch {
          // ignore
        }
        safeEmit({
          src: this.responseURL || requestUrls.get(this) || '',
          mimeType,
          captureSource: 'network-xhr-response',
        });
      }, { once: true });

      return originalOpen.call(this, method, url, ...rest);
    }

    try {
      xhrPrototype.open = wrappedOpen;
      restoreCallbacks.push(() => {
        if (xhrPrototype.open === wrappedOpen) xhrPrototype.open = originalOpen;
      });
    } catch {
      // ignore
    }
  }

  const originalCreateObjectURL = pageWindow.URL?.createObjectURL;
  if (pageWindow.URL && typeof originalCreateObjectURL === 'function') {
    function wrappedCreateObjectURL(object) {
      const url = originalCreateObjectURL.call(this, object);
      const blobKind = getObjectKind(pageWindow, object);
      safeEmit({
        src: url,
        mimeType: object?.type || '',
        blobKind,
        captureSource: 'create-object-url',
      });
      return url;
    }

    try {
      pageWindow.URL.createObjectURL = wrappedCreateObjectURL;
      restoreCallbacks.push(() => {
        if (pageWindow.URL.createObjectURL === wrappedCreateObjectURL) {
          pageWindow.URL.createObjectURL = originalCreateObjectURL;
        }
      });
    } catch {
      // ignore
    }
  }

  const inspectPerformanceEntry = (entry) => {
    safeEmit({
      src: entry?.name || '',
      captureSource: `network-performance-${entry?.initiatorType || 'resource'}`,
    });
  };

  try {
    pageWindow.performance?.getEntriesByType?.('resource')?.forEach(inspectPerformanceEntry);
  } catch {
    // ignore
  }

  if (typeof pageWindow.PerformanceObserver === 'function') {
    try {
      const observer = new pageWindow.PerformanceObserver((list) => {
        list?.getEntries?.().forEach(inspectPerformanceEntry);
      });
      try {
        observer.observe({ type: 'resource', buffered: true });
      } catch {
        observer.observe({ entryTypes: ['resource'] });
      }
      observers.push(observer);
    } catch {
      // ignore
    }
  }

  const api = {
    cleanup() {
      observers.forEach((observer) => {
        try {
          observer.disconnect();
        } catch {
          // ignore
        }
      });
      restoreCallbacks.reverse().forEach((restore) => {
        try {
          restore();
        } catch {
          // ignore
        }
      });
      installedWindows.delete(pageWindow);
    },
  };

  installedWindows.set(pageWindow, api);
  return api;
}

export function createNetworkMediaCapture(options = {}) {
  const pageWindow = options.pageWindow;
  const collector = new NetworkMediaCollector({
    baseUrl: pageWindow?.location?.href || '',
    maxCandidates: options.maxCandidates || 500,
  });
  const hooks = installNetworkMediaHooks({
    pageWindow,
    onCandidate: (candidate) => collector.add(candidate),
  });

  return {
    getSnapshot: () => collector.getSnapshot(),
    cleanup: () => hooks.cleanup(),
  };
}
