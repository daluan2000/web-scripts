const DOWNLOADER_UI_SELECTOR = '#id-panel, #id-floating-btn';

function isDownloaderUiNode(node) {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(DOWNLOADER_UI_SELECTOR));
}

export class AutoCaptureController {
  constructor(options) {
    this.onScan = options.onScan;
    this.onError = options.onError || (() => {});
    this.minScanInterval = options.minScanInterval || 200;
    this.fallbackInterval = options.fallbackInterval || 1000;
    this.active = false;
    this.scanning = false;
    this.scanRequested = false;
    this.lastScanAt = 0;
    this.scanTimer = null;
    this.fallbackTimer = null;
    this.observer = null;

    this.handleScroll = () => this.requestScan();
    this.handleVisibilityChange = () => {
      if (!document.hidden) this.requestScan({ immediate: true });
    };
    this.handlePageHide = () => this.stop();
  }

  start() {
    if (this.active) return false;
    this.active = true;

    window.addEventListener('scroll', this.handleScroll, true);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide, { once: true });

    this.observer = new MutationObserver((mutations) => {
      const hasPageMutation = mutations.some((mutation) => {
        if (isDownloaderUiNode(mutation.target)) return false;
        return Array.from(mutation.addedNodes || []).some((node) => !isDownloaderUiNode(node)) ||
          mutation.type === 'attributes';
      });

      if (hasPageMutation) this.requestScan();
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'src', 'srcset', 'href', 'poster', 'style', 'class',
        'data-src', 'data-original', 'data-lazy', 'data-srcset',
        'data-image', 'data-ks-lazyload', 'data-url', 'data-ks-observersrc',
      ],
    });

    this.fallbackTimer = window.setInterval(() => this.requestScan(), this.fallbackInterval);
    this.requestScan({ immediate: true });
    return true;
  }

  stop() {
    if (!this.active) return false;
    this.active = false;
    window.removeEventListener('scroll', this.handleScroll, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);
    this.observer?.disconnect();
    this.observer = null;

    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.fallbackTimer !== null) {
      window.clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.scanRequested = false;
    return true;
  }

  requestScan({ immediate = false } = {}) {
    if (!this.active || document.hidden) return;
    if (this.scanning) {
      this.scanRequested = true;
      return;
    }
    if (this.scanTimer !== null) return;

    const elapsed = Date.now() - this.lastScanAt;
    const delay = immediate ? 0 : Math.max(0, this.minScanInterval - elapsed);
    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = null;
      this.runScan();
    }, delay);
  }

  async runScan() {
    if (!this.active || document.hidden || this.scanning) return;
    this.scanning = true;
    this.scanRequested = false;

    try {
      await this.onScan();
    } catch (error) {
      this.onError(error);
    } finally {
      this.lastScanAt = Date.now();
      this.scanning = false;
      if (this.scanRequested) this.requestScan();
    }
  }
}
