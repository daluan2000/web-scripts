import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ImageCollection,
  sortImagesByDomGroup,
} from '../imageCollection.js';

function rect(top, left = 0, width = 100, height = 100) {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function image(src, options = {}) {
  const domPath = options.domPath || [
    'html:1',
    'body:1',
    'main:1',
    'section:1',
    'div:1',
    'article:1',
    'div:1',
    'figure:1',
    'img:1',
  ];
  const pageRect = rect(options.top || 0, options.left || 0, 80, 80);
  const groupRect = options.groupRect || pageRect;
  const ancestorRects = domPath.map((_, index) =>
    index >= 5 ? groupRect : rect(0, 0, 1200, 2000)
  );
  ancestorRects[ancestorRects.length - 1] = pageRect;

  return {
    src,
    domPath,
    pageRect,
    ancestorRects,
    captureOrder: options.captureOrder || 0,
    width: options.width || 0,
    height: options.height || 0,
  };
}

test('ImageCollection accumulates scans and deduplicates by URL', () => {
  const collection = new ImageCollection();
  collection.merge([image('https://img.test/a.jpg', { top: 300 })]);
  const result = collection.merge([
    image('https://img.test/a.jpg', { top: 100, width: 640 }),
    image('https://img.test/b.jpg', { top: 200 }),
  ]);

  assert.equal(collection.size, 2);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 1);
  const storedA = collection.getSortedImages().find((item) => item.src.endsWith('/a.jpg'));
  assert.equal(storedA.pageRect.top, 100);
  assert.equal(storedA.width, 640);
  assert.equal(storedA.element, undefined);
});

test('replace clears the previous snapshot before sorting the new one', () => {
  const collection = new ImageCollection();
  collection.merge([image('https://img.test/old.jpg')]);
  collection.replace([image('https://img.test/new.jpg')]);

  assert.deepEqual(
    collection.getSortedImages().map((item) => item.src),
    ['https://img.test/new.jpg']
  );
});

test('images with the same path length and long common prefix stay together', () => {
  const sharedGroupRect = rect(100, 0, 300, 420);
  const firstPath = [
    'html:1', 'body:1', 'main:1', 'section:1', 'div:1',
    'article:1', 'div:1', 'figure:1', 'img:1',
  ];
  const secondPath = [
    'html:1', 'body:1', 'main:1', 'section:1', 'div:1',
    'article:1', 'div:1', 'figure:1', 'img:2',
  ];
  const otherPath = [
    'html:1', 'body:1', 'main:1', 'section:1', 'div:1',
    'article:2', 'div:1', 'figure:1', 'img:1',
  ];

  const sorted = sortImagesByDomGroup([
    image('group-first', {
      domPath: firstPath,
      top: 100,
      groupRect: sharedGroupRect,
      captureOrder: 1,
    }),
    image('other-group', {
      domPath: otherPath,
      top: 250,
      groupRect: rect(250, 0, 300, 100),
      captureOrder: 2,
    }),
    image('group-second', {
      domPath: secondPath,
      top: 450,
      groupRect: sharedGroupRect,
      captureOrder: 3,
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.src),
    ['group-first', 'group-second', 'other-group']
  );
});

test('reused virtual-list path at a different content position is not grouped', () => {
  const reusedPath = [
    'html:1', 'body:1', 'main:1', 'section:1', 'div:1',
    'article:1', 'div:1', 'figure:1', 'img:1',
  ];
  const unrelatedPath = [
    'html:1', 'body:1', 'main:1', 'section:1', 'div:1',
    'article:2', 'div:1', 'figure:1', 'img:1',
  ];

  const sorted = sortImagesByDomGroup([
    image('virtual-first', {
      domPath: reusedPath,
      top: 100,
      groupRect: rect(100),
      captureOrder: 1,
    }),
    image('middle', {
      domPath: unrelatedPath,
      top: 300,
      groupRect: rect(300),
      captureOrder: 2,
    }),
    image('virtual-later', {
      domPath: reusedPath,
      top: 600,
      groupRect: rect(600),
      captureOrder: 3,
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.src),
    ['virtual-first', 'middle', 'virtual-later']
  );
});
