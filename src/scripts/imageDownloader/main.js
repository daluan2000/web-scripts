import { addStyle } from '@/shared/dom.js';
import { config } from '@/shared/config.js';
import { logger } from '@/shared/logger.js';
import { getItem, setItem } from '@/shared/storage.js';

function isTopWindow() {
  try {
    return window.top === window.self;
  } catch {
    return false;
  }
}

/**
 * 图片批量下载器 - Tampermonkey 脚本
 * 功能：捕获页面图片，支持批量下载
 */

export const USERSCRIPT_HEADER = `// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_download`;

// 注入样式
import styles from '@/scripts/imageDownloader/styles.css?raw';
if (isTopWindow()) {
  addStyle(styles);
}

// 加载各个模块
import { initFloatingButton, showPanel, hidePanel, togglePanel } from '@/scripts/imageDownloader/floatingButton.js';
import { ImageCapture } from '@/scripts/imageDownloader/imageCapture.js';
import { ImageSelector } from '@/scripts/imageDownloader/imageSelector.js';
import { BatchDownloader } from '@/scripts/imageDownloader/batchDownloader.js';
import { createPanel } from '@/scripts/imageDownloader/panel.js';
import { getActiveEnhancerName, getEnhancerDisplayName } from '@/scripts/imageDownloader/imageEnhancers.js';
import { ImageCollection } from '@/scripts/imageDownloader/imageCollection.js';
import { AutoCaptureController } from '@/scripts/imageDownloader/autoCapture.js';
import { ImageDimensionResolver } from '@/scripts/imageDownloader/imageDimensionResolver.js';
import {
  DEFAULT_SIZE_FILTER,
  filterImagesBySize,
  isKnownImageSize,
  isSizeFilterActive,
  normalizeStoredSizeFilter,
  validateSizeFilter,
} from '@/scripts/imageDownloader/imageSizeFilter.js';

const SHORTCUT_KEY = 'i'; // 默认使用 Ctrl+Shift+I 触发
const DOWNLOADED_HISTORY_KEY =
  config.imageDownloader?.storageKeys?.downloadHistory || 'imageDownloader_download_history';
const GIF_QUALITY_MODE_KEY =
  config.imageDownloader?.storageKeys?.gifQualityMode || 'imageDownloader_gif_quality_mode';
const SIZE_FILTER_KEY =
  config.imageDownloader?.storageKeys?.sizeFilter || 'imageDownloader_size_filter';

function normalizeGifQualityMode(mode) {
  return mode === 'low' ? 'low' : 'high';
}

