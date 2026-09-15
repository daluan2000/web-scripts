export const DEFAULT_SIZE_FILTER = Object.freeze({
  minWidth: null,
  maxWidth: null,
  minHeight: null,
  maxHeight: null,
  includeUnknown: true,
});

const DIMENSION_KEYS = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'];

export function isKnownImageSize(image) {
  return Number.isFinite(image?.width) && image.width > 0 &&
    Number.isFinite(image?.height) && image.height > 0;
}

function parseBound(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true, value: null };
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    return { valid: false, value: null };
  }

  return { valid: true, value: number };
}

/**
 * 校验来自筛选表单或存储的数据。
 * @returns {{valid: boolean, settings: object|null, errors: object}}
 */
export function validateSizeFilter(input) {
  const errors = {};
  const settings = {};

  for (const key of DIMENSION_KEYS) {
    const parsed = parseBound(input?.[key]);
    if (!parsed.valid) {
      errors[key] = '请输入大于 0 的整数';
    }
    settings[key] = parsed.value;
  }

  if (typeof input?.includeUnknown !== 'boolean') {
    errors.includeUnknown = '未知尺寸选项无效';
  }
  settings.includeUnknown = input?.includeUnknown === true;

  if (
    settings.minWidth !== null &&
    settings.maxWidth !== null &&
    settings.minWidth > settings.maxWidth
  ) {
    errors.minWidth = '宽度最小值不能大于最大值';
    errors.maxWidth = '宽度最小值不能大于最大值';
  }

  if (
    settings.minHeight !== null &&
    settings.maxHeight !== null &&
    settings.minHeight > settings.maxHeight
  ) {
    errors.minHeight = '高度最小值不能大于最大值';
    errors.maxHeight = '高度最小值不能大于最大值';
  }

  return {
    valid: Object.keys(errors).length === 0,
    settings: Object.keys(errors).length === 0 ? settings : null,
    errors,
  };
}

export function normalizeStoredSizeFilter(value) {
  const validation = validateSizeFilter(value);
  return validation.valid
    ? validation.settings
    : { ...DEFAULT_SIZE_FILTER };
}

export function isSizeFilterActive(settings) {
  return DIMENSION_KEYS.some((key) => settings?.[key] !== null) ||
    settings?.includeUnknown === false;
}

export function filterImagesBySize(images, settings) {
  const list = Array.isArray(images) ? images : [];
  const filter = normalizeStoredSizeFilter(settings);

  return list.filter((image) => {
    if (!isKnownImageSize(image)) return filter.includeUnknown;

    if (filter.minWidth !== null && image.width < filter.minWidth) return false;
    if (filter.maxWidth !== null && image.width > filter.maxWidth) return false;
    if (filter.minHeight !== null && image.height < filter.minHeight) return false;
    if (filter.maxHeight !== null && image.height > filter.maxHeight) return false;
    return true;
  });
}
