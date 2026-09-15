import { getImageDedupKey } from './imageUrl.js';

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'variant',
});

function naturalCompare(a, b) {
  const valueA = String(a || '');
  const valueB = String(b || '');
  const result = naturalCollator.compare(valueA, valueB);

  if (result !== 0 || valueA === valueB) return result;
  return valueA < valueB ? -1 : 1;
}

function getDomPath(image) {
  return Array.isArray(image?.domPath) ? image.domPath : [];
}

function arePathsEqual(a, b) {
  const pathA = getDomPath(a);
  const pathB = getDomPath(b);

  return pathA.length === pathB.length &&
    pathA.every((segment, index) => segment === pathB[index]);
}

function compareImagesByDomPath(a, b) {
  return naturalCompare(getDomPath(a).join('>'), getDomPath(b).join('>')) ||
    naturalCompare(a?.src, b?.src);
}

/**
 * 按 DOM path 自然排序，路径相同时按 URL 自然排序。
 */
export function sortImagesByDomPath(images) {
  return Array.isArray(images) ? [...images].sort(compareImagesByDomPath) : [];
}

function copyImageRecord(image) {
  const {
    element: _element,
    pageRect: _pageRect,
    ancestorRects: _ancestorRects,
    captureOrder: _captureOrder,
    ...record
  } = image;

  return {
    ...record,
    domPath: [...getDomPath(image)],
  };
}

/**
 * 当前页面会话内的图片集合。使用规范化资源标识去重，不持久化 DOM 节点。
 */
export class ImageCollection {
  constructor() {
    this.records = new Map();
  }

  clear() {
    const changed = this.records.size > 0;
    this.records.clear();
    return { added: 0, updated: 0, changed };
  }

  replace(images) {
    this.clear();
    const result = this.merge(images);
    return { ...result, changed: true };
  }

  merge(images) {
    let added = 0;
    let updated = 0;
    let changed = false;

    for (const image of Array.isArray(images) ? images : []) {
      const src = typeof image?.src === 'string' ? image.src : '';
      if (!src) continue;
      const dedupKey = getImageDedupKey(src);

      const existing = this.records.get(dedupKey);
      if (!existing) {
        this.records.set(dedupKey, copyImageRecord(image));
        added += 1;
        changed = true;
        continue;
      }

      const patch = {};
      if (!existing.width && image.width) patch.width = image.width;
      if (!existing.height && image.height) patch.height = image.height;
      if (!existing.alt && image.alt) patch.alt = image.alt;

      // 同一 URL 始终使用最后扫描到的 path；path 变化必须触发重排。
      if (!arePathsEqual(existing, image)) {
        patch.domPath = [...getDomPath(image)];
      }

      if (Object.keys(patch).length > 0) {
        Object.assign(existing, patch);
        updated += 1;
        changed = true;
      }
    }

    return { added, updated, changed };
  }

  getSortedImages() {
    return sortImagesByDomPath(Array.from(this.records.values()));
  }

  updateDimensions(src, width, height) {
    const record = this.records.get(getImageDedupKey(src));
    const nextWidth = Number(width);
    const nextHeight = Number(height);

    if (
      !record ||
      !Number.isFinite(nextWidth) || nextWidth <= 0 ||
      !Number.isFinite(nextHeight) || nextHeight <= 0
    ) {
      return false;
    }

    if (record.width === nextWidth && record.height === nextHeight) {
      return false;
    }

    record.width = nextWidth;
    record.height = nextHeight;
    return true;
  }

  get size() {
    return this.records.size;
  }
}
