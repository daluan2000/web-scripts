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
 * 当前页面会话内的图片集合。使用最终 URL 去重，不持久化 DOM 节点。
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

      const existing = this.records.get(src);
      if (!existing) {
        this.records.set(src, copyImageRecord(image));
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

  get size() {
    return this.records.size;
  }
}
