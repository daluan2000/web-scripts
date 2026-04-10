import { addStyle } from '@/shared/dom.js';
import { config } from '@/shared/config.js';
import { logger } from '@/shared/logger.js';
import { getItem, setItem } from '@/shared/storage.js';

/**
 * 图片批量下载器 - Tampermonkey 脚本
 * 功能：捕获页面图片，支持批量下载
 */

export const USERSCRIPT_HEADER = `// @name         Image Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  图片批量下载器 - 捕获页面图片并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues`;

// 注入样式
import styles from '@/scripts/imageDownloader/styles.css?raw';
addStyle(styles);

// 加载各个模块
import { initFloatingButton, showPanel, hidePanel, togglePanel } from '@/scripts/imageDownloader/floatingButton.js';
import { ImageCapture } from '@/scripts/imageDownloader/imageCapture.js';
import { ImageSelector } from '@/scripts/imageDownloader/imageSelector.js';
import { BatchDownloader } from '@/scripts/imageDownloader/batchDownloader.js';
import { createPanel } from '@/scripts/imageDownloader/panel.js';
import { getActiveEnhancerName, getEnhancerDisplayName } from '@/scripts/imageDownloader/imageEnhancers.js';

const SHORTCUT_KEY = 'i'; // 默认使用 Ctrl+Shift+I 触发
const DOWNLOADED_HISTORY_KEY =
  config.imageDownloader?.storageKeys?.downloadHistory || 'imageDownloader_download_history';

(function () {
  'use strict';

  // 防止重复加载
  if (window.__imageDownloaderInitialized) {
    return;
  }
  window.__imageDownloaderInitialized = true;

  // 全局状态
  let currentImages = [];
  let selectedImages = [];
  const downloadHistory = [];
  let shortcutEnabled = true;

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
  function setupShortcutKey(imageSelector, statusText) {
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

        logger.info('快捷键触发图片捕获');

        // 执行捕捉
        const capture = new ImageCapture();
        currentImages = capture.getAllImages();
        imageSelector.render(currentImages);
        if (statusText) {
          statusText.textContent = `已捕获 ${currentImages.length} 张图片`;
        }
        logger.info('快捷键捕获完成', { count: currentImages.length });

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
  const captureBtn = panel.querySelector('#id-capture');
  const prefixInput = panel.querySelector('#id-prefix');
  const statusText = panel.querySelector('.id-status');
  const downloadedCountText = panel.querySelector('#id-downloaded-count');

  await loadDownloadHistory(downloadedCountText);

  // 初始化图片选择器
  const imageSelector = new ImageSelector({
    grid,
    onSelectionChange: (selected) => {
      selectedImages = selected;
      updateDownloadButton();
    },
  });

  // 设置快捷键（在 imageSelector 初始化后）
  setupShortcutKey(imageSelector, statusText);

  // 捕获图片
  captureBtn.addEventListener('click', () => {
    logger.info('开始手动捕获图片');
    const capture = new ImageCapture();
    currentImages = capture.getAllImages();
    imageSelector.render(currentImages);
    statusText.textContent = `已捕获 ${currentImages.length} 张图片`;
    logger.info('手动捕获完成', { count: currentImages.length });
  });

  // 全选
  selectAllBtn.addEventListener('click', () => {
    imageSelector.selectAll();
  });

  // 全不选
  selectNoneBtn.addEventListener('click', () => {
    imageSelector.selectNone();
  });

  clearStorageBtn.addEventListener('click', async () => {
    const confirmed = window.confirm('确认清除当前脚本的存储记录吗？');
    if (!confirmed) return;

    downloadHistory.length = 0;

    try {
      await setItem(DOWNLOADED_HISTORY_KEY, []);
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

    const downloader = new BatchDownloader({
      prefix,
      onProgress: (current, total) => {
        statusText.textContent = `下载中: ${current}/${total}`;
      },
      onComplete: async (success, failed, successUrls = []) => {
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
