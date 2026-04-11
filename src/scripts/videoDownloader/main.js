import { addStyle } from '@/shared/dom.js';
import { config } from '@/shared/config.js';
import { logger } from '@/shared/logger.js';
import { setItem } from '@/shared/storage.js';
import { VideoBackendClient } from '@/scripts/videoDownloader/backendClient.js';

export const USERSCRIPT_HEADER = `// @name         Video Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  视频批量下载器 - 前端采集关键信息，后端执行下载
// @match        https://*/*
// @match        http://*/*
// @connect      *
// @connect      127.0.0.1
// @connect      localhost
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
import { createPanel } from '@/scripts/videoDownloader/panel.js';
import { getActiveEnhancerName, getEnhancerDisplayName } from '@/scripts/videoDownloader/videoEnhancers.js';

const SHORTCUT_KEY = 'v';
const DOWNLOADED_HISTORY_KEY =
  config.videoDownloader?.storageKeys?.downloadHistory || 'videoDownloader_download_history';
const TERMINAL_STATUSES = new Set(['success', 'failed', 'cancelled']);
const FRAME_CAPTURE_CHANNEL = 'videoDownloader.frameCapture.v1';
const FRAME_CAPTURE_REQUEST = 'capture-request';
const FRAME_CAPTURE_RESPONSE = 'capture-response';
const FRAME_CAPTURE_TIMEOUT_MS = 1200;

(function () {
  'use strict';

  if (window.__videoDownloaderInitialized) {
    return;
  }
  window.__videoDownloaderInitialized = true;

  const isTopWindow = window.top === window.self;
  let currentVideos = [];
  let selectedVideos = [];
  const downloadHistory = [];
  const taskMap = new Map();
  const pendingCancelTaskIds = new Set();
  const historyRecordedTaskIds = new Set();
  const taskPollers = new Map();
  const handledCaptureRequestIds = new Set();
  let shortcutEnabled = true;
  let wsHandle = null;
  let wsConnected = false;

  const backendClient = new VideoBackendClient({
    baseUrl: config.videoDownloader?.backend?.baseUrl,
    wsUrl: config.videoDownloader?.backend?.wsUrl,
    timeout: config.videoDownloader?.backend?.requestTimeout || 20000,
  });

  function updateDownloadedCount(downloadedCountText) {
    if (!downloadedCountText) return;
    downloadedCountText.textContent = `历史下载数: ${downloadHistory.length}`;
  }

  function setStatusText(statusText, message) {
    if (!statusText) return;
    statusText.textContent = message;
  }

  function setBackendStatus(statusEl, type, message) {
    if (!statusEl) return;
    statusEl.classList.remove('connected', 'disconnected', 'polling');
    statusEl.classList.add(type);
    statusEl.textContent = message;
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

  function getTaskStatusLabel(status) {
    switch (status) {
      case 'queued':
        return '排队中';
      case 'running':
        return '执行中';
      case 'cancelling':
        return '取消中';
      case 'success':
        return '已完成';
      case 'failed':
        return '有失败';
      case 'cancelled':
        return '已取消';
      default:
        return status || '未知';
    }
  }

  function getTaskProgressText(task) {
    if (!task) return '等待后端更新状态';

    if (task.status === 'cancelling' || task.cancelRequested) {
      return task.message || '正在停止下载并清理临时文件...';
    }

    const rawLine = String(task.progressText || '').trim();
    if (task.status === 'running' && rawLine) {
      return rawLine;
    }

    if (TERMINAL_STATUSES.has(task.status)) {
      return task.message || '任务已结束';
    }

    if (rawLine) {
      return rawLine;
    }

    return '等待后端进度输出...';
  }

  function isTaskCancellationInProgress(task) {
    if (!task || !task.id) return false;
    return pendingCancelTaskIds.has(task.id) || task.status === 'cancelling' || Boolean(task.cancelRequested);
  }

  function updateTaskHistory(task, downloadedCountText) {
    if (!task || !TERMINAL_STATUSES.has(task.status)) {
      return;
    }

    if (historyRecordedTaskIds.has(task.id)) {
      return;
    }

    const successfulItems = (task.items || []).filter((item) => item.status === 'success');
    if (successfulItems.length === 0) {
      historyRecordedTaskIds.add(task.id);
      return;
    }

    const now = new Date().toISOString();
    successfulItems.forEach((item) => {
      if (item.src) {
        downloadHistory.push({
          url: item.src,
          downloadedAt: now,
        });
      }
    });

    historyRecordedTaskIds.add(task.id);
    updateDownloadedCount(downloadedCountText);
    saveDownloadHistory();
  }

  function renderTaskList(taskListEl) {
    if (!taskListEl) return;

    taskListEl.innerHTML = '';

    const tasks = Array.from(taskMap.values())
      .map((task, index) => ({ task, index }))
      .sort((a, b) => {
        const aTime = Date.parse(a.task.createdAt || 0) || 0;
        const bTime = Date.parse(b.task.createdAt || 0) || 0;
        if (bTime !== aTime) {
          return bTime - aTime;
        }
        return a.index - b.index;
      })
      .map(({ task }) => task);

    if (tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vd-task-empty';
      empty.textContent = '暂无任务，选择视频后点击「提交任务」';
      taskListEl.appendChild(empty);
      return;
    }

    tasks.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'vd-task-item';

      const rowTop = document.createElement('div');
      rowTop.className = 'vd-task-row';

      const taskIdText = document.createElement('span');
      taskIdText.className = 'vd-task-id';
      taskIdText.textContent = String(task.id || '-');

      const statusTag = document.createElement('span');
      statusTag.className = `vd-task-status ${task.status || 'queued'}`;
      statusTag.textContent = getTaskStatusLabel(task.status);

      rowTop.appendChild(taskIdText);
      rowTop.appendChild(statusTag);
      card.appendChild(rowTop);

      const message = document.createElement('div');
      message.className = 'vd-task-message';
      message.textContent = getTaskProgressText(task);
      card.appendChild(message);

      const rowBottom = document.createElement('div');
      rowBottom.className = 'vd-task-row';

      const output = document.createElement('span');
      output.className = 'vd-task-id';
      output.textContent = `目录: ${task.outputDir || '-'}`;

      const actions = document.createElement('div');
      actions.className = 'vd-task-actions';

      const openBtn = document.createElement('button');
      openBtn.className = 'vd-task-open';
      openBtn.dataset.action = 'open-task-dir';
      openBtn.dataset.taskId = task.id;
      openBtn.textContent = '打开目录';
      actions.appendChild(openBtn);

      if (!TERMINAL_STATUSES.has(task.status)) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'vd-task-cancel';
        cancelBtn.dataset.action = 'cancel-task';
        cancelBtn.dataset.taskId = task.id;

        if (isTaskCancellationInProgress(task)) {
          cancelBtn.disabled = true;
          cancelBtn.classList.add('is-processing');
          cancelBtn.textContent = '取消执行中...';
        } else {
          cancelBtn.textContent = '取消任务';
        }

        actions.appendChild(cancelBtn);
      }

      rowBottom.appendChild(output);
      rowBottom.appendChild(actions);
      card.appendChild(rowBottom);

      taskListEl.appendChild(card);
    });
  }

  function upsertTask(task, taskListEl, downloadedCountText) {
    if (!task || !task.id) return;
    taskMap.set(task.id, task);
    pendingCancelTaskIds.delete(task.id);
    if (TERMINAL_STATUSES.has(task.status)) {
      stopTaskPolling(task.id);
    }
    updateTaskHistory(task, downloadedCountText);
    renderTaskList(taskListEl);
  }

  function stopTaskPolling(taskId) {
    const timer = taskPollers.get(taskId);
    if (timer) {
      clearInterval(timer);
      taskPollers.delete(taskId);
    }
  }

  function stopAllTaskPolling() {
    taskPollers.forEach((timer) => clearInterval(timer));
    taskPollers.clear();
  }

  function startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText) {
    if (!taskId || taskPollers.has(taskId)) return;

    const pollingInterval = config.videoDownloader?.backend?.pollingInterval || 2500;
    const timer = setInterval(async () => {
      try {
        const task = await backendClient.getTask(taskId);
        upsertTask(task, taskListEl, downloadedCountText);
        if (TERMINAL_STATUSES.has(task.status)) {
          stopTaskPolling(taskId);
        }
      } catch (error) {
        const message = String(error?.message || '');
        if (message.includes('请求失败: 404')) {
          stopTaskPolling(taskId);

          const staleTask = taskMap.get(taskId);
          if (staleTask && !TERMINAL_STATUSES.has(staleTask.status)) {
            upsertTask(
              {
                ...staleTask,
                status: 'failed',
                message: '任务不存在，可能后端已重启或任务已清理',
                updatedAt: new Date().toISOString(),
              },
              taskListEl,
              downloadedCountText
            );
          }

          logger.warn('任务不存在，停止轮询', { taskId });
          return;
        }

        setBackendStatus(backendStatusEl, 'polling', '后端: 轮询中');
        logger.warn('轮询任务状态失败', { taskId, error: error?.message || error });
        setStatusText(statusText, `任务轮询失败: ${error?.message || '未知错误'}`);
      }
    }, pollingInterval);

    taskPollers.set(taskId, timer);
  }

  function startPollingActiveTasks(statusText, backendStatusEl, taskListEl, downloadedCountText) {
    taskMap.forEach((task) => {
      if (!TERMINAL_STATUSES.has(task.status)) {
        startTaskPolling(task.id, statusText, backendStatusEl, taskListEl, downloadedCountText);
      }
    });
  }

  async function refreshTaskList(taskListEl, downloadedCountText) {
    const tasks = await backendClient.listTasks();
    const serverTaskIds = new Set(tasks.map((task) => task.id).filter(Boolean));

    Array.from(taskMap.keys()).forEach((taskId) => {
      if (serverTaskIds.has(taskId)) {
        return;
      }

      stopTaskPolling(taskId);

      const staleTask = taskMap.get(taskId);
      if (staleTask && !TERMINAL_STATUSES.has(staleTask.status)) {
        pendingCancelTaskIds.delete(taskId);
        taskMap.set(taskId, {
          ...staleTask,
          status: 'failed',
          message: '任务不存在，可能后端已重启或任务已清理',
          updatedAt: new Date().toISOString(),
        });
      }
    });

    tasks.forEach((task) => upsertTask(task, taskListEl, downloadedCountText));
    renderTaskList(taskListEl);
  }

  function toBackendVideoItem(video) {
    const fallbackFileName = getFileNameFromUrl(video?.src || '');
    const editedFileName = String(video?.fileName || '').trim();

    return {
      src: video.src,
      type: video.type || 'unknown',
      title: video.title || '',
      duration: Number(video.duration || 0) || 0,
      mimeType: video.mimeType || '',
      fileName: editedFileName || fallbackFileName,
      requestHeaders: buildRequestHeaders(),
    };
  }

  function buildRequestHeaders() {
    const headers = {};
    const userAgent = String(navigator?.userAgent || '').trim();
    const referer = String(window?.location?.href || '').trim();
    const cookie = String(document?.cookie || '').trim();

    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }
    if (referer) {
      headers.Referer = referer;
    }
    if (cookie) {
      headers.Cookie = cookie;
    }

    return headers;
  }

  function getFileNameFromUrl(url) {
    const raw = String(url || '').split('/').pop()?.split('?')[0] || '';
    if (!raw) return '';
    try {
      return decodeURIComponent(raw).replace(/\.[0-9A-Za-z]{1,6}$/, '');
    } catch {
      return raw.replace(/\.[0-9A-Za-z]{1,6}$/, '');
    }
  }

  function buildTaskPayload(videos) {
    return {
      videos: videos.map((video) => toBackendVideoItem(video)),
      pageUrl: window.location.href,
      pageTitle: document.title,
    };
  }

  function isFrameCaptureMessage(data, type) {
    return (
      data &&
      typeof data === 'object' &&
      data.channel === FRAME_CAPTURE_CHANNEL &&
      data.type === type &&
      typeof data.requestId === 'string'
    );
  }

  function getDirectChildFrameWindows() {
    const nodes = document.querySelectorAll('iframe, frame');
    const windows = [];

    nodes.forEach((node) => {
      if (node?.contentWindow) {
        windows.push(node.contentWindow);
      }
    });

    return windows;
  }

  function broadcastCaptureRequestToChildFrames(requestId) {
    const payload = {
      channel: FRAME_CAPTURE_CHANNEL,
      type: FRAME_CAPTURE_REQUEST,
      requestId,
    };

    getDirectChildFrameWindows().forEach((frameWindow) => {
      try {
        frameWindow.postMessage(payload, '*');
      } catch (error) {
        logger.debug('向子 frame 分发捕获请求失败', error);
      }
    });
  }

  function captureCurrentFrameVideos() {
    const capture = new VideoCapture();
    const videos = capture.getAllVideos();
    return videos.map((video) => ({
      ...video,
      frameUrl: window.location.href,
      frameTitle: document.title || '',
    }));
  }

  function normalizeCapturedVideo(video, frameUrl = '', frameTitle = '') {
    if (!video || typeof video !== 'object' || !video.src) {
      return null;
    }

    return {
      ...video,
      frameUrl: String(video.frameUrl || frameUrl || ''),
      frameTitle: String(video.frameTitle || frameTitle || ''),
    };
  }

  function pickBetterVideo(existing, candidate) {
    if (!existing) return candidate;

    if (candidate?.supported && existing?.supported === false) {
      return candidate;
    }

    if (candidate?.supported === false && existing?.supported) {
      return existing;
    }

    const existingScore =
      Number(existing?.duration || 0) + Number(existing?.width || 0) * Number(existing?.height || 0);
    const candidateScore =
      Number(candidate?.duration || 0) + Number(candidate?.width || 0) * Number(candidate?.height || 0);

    return candidateScore > existingScore ? candidate : existing;
  }

  function dedupeCapturedVideos(videos) {
    const map = new Map();

    videos.forEach((video) => {
      const normalized = normalizeCapturedVideo(video);
      if (!normalized) return;

      const key = String(normalized.src || '').trim();
      if (!key) return;

      const previous = map.get(key);
      map.set(key, pickBetterVideo(previous, normalized));
    });

    return Array.from(map.values());
  }

  async function captureVideosFromAllFrames(timeoutMs = FRAME_CAPTURE_TIMEOUT_MS) {
    const requestId = `vd_capture_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const localVideos = captureCurrentFrameVideos();
    const collected = [...localVideos];

    const onMessage = (event) => {
      const data = event?.data;
      if (!isFrameCaptureMessage(data, FRAME_CAPTURE_RESPONSE)) return;
      if (data.requestId !== requestId) return;
      if (!Array.isArray(data.videos)) return;

      data.videos.forEach((video) => {
        const normalized = normalizeCapturedVideo(video, data.frameUrl, data.frameTitle);
        if (normalized) {
          collected.push(normalized);
        }
      });
    };

    window.addEventListener('message', onMessage);
    try {
      broadcastCaptureRequestToChildFrames(requestId);
      await new Promise((resolve) => {
        window.setTimeout(resolve, timeoutMs);
      });
    } finally {
      window.removeEventListener('message', onMessage);
    }

    const merged = dedupeCapturedVideos(collected);
    logger.info('跨 frame 捕获完成', {
      localCount: localVideos.length,
      totalCount: merged.length,
      remoteCount: Math.max(0, merged.length - localVideos.length),
    });
    return merged;
  }

  function setupFrameCaptureBridge() {
    window.addEventListener('message', (event) => {
      const data = event?.data;
      if (!isFrameCaptureMessage(data, FRAME_CAPTURE_REQUEST)) return;

      const requestId = data.requestId;
      if (handledCaptureRequestIds.has(requestId)) {
        return;
      }
      handledCaptureRequestIds.add(requestId);

      let videos = [];
      try {
        videos = captureCurrentFrameVideos();
      } catch (error) {
        logger.warn('子 frame 捕获视频失败', error);
      }

      // Forward request so nested frames can also respond.
      broadcastCaptureRequestToChildFrames(requestId);

      try {
        window.top.postMessage(
          {
            channel: FRAME_CAPTURE_CHANNEL,
            type: FRAME_CAPTURE_RESPONSE,
            requestId,
            frameUrl: window.location.href,
            frameTitle: document.title || '',
            videos,
          },
          '*'
        );
      } catch (error) {
        logger.warn('子 frame 回传捕获结果失败', error);
      }

      window.setTimeout(() => {
        handledCaptureRequestIds.delete(requestId);
      }, 15000);
    });
  }

  function setupShortcutKey(videoSelector, statusText) {
    document.addEventListener('keydown', async (e) => {
      const key = String(e.key || '').toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === SHORTCUT_KEY) {
        e.preventDefault();

        if (!shortcutEnabled) return;
        shortcutEnabled = false;

        const panel = document.getElementById('vd-panel');
        if (!panel || panel.style.display === 'none' || panel.style.display === '') {
          showPanel();
        }

        setStatusText(statusText, '正在跨 frame 捕获视频...');

        try {
          currentVideos = await captureVideosFromAllFrames();
          videoSelector.render(currentVideos);
          setStatusText(statusText, `已捕获 ${currentVideos.length} 个视频资源`);
        } catch (error) {
          logger.error('快捷键捕获视频失败', error);
          setStatusText(statusText, `捕获失败: ${error?.message || '未知错误'}`);
        }

        setTimeout(() => {
          shortcutEnabled = true;
        }, 500);
      }
    });
  }

  function handleWsMessage(event, statusText, taskListEl, downloadedCountText) {
    if (!event || typeof event !== 'object') return;

    if (event.event === 'task.list' && Array.isArray(event.tasks)) {
      event.tasks.forEach((task) => upsertTask(task, taskListEl, downloadedCountText));
      return;
    }

    if (event.task) {
      upsertTask(event.task, taskListEl, downloadedCountText);
      if (event.event && event.event.startsWith('task.')) {
        setStatusText(statusText, `后端状态: ${getTaskStatusLabel(event.task.status)}`);
      }
    }
  }

  async function connectTaskStream(
    backendStatusEl,
    statusText,
    taskListEl,
    downloadedCountText
  ) {
    if (wsHandle) {
      wsHandle.close();
      wsHandle = null;
    }

    setBackendStatus(backendStatusEl, 'disconnected', '后端: 连接中');

    wsHandle = backendClient.connectTaskStream({
      onOpen: () => {
        wsConnected = true;
        setBackendStatus(backendStatusEl, 'connected', '后端: WebSocket 已连接');
        stopAllTaskPolling();
      },
      onMessage: (event) => {
        handleWsMessage(event, statusText, taskListEl, downloadedCountText);
      },
      onClose: () => {
        wsConnected = false;
        setBackendStatus(backendStatusEl, 'polling', '后端: WebSocket 断开，切换轮询');
        startPollingActiveTasks(statusText, backendStatusEl, taskListEl, downloadedCountText);
      },
      onError: (error) => {
        wsConnected = false;
        setBackendStatus(backendStatusEl, 'polling', '后端: 连接异常，切换轮询');
        logger.warn('WebSocket 异常', error);
        startPollingActiveTasks(statusText, backendStatusEl, taskListEl, downloadedCountText);
      },
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
    const taskListEl = panel.querySelector('#vd-task-list');
    const selectAllBtn = panel.querySelector('#vd-select-all');
    const selectNoneBtn = panel.querySelector('#vd-select-none');
    const downloadBtn = panel.querySelector('#vd-download');
    const cleanupPartDirsBtn = panel.querySelector('#vd-cleanup-parts');
    const clearStorageBtn = panel.querySelector('#vd-clear-storage');
    const captureBtn = panel.querySelector('#vd-capture');
    const reconnectBtn = panel.querySelector('#vd-reconnect');
    const backendStatusEl = panel.querySelector('#vd-backend-status');
    const statusText = panel.querySelector('.vd-status');
    const downloadedCountText = panel.querySelector('#vd-downloaded-count');

    await loadDownloadHistory(downloadedCountText);

    backendClient.setBaseUrl(
      config.videoDownloader?.backend?.baseUrl || 'http://127.0.0.1:8787',
      config.videoDownloader?.backend?.wsUrl || ''
    );

    const videoSelector = new VideoSelector({
      grid,
      onSelectionChange: (selected) => {
        selectedVideos = selected;
        updateDownloadButton();
      },
    });

    setupShortcutKey(videoSelector, statusText);

      captureBtn.addEventListener('click', async () => {
      logger.info('开始手动捕获视频');

        setStatusText(statusText, '正在跨 frame 捕获视频...');
        try {
          currentVideos = await captureVideosFromAllFrames();
          videoSelector.render(currentVideos);
          setStatusText(statusText, `已捕获 ${currentVideos.length} 个视频资源`);
          logger.info('手动捕获完成', { count: currentVideos.length });
        } catch (error) {
          logger.error('手动捕获失败', error);
          setStatusText(statusText, `捕获失败: ${error?.message || '未知错误'}`);
        }
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
        setStatusText(statusText, '存储已清除');
        logger.info('视频脚本存储已清除');
      } catch (error) {
        setStatusText(statusText, '清除存储失败');
        logger.error('清除视频脚本存储失败', error);
      }
    });

    cleanupPartDirsBtn.addEventListener('click', async () => {
      const confirmed = window.confirm('确认删除所有非当前下载中的 part 目录吗？');
      if (!confirmed) return;

      try {
        const result = await backendClient.cleanupPartDirs();
        const deletedCount = Number(result?.deletedCount || 0) || 0;
        setStatusText(statusText, `已清理 part 目录: ${deletedCount} 个`);
        logger.info('已清理非运行中的 part 目录', {
          deletedCount,
          deletedDirs: result?.deletedDirs || [],
          runningTaskIds: result?.runningTaskIds || [],
        });
      } catch (error) {
        logger.error('清理 part 目录失败', error);
        setStatusText(statusText, `清理 part 目录失败: ${error?.message || '未知错误'}`);
      }
    });

    reconnectBtn.addEventListener('click', async () => {
      await connectTaskStream(backendStatusEl, statusText, taskListEl, downloadedCountText);

      try {
        await refreshTaskList(taskListEl, downloadedCountText);
      } catch (error) {
        logger.warn('刷新任务列表失败', error);
      }
    });

    taskListEl.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;

      const taskId = target.dataset.taskId;
      if (!taskId) return;

      const action = target.dataset.action;

      if (action === 'open-task-dir') {
        try {
          const result = await backendClient.openDirectory({ taskId });
          setStatusText(statusText, result?.message || '已请求后端打开目录');
        } catch (error) {
          logger.error('打开任务目录失败', error);
          setStatusText(statusText, `打开目录失败: ${error?.message || '未知错误'}`);
        }
        return;
      }

      if (action !== 'cancel-task') return;

      const currentTask = taskMap.get(taskId);
      if (currentTask && isTaskCancellationInProgress(currentTask)) {
        setStatusText(statusText, `任务 ${taskId} 的取消正在执行中，请稍候`);
        return;
      }

      pendingCancelTaskIds.add(taskId);
      renderTaskList(taskListEl);
      setStatusText(statusText, `任务 ${taskId} 正在取消...`);

      try {
        const result = await backendClient.cancelTask(taskId);
        const cancelled = Boolean(result?.cancelled) || result?.status === 'cancelled';
        const fallbackMessage = cancelled ? '任务已取消' : '取消请求已发送，等待后端完成';
        setStatusText(statusText, `任务 ${taskId}: ${result?.message || fallbackMessage}`);

        if (!wsConnected) {
          try {
            const latestTask = await backendClient.getTask(taskId);
            upsertTask(latestTask, taskListEl, downloadedCountText);
          } catch (refreshSingleError) {
            logger.warn('取消后刷新单任务状态失败', { taskId, error: refreshSingleError });
          }
        }
      } catch (error) {
        logger.error('取消任务失败', error);
        setStatusText(statusText, `取消任务失败: ${error?.message || '未知错误'}`);

        try {
          const latestTask = await backendClient.getTask(taskId);
          upsertTask(latestTask, taskListEl, downloadedCountText);
        } catch (refreshSingleError) {
          logger.warn('取消失败后刷新单任务状态失败', { taskId, error: refreshSingleError });
        }
      } finally {
        pendingCancelTaskIds.delete(taskId);
        renderTaskList(taskListEl);
      }
    });

    downloadBtn.addEventListener('click', async () => {
      if (selectedVideos.length === 0) {
        alert('请先选择要下载的视频');
        return;
      }

      const videosToSubmit = selectedVideos.filter(
        (video) => video?.src && video?.supported !== false && !String(video.src).startsWith('blob:')
      );

      if (videosToSubmit.length === 0) {
        alert('当前选中资源都不支持提交到后端，请至少选择一个可下载资源');
        return;
      }

      logger.info('提交后端视频任务', {
        count: videosToSubmit.length,
      });

      setStatusText(statusText, `正在提交任务（${videosToSubmit.length} 个）...`);

      try {
        let submittedCount = 0;
        const failedMessages = [];

        for (const video of videosToSubmit) {
          const payload = buildTaskPayload([video]);
          try {
            const result = await backendClient.createTask(payload);
            const taskId = result?.taskId;
            if (!taskId) {
              throw new Error('后端未返回 taskId');
            }

            const task = await backendClient.getTask(taskId);
            upsertTask(task, taskListEl, downloadedCountText);
            submittedCount += 1;

            if (!wsConnected) {
              startTaskPolling(taskId, statusText, backendStatusEl, taskListEl, downloadedCountText);
            }
          } catch (singleError) {
            const failedName = String(video?.fileName || getFileNameFromUrl(video?.src || '') || '未命名');
            failedMessages.push(`${failedName}: ${singleError?.message || '未知错误'}`);
          }
        }

        if (failedMessages.length === 0) {
          setStatusText(statusText, `任务已提交: ${submittedCount} 个`);
        } else if (submittedCount > 0) {
          setStatusText(statusText, `部分提交失败（成功 ${submittedCount}，失败 ${failedMessages.length}）`);
          alert(`以下任务提交失败:\n${failedMessages.join('\n')}`);
        } else {
          throw new Error(failedMessages.join('; '));
        }
      } catch (error) {
        logger.error('任务提交失败', error);
        setStatusText(statusText, `任务提交失败: ${error?.message || '未知错误'}`);
      }
    });

    function updateDownloadButton() {
      const count = selectedVideos.length;
      downloadBtn.disabled = count === 0;
      downloadBtn.textContent = count === 0 ? '提交任务' : `提交任务 (${count})`;
    }

    await connectTaskStream(backendStatusEl, statusText, taskListEl, downloadedCountText);

    try {
      await refreshTaskList(taskListEl, downloadedCountText);
    } catch (error) {
      logger.warn('初始化任务列表失败', error);
      setStatusText(statusText, `后端暂不可用: ${error?.message || '未知错误'}`);
      setBackendStatus(backendStatusEl, 'polling', '后端: 请求失败，轮询模式');
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

    setupFrameCaptureBridge();

    if (!isTopWindow) {
      logger.debug('videoDownloader 已在子 frame 启用捕获桥接');
      return;
    }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }
})();
