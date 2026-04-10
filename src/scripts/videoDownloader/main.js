import { addStyle } from '@/shared/dom.js';
import { config } from '@/shared/config.js';
import { logger } from '@/shared/logger.js';
import { getItem, setItem } from '@/shared/storage.js';

export const USERSCRIPT_HEADER = `// @name         Video Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  视频批量下载器 - 捕获页面视频并支持批量下载
// @match        https://*/*
// @match        http://*/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow`;

import styles from '@/scripts/videoDownloader/styles.css?raw';
addStyle(styles);

import { initFloatingButton, showPanel, hidePanel, togglePanel } from '@/scripts/videoDownloader/floatingButton.js';
import { VideoCapture } from '@/scripts/videoDownloader/videoCapture.js';
import { VideoSelector } from '@/scripts/videoDownloader/videoSelector.js';
import { VideoBatchDownloader } from '@/scripts/videoDownloader/batchDownloader.js';
import { createPanel } from '@/scripts/videoDownloader/panel.js';
import { getActiveEnhancerName, getEnhancerDisplayName } from '@/scripts/videoDownloader/videoEnhancers.js';

const SHORTCUT_KEY = 'v';
const DOWNLOADED_HISTORY_KEY =
  config.videoDownloader?.storageKeys?.downloadHistory || 'videoDownloader_download_history';

(function () {
  'use strict';

  if (window.__videoDownloaderInitialized) {
    return;
  }
  window.__videoDownloaderInitialized = true;

  let currentVideos = [];
  let selectedVideos = [];
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
      logger.info('已加载视频下载历史', { count: downloadHistory.length });
    } catch (error) {
      logger.error('读取视频下载历史失败', error);
      updateDownloadedCount(downloadedCountText);
    }
  }

  async function saveDownloadHistory() {
    try {
      await setItem(DOWNLOADED_HISTORY_KEY, downloadHistory);
      logger.debug('视频下载历史已保存', { count: downloadHistory.length });
    } catch (error) {
      logger.error('保存视频下载历史失败', error);
    }
  }

  function setupShortcutKey(videoSelector, statusText) {
    document.addEventListener('keydown', (e) => {
      const key = String(e.key || '').toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === SHORTCUT_KEY) {
        e.preventDefault();

        if (!shortcutEnabled) return;
        shortcutEnabled = false;

        const panel = document.getElementById('vd-panel');
        if (!panel || panel.style.display === 'none' || panel.style.display === '') {
          showPanel();
        }

        const capture = new VideoCapture();
        currentVideos = capture.getAllVideos();
        videoSelector.render(currentVideos);

        if (statusText) {
          statusText.textContent = `已捕获 ${currentVideos.length} 个视频资源`;
        }

        setTimeout(() => {
          shortcutEnabled = true;
        }, 500);
      }
    });
  }

  async function init() {
    logger.info('videoDownloader 初始化开始', { logLevel: config.logLevel });

    const panel = createPanel();

    const activeEnhancer = getActiveEnhancerName();
    const note = panel.querySelector('.vd-panel-note');
    if (activeEnhancer && note) {
      const displayName = getEnhancerDisplayName(activeEnhancer);
      note.textContent = `支持直链视频与 m3u8 基础下载，当前来源策略：${displayName}`;
    }

    initFloatingButton({ onToggle: togglePanel });
    hidePanel();

    const grid = panel.querySelector('.vd-video-grid');
    const selectAllBtn = panel.querySelector('#vd-select-all');
    const selectNoneBtn = panel.querySelector('#vd-select-none');
    const downloadBtn = panel.querySelector('#vd-download');
    const clearStorageBtn = panel.querySelector('#vd-clear-storage');
    const captureBtn = panel.querySelector('#vd-capture');
    const prefixInput = panel.querySelector('#vd-prefix');
    const statusText = panel.querySelector('.vd-status');
    const downloadedCountText = panel.querySelector('#vd-downloaded-count');

    await loadDownloadHistory(downloadedCountText);

    const videoSelector = new VideoSelector({
      grid,
      onSelectionChange: (selected) => {
        selectedVideos = selected;
        updateDownloadButton();
      },
    });

    setupShortcutKey(videoSelector, statusText);

    captureBtn.addEventListener('click', () => {
      logger.info('开始手动捕获视频');
      const capture = new VideoCapture();
      currentVideos = capture.getAllVideos();
      videoSelector.render(currentVideos);
      statusText.textContent = `已捕获 ${currentVideos.length} 个视频资源`;
      logger.info('手动捕获完成', { count: currentVideos.length });
    });

    selectAllBtn.addEventListener('click', () => {
      videoSelector.selectAll();
    });

    selectNoneBtn.addEventListener('click', () => {
      videoSelector.selectNone();
    });

    clearStorageBtn.addEventListener('click', async () => {
      const confirmed = window.confirm('确认清除当前脚本的存储记录吗？');
      if (!confirmed) return;

      downloadHistory.length = 0;

      try {
        await setItem(DOWNLOADED_HISTORY_KEY, []);
        updateDownloadedCount(downloadedCountText);
        statusText.textContent = '存储已清除';
        logger.info('视频脚本存储已清除');
      } catch (error) {
        statusText.textContent = '清除存储失败';
        logger.error('清除视频脚本存储失败', error);
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (selectedVideos.length === 0) {
        alert('请先选择要下载的视频');
        return;
      }

      const videosToDownload = [...selectedVideos];
      const prefix = prefixInput.value || getDefaultPrefix();

      logger.info('开始下载选中视频', {
        count: videosToDownload.length,
        prefix,
      });

      const downloader = new VideoBatchDownloader({
        prefix,
        onProgress: (current, total) => {
          statusText.textContent = `下载中: ${current}/${total}`;
        },
        onItemError: (item, error) => {
          logger.warn('单个视频下载失败', {
            url: item?.src,
            reason: error?.message || '未知错误',
          });
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

          logger.info('视频下载流程完成', {
            success,
            failed,
            historyAdded: successUrls.length,
            historyTotal: downloadHistory.length,
          });
        },
      });

      downloader.download(videosToDownload);
    });

    function updateDownloadButton() {
      const count = selectedVideos.length;
      downloadBtn.disabled = count === 0;
      downloadBtn.textContent = count === 0 ? '下载选中' : `下载选中 (${count})`;
    }

    function getDefaultPrefix() {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${month}${day}${hours}${minutes}`;
    }

    updateDownloadButton();
    logger.info('videoDownloader 初始化完成', {
      downloadedCount: downloadHistory.length,
    });
  }

  function startInit() {
    init().catch((error) => {
      logger.error('videoDownloader 初始化失败', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }
})();
