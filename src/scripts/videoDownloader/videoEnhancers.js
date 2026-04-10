/**
 * 视频 URL 增强模块
 * 首版保留扩展点，默认直传 URL。
 */

const enhancers = [
  {
    name: 'default',
    displayName: '通用视频源',
    priority: 0,
    urlPattern: /.*/i,
    pagePattern: /.*/i,
    enhance(url) {
      return url;
    },
  },
];

export function getActiveEnhancer(pageUrl) {
  const url = pageUrl || window.location.href;
  for (const enhancer of enhancers) {
    if (enhancer.pagePattern.test(url)) {
      return enhancer;
    }
  }
  return null;
}

export function getActiveEnhancerName(pageUrl) {
  const enhancer = getActiveEnhancer(pageUrl);
  return enhancer ? enhancer.name : null;
}

export function getEnhancerDisplayName(name) {
  const enhancer = enhancers.find((item) => item.name === name);
  return enhancer?.displayName || enhancer?.name || name;
}

export function enhanceVideoUrl(url) {
  if (!url) return url;
  for (const enhancer of enhancers) {
    if (enhancer.urlPattern.test(url)) {
      return enhancer.enhance(url);
    }
  }
  return url;
}
