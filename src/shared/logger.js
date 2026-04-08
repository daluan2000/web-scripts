/**
 * 日志工具模块
 * 提供分级日志输出
 */

import { config } from './config.js';

const LogLevel = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 输出日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {any[]} args - 日志参数
 */
function log(level, message, ...args) {
  const currentLevel = LogLevel[config.logLevel] ?? LogLevel.info;

  if (LogLevel[level] < currentLevel) {
    return;
  }

  const prefix = `[${level.toUpperCase()}]`;
  const timestamp = new Date().toLocaleTimeString();

  switch (level) {
    case 'debug':
    case 'info':
      console.log(`${prefix} [${timestamp}]`, message, ...args);
      break;
    case 'warn':
      console.warn(`${prefix} [${timestamp}]`, message, ...args);
      break;
    case 'error':
      console.error(`${prefix} [${timestamp}]`, message, ...args);
      break;
  }
}

export const logger = {
  debug: (msg, ...args) => log('debug', msg, ...args),
  info: (msg, ...args) => log('info', msg, ...args),
  warn: (msg, ...args) => log('warn', msg, ...args),
  error: (msg, ...args) => log('error', msg, ...args),
};
