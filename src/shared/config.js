/**
 * 全局配置模块
 * 存放各脚本共享的配置信息
 */

export const config = {
  // API 配置
  apiBaseUrl: '',

  // 日志配置
  logLevel: 'info', // debug, info, warn, error

  // 功能开关
  enableAutoRun: true,
  enableNotifications: true,

  // 存储键名前缀
  storagePrefix: 'userscript_',

  // imageDownloader 专用配置
  imageDownloader: {
    storageKeys: {
      downloadHistory: 'imageDownloader_download_history',
    },
  },

  // videoDownloader 专用配置
  videoDownloader: {
    storageKeys: {
      downloadHistory: 'videoDownloader_download_history',
    },
    backend: {
      baseUrl: 'http://127.0.0.1:8787',
      wsUrl: '',
      requestTimeout: 20000,
      pollingInterval: 2500,
    },
  },
};

/**
 * 获取完整存储键名
 * @param {string} key - 基础键名
 * @returns {string} - 带前缀的完整键名
 */
export function getStorageKey(key) {
  return config.storagePrefix + key;
}

/**
 * 更新配置
 * @param {object} options - 配置项
 */
export function updateConfig(options) {
  Object.assign(config, options);
}
