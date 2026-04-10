import { request } from '@/shared/request.js';
import { logger } from '@/shared/logger.js';

function normalizeBaseUrl(url) {
  const fallback = 'http://127.0.0.1:8787';
  const value = String(url || '').trim() || fallback;

  try {
    const normalized = new URL(value);
    normalized.pathname = '';
    normalized.search = '';
    normalized.hash = '';
    return normalized.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function toWsUrl(baseUrl, explicitWsUrl = '') {
  if (explicitWsUrl && String(explicitWsUrl).trim()) {
    return String(explicitWsUrl).trim().replace(/\/$/, '');
  }

  const normalized = normalizeBaseUrl(baseUrl);
  if (normalized.startsWith('https://')) {
    return normalized.replace('https://', 'wss://');
  }
  return normalized.replace('http://', 'ws://');
}

export class VideoBackendClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.wsUrl = toWsUrl(this.baseUrl, options.wsUrl);
    this.timeout = options.timeout || 20000;
  }

  setBaseUrl(baseUrl, wsUrl = '') {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.wsUrl = toWsUrl(this.baseUrl, wsUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  getWsUrl() {
    return this.wsUrl;
  }

  async createTask(payload) {
    const response = await request(this.buildUrl('/api/video/tasks'), {
      method: 'POST',
      body: payload,
      timeout: this.timeout,
      dataType: 'json',
    });

    return response.data;
  }

  async getTask(taskId) {
    const response = await request(this.buildUrl(`/api/video/tasks/${encodeURIComponent(taskId)}`), {
      method: 'GET',
      timeout: this.timeout,
      dataType: 'json',
    });

    return response.data;
  }

  async listTasks() {
    const response = await request(this.buildUrl('/api/video/tasks'), {
      method: 'GET',
      timeout: this.timeout,
      dataType: 'json',
    });

    return response.data?.tasks || [];
  }

  async cancelTask(taskId) {
    const response = await request(
      this.buildUrl(`/api/video/tasks/${encodeURIComponent(taskId)}/cancel`),
      {
        method: 'POST',
        timeout: this.timeout,
        dataType: 'json',
      }
    );

    return response.data;
  }

  async openDirectory({ taskId = '', path = '' } = {}) {
    const response = await request(this.buildUrl('/api/video/tasks/open-dir'), {
      method: 'POST',
      body: {
        taskId,
        path,
      },
      timeout: this.timeout,
      dataType: 'json',
    });

    return response.data;
  }

  connectTaskStream({ taskId = '', onOpen, onMessage, onClose, onError }) {
    const wsBase = this.getWsUrl();
    const endpoint = `${wsBase}/api/video/tasks/ws`;
    const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : '';
    const wsUrl = `${endpoint}${query}`;

    logger.info('连接后端任务 WebSocket', { wsUrl });
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      onOpen?.();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        logger.warn('WebSocket 消息解析失败', error);
      }
    };

    socket.onerror = (event) => {
      onError?.(event);
    };

    socket.onclose = (event) => {
      onClose?.(event);
    };

    return {
      close() {
        try {
          socket.close();
        } catch (error) {
          logger.warn('关闭 WebSocket 失败', error);
        }
      },
    };
  }

  buildUrl(path) {
    return `${this.baseUrl}${path}`;
  }
}
