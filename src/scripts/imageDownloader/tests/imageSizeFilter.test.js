import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SIZE_FILTER,
  filterImagesBySize,
  isKnownImageSize,
  isSizeFilterActive,
  normalizeStoredSizeFilter,
  validateSizeFilter,
} from '../imageSizeFilter.js';

const images = [
  { src: 'small', width: 100, height: 80 },
  { src: 'boundary', width: 200, height: 150 },
  { src: 'large', width: 400, height: 300 },
  { src: 'unknown', width: 0, height: 0 },
  { src: 'partial', width: 200, height: 0 },
];

test('default size filter includes every image and is inactive', () => {
  assert.deepEqual(
    filterImagesBySize(images, DEFAULT_SIZE_FILTER).map((image) => image.src),
    images.map((image) => image.src)
  );
  assert.equal(isSizeFilterActive(DEFAULT_SIZE_FILTER), false);
});

test('width and height bounds are inclusive and combined with AND', () => {
  const result = filterImagesBySize(images, {
    minWidth: 200,
    maxWidth: 400,
    minHeight: 150,
    maxHeight: 300,
    includeUnknown: false,
  });

  assert.deepEqual(result.map((image) => image.src), ['boundary', 'large']);
});

test('unknown and partially known sizes follow includeUnknown', () => {
  const base = {
    minWidth: 150,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
  };

  assert.deepEqual(
    filterImagesBySize(images, { ...base, includeUnknown: true }).map((image) => image.src),
    ['boundary', 'large', 'unknown', 'partial']
  );
  assert.deepEqual(
    filterImagesBySize(images, { ...base, includeUnknown: false }).map((image) => image.src),
    ['boundary', 'large']
  );
  assert.equal(isKnownImageSize(images[3]), false);
  assert.equal(isKnownImageSize(images[4]), false);
});

test('validation rejects non-positive, fractional and reversed ranges', () => {
  const validation = validateSizeFilter({
    minWidth: '300',
    maxWidth: '200',
    minHeight: '1.5',
    maxHeight: '0',
    includeUnknown: true,
  });

  assert.equal(validation.valid, false);
  assert.equal(Boolean(validation.errors.minWidth), true);
  assert.equal(Boolean(validation.errors.maxWidth), true);
  assert.equal(Boolean(validation.errors.minHeight), true);
  assert.equal(Boolean(validation.errors.maxHeight), true);
});

test('valid string inputs normalize to numbers and blank bounds to null', () => {
  const validation = validateSizeFilter({
    minWidth: '120',
    maxWidth: '',
    minHeight: null,
    maxHeight: '900',
    includeUnknown: false,
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.settings, {
    minWidth: 120,
    maxWidth: null,
    minHeight: null,
    maxHeight: 900,
    includeUnknown: false,
  });
});

test('corrupt or legacy stored settings fall back to defaults', () => {
  assert.deepEqual(normalizeStoredSizeFilter(null), DEFAULT_SIZE_FILTER);
  assert.deepEqual(
    normalizeStoredSizeFilter({ minWidth: 100 }),
    DEFAULT_SIZE_FILTER
  );
});