(function () {
  'use strict';

  // 仅在顶层窗口初始化，避免 iframe 页面出现重复窗口
  if (!isTopWindow()) {
    return;
  }

  // 防止重复加载
  if (window.__imageDownloaderInitialized) {
    return;
  }
  window.__imageDownloaderInitialized = true;

  // 全局状态
  let currentImages = [];
  let selectedImages = [];
  const downloadHistory = [];
  let useHighQualityGif = true;
  let sizeFilter = { ...DEFAULT_SIZE_FILTER };
  let shortcutEnabled = true;
  let isDownloading = false;
  const imageCapture = new ImageCapture();
  const imageCollection = new ImageCollection();

  function updateDownloadedCount(downloadedCountText) {
    if (!downloadedCountText) return;
    downloadedCountText.textContent = `历史下载数: ${downloadHistory.length}`;
  }

  function normalizeHistoryRecord(record) {
    if (record && typeof record === 'object' && typeof record.url === 'string' && record.url) {
      return {
        url: record.url,
        downloadedAt: typeof record.downloadedAt === 'string' ? record.downloadedAt : null,
      };
    }

    return null;
  }

  async function loadDownloadHistory(downloadedCountText) {
    try {
      const storedHistory = await getItem(DOWNLOADED_HISTORY_KEY, []);

      if (Array.isArray(storedHistory)) {
        storedHistory.forEach((record) => {
          const normalized = normalizeHistoryRecord(record);
          if (normalized) {
            downloadHistory.push(normalized);
          }
        });
      }

      updateDownloadedCount(downloadedCountText);
      logger.info('已加载下载历史', { count: downloadHistory.length });
    } catch (error) {
      logger.error('读取下载历史失败', error);
      updateDownloadedCount(downloadedCountText);
    }
  }

  async function saveDownloadHistory() {
    try {
      await setItem(DOWNLOADED_HISTORY_KEY, downloadHistory);
      logger.debug('下载历史已保存', { count: downloadHistory.length });
    } catch (error) {
      logger.error('保存下载历史失败', error);
    }
  }

  // 监听快捷键
  function setupShortcutKey(onCapture) {
    document.addEventListener('keydown', (e) => {
      const key = String(e.key || '').toLowerCase();

      // Ctrl+Shift+I 触发
      if (e.ctrlKey && e.shiftKey && key === SHORTCUT_KEY) {
        e.preventDefault();

        if (!shortcutEnabled) return;
        shortcutEnabled = false;

        // 确保面板显示
        const panel = document.getElementById('id-panel');
        if (!panel || panel.style.display === 'none' || panel.style.display === '') {
          showPanel();
        }

        onCapture();

        // 防止连续触发
        setTimeout(() => {
          shortcutEnabled = true;
        }, 500);
      }
    });
  }

  // 初始化
  async function init() {
    logger.info('imageDownloader 初始化开始', { logLevel: config.logLevel });

  // 创建面板
  const panel = createPanel();

  // 检测当前网站是否支持增强
  const activeEnhancer = getActiveEnhancerName();
  const enhancerStatus = panel.querySelector('#id-enhancer-status');
  if (activeEnhancer) {
    const displayName = getEnhancerDisplayName(activeEnhancer);
    enhancerStatus.textContent = `✨ 当前网站已启用增强：${displayName}`;
    enhancerStatus.classList.add('active');
  } else {
    enhancerStatus.textContent = '';
    enhancerStatus.classList.remove('active');
  }

  // 初始化悬浮按钮
  initFloatingButton({
    onToggle: togglePanel,
  });

  // 初始状态：面板关闭
  hidePanel();

  // 获取元素引用
  const grid = panel.querySelector('.id-image-grid');
  const selectAllBtn = panel.querySelector('#id-select-all');
  const selectNoneBtn = panel.querySelector('#id-select-none');
  const downloadBtn = panel.querySelector('#id-download');
  const clearStorageBtn = panel.querySelector('#id-clear-storage');
  const clearCapturedBtn = panel.querySelector('#id-clear-captured');
  const captureBtn = panel.querySelector('#id-capture');
  const autoCaptureToggle = panel.querySelector('#id-auto-capture-toggle');
  const autoCaptureLabel = panel.querySelector('#id-auto-capture-label');
  const prefixInput = panel.querySelector('#id-prefix');
  const gifQualityToggle = panel.querySelector('#id-gif-quality-toggle');
  const minWidthInput = panel.querySelector('#id-min-width');
  const maxWidthInput = panel.querySelector('#id-max-width');
  const minHeightInput = panel.querySelector('#id-min-height');
  const maxHeightInput = panel.querySelector('#id-max-height');
  const includeUnknownToggle = panel.querySelector('#id-include-unknown');
  const resetSizeFilterBtn = panel.querySelector('#id-reset-size-filter');
  const sizeFilterSummary = panel.querySelector('#id-size-filter-summary');
  const sizeFilterError = panel.querySelector('#id-size-filter-error');
  const statusText = panel.querySelector('.id-status');
  const downloadedCountText = panel.querySelector('#id-downloaded-count');

  const sizeInputs = {
    minWidth: minWidthInput,
    maxWidth: maxWidthInput,
    minHeight: minHeightInput,
    maxHeight: maxHeightInput,
  };
  let filterInputTimer = null;
  let filterRenderTimer = null;

  await loadDownloadHistory(downloadedCountText);

  try {
    const storedFilter = await getItem(SIZE_FILTER_KEY, DEFAULT_SIZE_FILTER);
    sizeFilter = normalizeStoredSizeFilter(storedFilter);
  } catch (error) {
    logger.warn('读取尺寸筛选设置失败，使用默认设置', error);
    sizeFilter = { ...DEFAULT_SIZE_FILTER };
  }

  syncSizeFilterControls();

  try {
    const storedMode = normalizeGifQualityMode(await getItem(GIF_QUALITY_MODE_KEY, 'high'));
    useHighQualityGif = storedMode !== 'low';
  } catch (error) {
    logger.warn('读取 GIF 画质模式失败，使用默认清晰模式', error);
    useHighQualityGif = true;
  }

  if (gifQualityToggle) {
    gifQualityToggle.checked = useHighQualityGif;
    gifQualityToggle.addEventListener('change', async () => {
      useHighQualityGif = Boolean(gifQualityToggle.checked);

      try {
        await setItem(GIF_QUALITY_MODE_KEY, useHighQualityGif ? 'high' : 'low');
      } catch (error) {
        logger.warn('保存 GIF 画质模式失败', error);
      }

      statusText.textContent = useHighQualityGif
        ? '动态图画质：清晰（更慢、更大）'
        : '动态图画质：标准（更快、更小）';
    });
  }

  let imageSelector = null;

  const dimensionResolver = new ImageDimensionResolver({
    concurrency: 4,
    timeout: 15000,
    onResolved: (src, width, height) => {
      handleDimensionsResolved(src, width, height);
    },
  });

  // 初始化图片选择器
  imageSelector = new ImageSelector({
    grid,
    onSelectionChange: (selected) => {
      selectedImages = selected;
      updateDownloadButton();
    },
    onDimensionsResolved: (src, width, height) => {
      handleDimensionsResolved(src, width, height);
    },
  });

  function syncSizeFilterControls() {
    for (const [key, input] of Object.entries(sizeInputs)) {
      input.value = sizeFilter[key] ?? '';
    }
    includeUnknownToggle.checked = sizeFilter.includeUnknown;
  }

  function readSizeFilterControls() {
    return {
      minWidth: minWidthInput.value,
      maxWidth: maxWidthInput.value,
      minHeight: minHeightInput.value,
      maxHeight: maxHeightInput.value,
      includeUnknown: includeUnknownToggle.checked,
    };
  }

  function showSizeFilterErrors(errors = {}) {
    for (const [key, input] of Object.entries(sizeInputs)) {
      input.classList.toggle('is-invalid', Boolean(errors[key]));
      input.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
    }

    const message = Object.values(errors)[0] || '';
    sizeFilterError.textContent = message;
    sizeFilterError.classList.toggle('is-visible', Boolean(message));
  }

  async function saveSizeFilter() {
    try {
      await setItem(SIZE_FILTER_KEY, sizeFilter);
    } catch (error) {
      logger.warn('保存尺寸筛选设置失败', error);
    }
  }

  function updateSizeFilterSummary(visibleCount = null) {
    if (!sizeFilterSummary) return;

    const displayed = visibleCount ?? filterImagesBySize(currentImages, sizeFilter).length;
    const unknown = currentImages.filter((image) => !isKnownImageSize(image)).length;
    sizeFilterSummary.textContent = `展示 ${displayed}/${currentImages.length} · 尺寸未知 ${unknown}`;
  }

  function requestUnknownDimensionResolution() {
    dimensionResolver.enqueue(currentImages);
  }

  function renderFilteredImages({ preserveSelection = true } = {}) {
    const visibleImages = filterImagesBySize(currentImages, sizeFilter);
    imageSelector.render(visibleImages, { preserveSelection });
    updateSizeFilterSummary(visibleImages.length);
    requestUnknownDimensionResolution();
  }

  function scheduleFilteredRender() {
    if (filterRenderTimer !== null) return;

    filterRenderTimer = window.setTimeout(() => {
      filterRenderTimer = null;
      renderFilteredImages({ preserveSelection: true });
    }, 100);
  }

  function handleDimensionsResolved(src, width, height) {
    const updated = imageCollection.updateDimensions(src, width, height);
    imageSelector?.updateDimensions(src, width, height);

    if (!updated) return;
    if (isSizeFilterActive(sizeFilter)) {
      scheduleFilteredRender();
    } else {
      updateSizeFilterSummary();
    }
  }

  function applySizeFilterFromControls() {
    const validation = validateSizeFilter(readSizeFilterControls());
    if (!validation.valid) {
      showSizeFilterErrors(validation.errors);
      return false;
    }

    showSizeFilterErrors();
    sizeFilter = validation.settings;
    renderFilteredImages({ preserveSelection: true });
    saveSizeFilter();
    return true;
  }

  function resetSizeFilter() {
    if (filterInputTimer !== null) {
      window.clearTimeout(filterInputTimer);
      filterInputTimer = null;
    }

    sizeFilter = { ...DEFAULT_SIZE_FILTER };
    syncSizeFilterControls();
    showSizeFilterErrors();
    renderFilteredImages({ preserveSelection: true });
    saveSizeFilter();
  }

  function scanAndUpdate({ replace = false, source = 'manual' } = {}) {
    const scannedImages = imageCapture.getAllImages();
    const result = replace
      ? imageCollection.replace(scannedImages)
      : imageCollection.merge(scannedImages);

    if (result.changed || replace) {
      currentImages = imageCollection.getSortedImages();
      renderFilteredImages({ preserveSelection: !replace });
    } else {
      updateSizeFilterSummary();
      requestUnknownDimensionResolution();
    }

    logger.info('图片捕获完成', {
      source,
      scanned: scannedImages.length,
      added: result.added,
      updated: result.updated,
      total: imageCollection.size,
    });

    return result;
  }

  const autoCaptureSettings = config.imageDownloader?.autoCapture || {};
  const autoCaptureController = new AutoCaptureController({
    minScanInterval: autoCaptureSettings.minScanInterval,
    fallbackInterval: autoCaptureSettings.fallbackInterval,
    onScan: () => {
      const result = scanAndUpdate({ source: 'auto' });
      if (!isDownloading) {
        statusText.textContent = result.added > 0
          ? `自动捕获中：累计 ${imageCollection.size} 张，本轮新增 ${result.added} 张`
          : `自动捕获中：累计 ${imageCollection.size} 张`;
      }
    },
    onError: (error) => {
      logger.error('自动捕获失败', error);
      if (!isDownloading) statusText.textContent = '自动捕获扫描失败，将继续重试';
    },
  });

  function runManualCapture(source = 'manual') {
    const isAutoCapturing = autoCaptureController.active;
    logger.info('开始手动捕获图片', { source, isAutoCapturing });
    const result = scanAndUpdate({ replace: !isAutoCapturing, source });
    statusText.textContent = isAutoCapturing
      ? `自动捕获中：累计 ${imageCollection.size} 张，本轮新增 ${result.added} 张`
      : `已捕获 ${imageCollection.size} 张图片`;
  }

  // 设置快捷键（在捕获控制器初始化后）
  setupShortcutKey(() => runManualCapture('shortcut'));

  // 捕获图片
  captureBtn.addEventListener('click', () => {
    runManualCapture('button');
  });

  Object.values(sizeInputs).forEach((input) => {
    input.addEventListener('input', () => {
      if (filterInputTimer !== null) window.clearTimeout(filterInputTimer);
      filterInputTimer = window.setTimeout(() => {
        filterInputTimer = null;
        applySizeFilterFromControls();
      }, 200);
    });
  });

  includeUnknownToggle.addEventListener('change', () => {
    if (filterInputTimer !== null) {
      window.clearTimeout(filterInputTimer);
      filterInputTimer = null;
    }
    applySizeFilterFromControls();
  });

  resetSizeFilterBtn.addEventListener('click', resetSizeFilter);

  autoCaptureToggle.addEventListener('change', () => {
    if (autoCaptureToggle.checked) {
      autoCaptureLabel.classList.add('is-active');
      statusText.textContent = `自动捕获中：累计 ${imageCollection.size} 张`;
      autoCaptureController.start();
      logger.info('自动捕获已开启');
      return;
    }

    autoCaptureController.stop();
    autoCaptureLabel.classList.remove('is-active');
    statusText.textContent = `自动捕获已停止，共捕获 ${imageCollection.size} 张图片`;
    logger.info('自动捕获已停止', { count: imageCollection.size });
  });

  // 全选
  selectAllBtn.addEventListener('click', () => {
    imageSelector.selectAll();
  });

  // 全不选
  selectNoneBtn.addEventListener('click', () => {
    imageSelector.selectNone();
  });

  clearCapturedBtn.addEventListener('click', () => {
    dimensionResolver.reset();
    imageCollection.clear();
    currentImages = [];
    renderFilteredImages({ preserveSelection: false });
    statusText.textContent = autoCaptureController.active
      ? '已清空捕获，自动捕获将继续累计'
      : '已清空捕获图片';
    logger.info('已清空当前捕获图片');
  });

  clearStorageBtn.addEventListener('click', async () => {
    const confirmed = window.confirm('确认清除当前脚本的存储记录吗？');
    if (!confirmed) return;

    downloadHistory.length = 0;

    if (filterInputTimer !== null) {
      window.clearTimeout(filterInputTimer);
      filterInputTimer = null;
    }

    try {
      await setItem(DOWNLOADED_HISTORY_KEY, []);
      sizeFilter = { ...DEFAULT_SIZE_FILTER };
      await setItem(SIZE_FILTER_KEY, sizeFilter);
      syncSizeFilterControls();
      showSizeFilterErrors();
      renderFilteredImages({ preserveSelection: true });
      updateDownloadedCount(downloadedCountText);
      statusText.textContent = '存储已清除';
      logger.info('图片脚本存储已清除');
    } catch (error) {
      statusText.textContent = '清除存储失败';
      logger.error('清除图片脚本存储失败', error);
    }
  });

  // 下载
  downloadBtn.addEventListener('click', () => {
    if (selectedImages.length === 0) {
      alert('请先选择要下载的图片');
      return;
    }

    const imagesToDownload = [...selectedImages];
    const prefix = prefixInput.value || getDefaultPrefix();

    logger.info('开始下载选中图片', {
      count: imagesToDownload.length,
      prefix,
    });
    isDownloading = true;

    const downloader = new BatchDownloader({
      prefix,
      animatedGifHighQuality: useHighQualityGif,
      onProgress: (current, total) => {
        statusText.textContent = `下载中: ${current}/${total}`;
      },
      onComplete: async (success, failed, successUrls = []) => {
        isDownloading = false;
        statusText.textContent = `完成: 成功 ${success}, 失败 ${failed}`;

        if (successUrls.length > 0) {
          const now = new Date().toISOString();
          successUrls.forEach((url) => {
            if (typeof url === 'string' && url) {
              downloadHistory.push({
                url,
                downloadedAt: now,
              });
            }
          });

          updateDownloadedCount(downloadedCountText);
          await saveDownloadHistory();
        }

        logger.info('下载流程完成', {
          success,
          failed,
          historyAdded: successUrls.length,
          historyTotal: downloadHistory.length,
        });
      },
    });

    downloader.download(imagesToDownload);
  });

  // 更新下载按钮状态
  function updateDownloadButton() {
    const count = selectedImages.length;
    downloadBtn.disabled = count === 0;
    downloadBtn.textContent = count === 0 ? '下载选中' : `下载选中 (${count})`;
  }

  // 获取默认前缀（日期时间格式）
  function getDefaultPrefix() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${month}${day}${hours}${minutes}`;
  }

  updateDownloadButton();
  updateSizeFilterSummary();
  logger.info('imageDownloader 初始化完成', {
    downloadedCount: downloadHistory.length,
  });
  }

  function startInit() {
    init().catch((error) => {
      logger.error('imageDownloader 初始化失败', error);
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }
})();
