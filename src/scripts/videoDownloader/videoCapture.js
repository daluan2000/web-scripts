import { enhanceVideoUrl } from './videoEnhancers.js';

/**
 * 视频捕获模块
 * 扫描页面中的 video/source/link 与常见 data-* 字段。
 */
export class VideoCapture {
  constructor() {
    this.videoExtensions = [
      'mp4',
      'webm',
      'm4v',
      'mov',
      'mkv',
      'avi',
      'flv',
      'ts',
      'm3u8',
      'mpd',
    ];
  }

  /**
   * 捕获页面所有可识别视频资源
   * @returns {Array}
   */
  getAllVideos() {
    const videos = [];
    const seen = new Set();

    this.captureFromVideoElements(videos, seen);
    this.captureFromLinks(videos, seen);
    this.captureFromDataAttrs(videos, seen);

    return videos.filter((item) => this.isLikelyVideoUrl(item.src));
  }

  captureFromVideoElements(results, seen) {
    const videoElements = document.querySelectorAll('video');

    videoElements.forEach((video) => {
      const candidates = [];

      if (video.currentSrc) candidates.push(video.currentSrc);
      if (video.src) candidates.push(video.src);

      const sourceElements = video.querySelectorAll('source');
      sourceElements.forEach((source) => {
        if (source.src) candidates.push(source.src);
        if (source.getAttribute('src')) candidates.push(source.getAttribute('src'));
      });

      this.captureFromCandidates(candidates, {
        poster: video.poster || '',
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : 0,
        width: video.videoWidth || video.clientWidth || 0,
        height: video.videoHeight || video.clientHeight || 0,
        title: video.getAttribute('title') || document.title || '',
      }, results, seen);
    });
  }

  captureFromLinks(results, seen) {
    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      this.captureFromCandidates(
        [href],
        {
          poster: '',
          duration: 0,
          width: 0,
          height: 0,
          title: link.textContent?.trim() || link.getAttribute('title') || document.title || '',
        },
        results,
        seen
      );
    });
  }

  captureFromDataAttrs(results, seen) {
    const candidateSelectors = [
      '[data-video-url]',
      '[data-video]',
      '[data-src]',
      '[data-play-url]',
      '[data-playurl]',
      '[data-m3u8]',
      '[data-stream-url]',
    ];

    const elements = document.querySelectorAll(candidateSelectors.join(','));
    elements.forEach((el) => {
      const candidates = [
        el.getAttribute('data-video-url'),
        el.getAttribute('data-video'),
        el.getAttribute('data-src'),
        el.getAttribute('data-play-url'),
        el.getAttribute('data-playurl'),
        el.getAttribute('data-m3u8'),
        el.getAttribute('data-stream-url'),
      ];

      this.captureFromCandidates(
        candidates,
        {
          poster: el.getAttribute('poster') || '',
          duration: 0,
          width: 0,
          height: 0,
          title: el.getAttribute('title') || document.title || '',
        },
        results,
        seen
      );
    });
  }

  captureFromCandidates(candidates, metadata, results, seen) {
    candidates
      .map((value) => this.normalizeUrl(value))
      .filter(Boolean)
      .forEach((normalizedUrl) => {
        if (seen.has(normalizedUrl)) {
          return;
        }

        seen.add(normalizedUrl);

        const enhancedUrl = enhanceVideoUrl(normalizedUrl);
        const mediaType = this.detectMediaType(enhancedUrl);
        const supported = mediaType !== 'blob' && mediaType !== 'dash';

        results.push({
          src: enhancedUrl,
          type: mediaType,
          mimeType: this.guessMimeType(enhancedUrl),
          duration: metadata.duration || 0,
          width: metadata.width || 0,
          height: metadata.height || 0,
          poster: metadata.poster || '',
          title: metadata.title || '',
          supported,
          unsupportedReason: supported ? '' : this.getUnsupportedReason(mediaType),
        });
      });
  }

  normalizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const raw = url.trim();
    if (!raw) {
      return null;
    }

    if (raw.startsWith('data:')) {
      return null;
    }

    if (raw.startsWith('blob:')) {
      return raw;
    }

    if (raw.startsWith('//')) {
      return `${window.location.protocol}${raw}`;
    }

    try {
      return new URL(raw, window.location.href).href.split('#')[0];
    } catch {
      return null;
    }
  }

  isLikelyVideoUrl(url) {
    if (!url) return false;

    const lower = url.toLowerCase();
    if (lower.startsWith('blob:')) return true;

    const ext = this.extractExtension(lower);
    if (ext && this.videoExtensions.includes(ext)) {
      return true;
    }

    if (lower.includes('.m3u8') || lower.includes('.mpd')) {
      return true;
    }

    if (lower.includes('video') || lower.includes('stream') || lower.includes('playurl')) {
      return true;
    }

    return false;
  }

  detectMediaType(url) {
    const lower = (url || '').toLowerCase();

    if (lower.startsWith('blob:')) return 'blob';
    if (lower.includes('.m3u8')) return 'm3u8';
    if (lower.includes('.mpd')) return 'dash';

    const ext = this.extractExtension(lower);
    if (!ext) return 'video';

    if (ext === 'm3u8') return 'm3u8';
    if (ext === 'mpd') return 'dash';
    return ext;
  }

  extractExtension(url) {
    const noQuery = (url || '').split('?')[0];
    const parts = noQuery.split('.');
    if (parts.length < 2) return '';
    const ext = parts[parts.length - 1].trim();
    return ext.length > 6 ? '' : ext;
  }

  guessMimeType(url) {
    const ext = this.extractExtension((url || '').toLowerCase());
    const map = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      m4v: 'video/x-m4v',
      m3u8: 'application/vnd.apple.mpegurl',
      ts: 'video/mp2t',
      mkv: 'video/x-matroska',
      avi: 'video/x-msvideo',
      flv: 'video/x-flv',
      mpd: 'application/dash+xml',
    };

    return map[ext] || 'video/mp4';
  }

  getUnsupportedReason(mediaType) {
    if (mediaType === 'blob') {
      return 'blob 资源无法直接提取源地址';
    }

    if (mediaType === 'dash') {
      return 'dash/mpd 暂不支持';
    }

    return '当前资源暂不支持';
  }
}
