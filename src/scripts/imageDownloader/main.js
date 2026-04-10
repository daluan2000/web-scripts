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
const DOWNLOADED_URLS_KEY =
  config.imageDownloader?.storageKeys?.downloadedUrls || 'imageDownloader_downloaded_urls';

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
  const downloadedUrls = new Set();
  let shortcutEnabled = true;

  function updateDownloadedCount(downloadedCountText) {
    if (!downloadedCountText) return;
    downloadedCountText.textContent = `历史下载数: ${downloadedUrls.size}`;
  }

  async function loadDownloadedUrls(downloadedCountText) {
    try {
      const storedUrls = await getItem(DOWNLOADED_URLS_KEY, []);
      if (Array.isArray(storedUrls)) {
        storedUrls.forEach((url) => {
          if (typeof url === 'string' && url) {
            downloadedUrls.add(url);
          }
        });
      }
      updateDownloadedCount(downloadedCountText);
      logger.info('已加载下载历史', { count: downloadedUrls.size });
    } catch (error) {
      logger.error('读取下载历史失败', error);
      updateDownloadedCount(downloadedCountText);
    }
  }

  async function saveDownloadedUrls() {
    try {
      await setItem(DOWNLOADED_URLS_KEY, Array.from(downloadedUrls));
      logger.debug('下载历史已保存', { count: downloadedUrls.size });
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
  const captureBtn = panel.querySelector('#id-capture');
  const prefixInput = panel.querySelector('#id-prefix');
  const statusText = panel.querySelector('.id-status');
  const downloadedCountText = panel.querySelector('#id-downloaded-count');

  await loadDownloadedUrls(downloadedCountText);

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

        let addedCount = 0;
        successUrls.forEach((url) => {
          if (typeof url === 'string' && url && !downloadedUrls.has(url)) {
            downloadedUrls.add(url);
            addedCount++;
          }
        });

        if (addedCount > 0) {
          updateDownloadedCount(downloadedCountText);
          await saveDownloadedUrls();
        }

        logger.info('下载流程完成', {
          success,
          failed,
          newlyAdded: addedCount,
          downloadedTotal: downloadedUrls.size,
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
    downloadedCount: downloadedUrls.size,
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
