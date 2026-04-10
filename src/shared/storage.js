/**
 * 存储工具模块
 * 基于 GM_setValue / GM_getValue 封装
 * 统一管理脚本的本地存储
 */

import { config, getStorageKey } from './config.js';

/**
 * 设置存储值
 * @param {string} key - 存储键名
 * @param {any} value - 要存储的值
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  return new Promise((resolve) => {
    const serialized = JSON.stringify(value);
    GM_setValue(getStorageKey(key), serialized);
    resolve();
  });
}

/**
 * 获取存储值
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值
 * @returns {Promise<any>}
 */
export async function getItem(key, defaultValue = null) {
  const value = await GM_getValue(getStorageKey(key));
  if (value === undefined) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * 删除存储值
 * @param {string} key - 存储键名
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
  GM_setValue(getStorageKey(key), undefined);
}

/**
 * 获取所有存储项
 * @returns {Promise<object>}
 */
export async function getAllItems() {
  const keys = await GM_listValues();
  const items = {};
  const prefix = config.storagePrefix;

  for (const key of keys) {
    if (key.startsWith(prefix)) {
      const shortKey = key.replace(prefix, '');
      items[shortKey] = await getItem(shortKey);
    }
  }

  return items;
}

/**
 * 清除所有存储项
 * @returns {Promise<void>}
 */
export async function clearAll() {
  const keys = await GM_listValues();
  const prefix = config.storagePrefix;
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      GM_setValue(key, undefined);
    }
  }
}
