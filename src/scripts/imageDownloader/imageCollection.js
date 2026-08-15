const MIN_COMMON_PREFIX_RATIO = 0.7;
const ANCHOR_TOLERANCE_PX = 48;

function numberOr(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeRect(rect = {}) {
  const top = numberOr(rect.top);
  const left = numberOr(rect.left);
  const width = Math.max(0, numberOr(rect.width));
  const height = Math.max(0, numberOr(rect.height));

  return {
    top,
    left,
    width,
    height,
    right: numberOr(rect.right, left + width),
    bottom: numberOr(rect.bottom, top + height),
  };
}

function compareRects(a, b) {
  const rectA = normalizeRect(a);
  const rectB = normalizeRect(b);
  return rectA.top - rectB.top || rectA.left - rectB.left;
}

function areAnchorsCompatible(a, b) {
  const rectA = normalizeRect(a);
  const rectB = normalizeRect(b);
  const overlapsHorizontally =
    rectA.left <= rectB.right + ANCHOR_TOLERANCE_PX &&
    rectB.left <= rectA.right + ANCHOR_TOLERANCE_PX;
  const overlapsVertically =
    rectA.top <= rectB.bottom + ANCHOR_TOLERANCE_PX &&
    rectB.top <= rectA.bottom + ANCHOR_TOLERANCE_PX;

  return overlapsHorizontally && overlapsVertically;
}

function getAnchor(image, depth) {
  return image.ancestorRects?.[depth - 1] || image.pageRect || {};
}

function getPrefixKey(path, depth) {
  return `${path.length}|${depth}|${path.slice(0, depth).join('>')}`;
}

function createDisjointSet(size) {
  const parents = Array.from({ length: size }, (_, index) => index);

  function find(index) {
    let current = index;
    while (parents[current] !== current) {
      parents[current] = parents[parents[current]];
      current = parents[current];
    }
    return current;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parents[rootB] = rootA;
    }
  }

  return { find, union };
}

function compareImages(a, b) {
  return (
    compareRects(a.pageRect, b.pageRect) ||
    String(a.domPath?.join('>') || '').localeCompare(String(b.domPath?.join('>') || '')) ||
    numberOr(a.captureOrder) - numberOr(b.captureOrder)
  );
}

/**
 * 按 DOM path 公共前缀聚合图片，并保证同组图片连续。
 */
export function sortImagesByDomGroup(images) {
  if (!Array.isArray(images) || images.length <= 1) {
    return Array.isArray(images) ? [...images] : [];
  }

  const ordered = [...images].sort(
    (a, b) => numberOr(a.captureOrder) - numberOr(b.captureOrder)
  );
  const disjointSet = createDisjointSet(ordered.length);
  const prefixIndex = new Map();

  ordered.forEach((image, index) => {
    const path = Array.isArray(image.domPath) ? image.domPath : [];
    if (path.length === 0) return;

    const minDepth = Math.max(1, Math.ceil(path.length * MIN_COMMON_PREFIX_RATIO));

    for (let depth = path.length; depth >= minDepth; depth -= 1) {
      const key = getPrefixKey(path, depth);
      const priorIndexes = prefixIndex.get(key) || [];

      if (priorIndexes.length === 0) {
        continue;
      }

      const compatibleIndexes = priorIndexes.filter((priorIndex) =>
        areAnchorsCompatible(getAnchor(image, depth), getAnchor(ordered[priorIndex], depth))
      );

      // 找到相同的最深结构前缀但位置不兼容时，不回退到更宽泛的祖先。
      // 这可以区分虚拟列表在不同滚动位置复用的相同 DOM 结构。
      if (compatibleIndexes.length === 0) {
        break;
      }

      compatibleIndexes.forEach((priorIndex) => disjointSet.union(index, priorIndex));
      break;
    }

    for (let depth = path.length; depth >= minDepth; depth -= 1) {
      const key = getPrefixKey(path, depth);
      const indexes = prefixIndex.get(key) || [];
      indexes.push(index);
      prefixIndex.set(key, indexes);
    }
  });

  const groups = new Map();
  ordered.forEach((image, index) => {
    const root = disjointSet.find(index);
    const group = groups.get(root) || [];
    group.push(image);
    groups.set(root, group);
  });

  return Array.from(groups.values())
    .map((group) => group.sort(compareImages))
    .sort((a, b) => compareImages(a[0], b[0]))
    .flat();
}

function copyImageRecord(image, captureOrder) {
  return {
    ...image,
    element: undefined,
    domPath: Array.isArray(image.domPath) ? [...image.domPath] : [],
    pageRect: normalizeRect(image.pageRect),
    ancestorRects: Array.isArray(image.ancestorRects)
      ? image.ancestorRects.map(normalizeRect)
      : [],
    captureOrder,
  };
}

/**
 * 当前页面会话内的图片集合。使用最终 URL 去重，不持久化 DOM 节点。
 */
export class ImageCollection {
  constructor() {
    this.records = new Map();
    this.nextCaptureOrder = 0;
  }

  clear() {
    const changed = this.records.size > 0;
    this.records.clear();
    this.nextCaptureOrder = 0;
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
        this.records.set(src, copyImageRecord(image, this.nextCaptureOrder));
        this.nextCaptureOrder += 1;
        added += 1;
        changed = true;
        continue;
      }

      const patch = {};
      if (!existing.width && image.width) patch.width = image.width;
      if (!existing.height && image.height) patch.height = image.height;
      if (!existing.alt && image.alt) patch.alt = image.alt;

      if (compareRects(image.pageRect, existing.pageRect) < 0) {
        patch.domPath = Array.isArray(image.domPath) ? [...image.domPath] : [];
        patch.pageRect = normalizeRect(image.pageRect);
        patch.ancestorRects = Array.isArray(image.ancestorRects)
          ? image.ancestorRects.map(normalizeRect)
          : [];
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
    return sortImagesByDomGroup(Array.from(this.records.values()));
  }

  get size() {
    return this.records.size;
  }
}

export const imageGroupingConfig = {
  minCommonPrefixRatio: MIN_COMMON_PREFIX_RATIO,
  anchorTolerancePx: ANCHOR_TOLERANCE_PX,
};
