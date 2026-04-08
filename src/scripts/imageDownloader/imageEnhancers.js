/**
 * 图片增强器模块
 * 定义各网站特定的图片 URL 处理规则
 */

/**
 * 图片增强规则接口
 * @typedef {Object} EnhancerRule
 * @property {string} name - 规则名称
 * @property {string} displayName - 中文显示名称
 * @property {RegExp} urlPattern - 匹配的 URL 正则表达式（用于图片 URL）
 * @property {RegExp} pagePattern - 匹配的页面 URL 正则表达式（用于检测当前网站）
 * @property {Function} enhance - 增强函数，接收原始 URL，返回增强后的 URL
 * @property {number} [priority=0] - 优先级，数字越大优先级越高
 */

/**
 * B站（bilibili/哗哩哗哩）图片增强规则
 * URL 格式: https://i0.hdslb.com/bfs/article/xxx.jpg@1256w_708h_!web-article-pic.avif
 *
 * 测试结论（2025年）：
 * 1. 原 jpg 不存在（返回 500）
 * 2. B站只提供 avif 格式的图片处理
 * 3. 传很大尺寸参数会返回原始尺寸
 *
 * 处理策略：直接请求 3840w 获取原图
 */
const bilibiliEnhancer = {
  name: 'bilibili',
  displayName: 'B站（哔哩哔哩）',
  priority: 10,

  // 匹配图片 URL
  urlPattern: /hdslb\.com|bili(?:l|l)api\.(?:net|com)/i,
  // 匹配页面 URL
  pagePattern: /bilibili\.com|b23\.tv/i,

  /**
   * 增强图片 URL - 获取更高质量版本
   * @param {string} url - 原始 URL
   * @returns {string} 增强后的 URL
   */
  enhance(url) {
    if (!this.urlPattern.test(url)) {
      return url;
    }

    // 检测是否是处理过的 avif 图片
    const avifMatch = url.match(/^(.+\.(?:jpg|jpeg|png))@(.+)\.(avif|awebp)$/i);

    if (avifMatch) {
      const [, baseUrl, , format] = avifMatch;
      // B站策略：传很大尺寸返回原始尺寸
      return `${baseUrl}@3840w.${format}`;
    }

    return url;
  },
};

/**
 * 字节跳动/火山引擎图片增强规则
 * URL 格式: https://p3.douyinpic.com/img/xxx.webp@100w_100h_1e_1c.jpeg
 *
 * 测试结论：抖音图片已经返回清晰版本，无需增强，直接返回原 URL
 */
const bytedanceEnhancer = {
  name: 'bytedance',
  displayName: '抖音（字节跳动）',
  priority: 10,

  // 匹配图片 URL
  urlPattern: /douyin(?:pic|img)\.com|byted(?:ance|img)|volcengine\.net/i,
  // 匹配页面 URL
  pagePattern: /douyin\.com|douyin(?:pic|img)\.com/i,

  enhance(url) {
    return url;
  },
};

/**
 * 小红书图片增强规则
 * URL 格式: https://sns-webpic-qc.xhscdn.com/xxx!nd_dft_wgth_webp_3
 *
 * 测试结论：小红书图片已经是高质量版本，无需增强
 */
const xiaohongshuEnhancer = {
  name: 'xiaohongshu',
  displayName: '小红书',
  priority: 10,

  // 匹配图片 URL
  urlPattern: /xhscdn\.com/i,
  // 匹配页面 URL
  pagePattern: /xiaohongshu\.com|xh(?:s|s)cdn\.com/i,

  enhance(url) {
    return url;
  },
};

/**
 * 知乎图片增强规则
 * URL 格式: https://pic1.zhimg.com/v2-xxx_1440w.jpg
 *
 * 处理策略：去掉 _数字w 尺寸参数获取原图
 */
const zhihuEnhancer = {
  name: 'zhihu',
  displayName: '知乎',
  priority: 10,

  // 匹配图片 URL
  urlPattern: /zhimg\.com/i,
  // 匹配页面 URL
  pagePattern: /zhihu\.com/i,

  enhance(url) {
    return url.replace(/_\w+(\.\w+)$/i, '$1');
  },
};

/**
 * 规则列表（按优先级排序）
 */
const enhancers = [
  bilibiliEnhancer,
  bytedanceEnhancer,
  xiaohongshuEnhancer,
  zhihuEnhancer,
];

/**
 * 获取匹配的增强器
 * @param {string} url - 图片 URL
 * @returns {Object|null} 匹配的增强器
 */
export function getMatchingEnhancer(url) {
  for (const enhancer of enhancers) {
    if (enhancer.urlPattern.test(url)) {
      return enhancer;
    }
  }
  return null;
}

/**
 * 获取页面活跃的增强器（根据当前页面 URL 匹配）
 * @param {string} [pageUrl] - 页面 URL，不传则使用当前页面
 * @returns {Object|null} 匹配的增强器，未匹配返回 null
 */
export function getActiveEnhancer(pageUrl) {
  const url = pageUrl || window.location.href;
  for (const enhancer of enhancers) {
    if (enhancer.pagePattern && enhancer.pagePattern.test(url)) {
      return enhancer;
    }
  }
  return null;
}

/**
 * 获取页面活跃的增强器名称
 * @param {string} [pageUrl] - 页面 URL，不传则使用当前页面
 * @returns {string|null} 增强器名称，未匹配返回 null
 */
export function getActiveEnhancerName(pageUrl) {
  const enhancer = getActiveEnhancer(pageUrl);
  return enhancer ? enhancer.name : null;
}

/**
 * 获取增强器显示名称（中文）
 * @param {string} name - 增强器内部名称
 * @returns {string} 中文显示名称
 */
export function getEnhancerDisplayName(name) {
  const enhancer = enhancers.find(e => e.name === name);
  return enhancer?.displayName || enhancer?.name || name;
}

/**
 * 增强图片 URL
 * @param {string} url - 原始图片 URL
 * @returns {string} 增强后的 URL
 */
export function enhanceImageUrl(url) {
  const enhancer = getMatchingEnhancer(url);
  if (enhancer) {
    return enhancer.enhance(url);
  }
  return url;
}

/**
 * 批量增强图片 URL 列表
 * @param {Array<string>} urls - URL 列表
 * @returns {Array<{original: string, enhanced: string}>} 增强结果
 */
export function enhanceImageUrls(urls) {
  return urls.map((url) => ({
    original: url,
    enhanced: enhanceImageUrl(url),
    enhancedBy: getMatchingEnhancer(url)?.name || null,
  }));
}

/**
 * 注册新的增强规则
 * @param {EnhancerRule} rule - 增强规则
 */
export function registerEnhancer(rule) {
  if (!rule.name || !rule.urlPattern || !rule.enhance) {
    console.error('无效的增强规则:', rule);
    return;
  }

  // 检查是否已存在同名规则
  const existingIndex = enhancers.findIndex((e) => e.name === rule.name);
  if (existingIndex !== -1) {
    enhancers[existingIndex] = rule;
  } else {
    enhancers.push(rule);
  }

  // 按优先级排序
  enhancers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

export { enhancers };
