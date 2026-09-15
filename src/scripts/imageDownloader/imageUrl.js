/**
 * 将协议相对地址和页面相对地址统一为绝对 URL。
 */
export function normalizeCapturedImageUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') return null;

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * 生成图片去重键。只统一 URL 表示形式，不合并不同输出格式。
 */
export function getImageDedupKey(url) {
  if (!url || typeof url !== 'string') return '';

  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}
