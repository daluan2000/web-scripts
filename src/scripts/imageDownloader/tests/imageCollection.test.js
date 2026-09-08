import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ImageCollection,
  sortImagesByDomPath,
} from '../imageCollection.js';

const galleryPath = (index) => [
  'html:nth-of-type(1)',
  'body:nth-of-type(1)',
  'div:nth-of-type(1)',
  `img:nth-of-type(${index})`,
];

function image(src, pathIndex, options = {}) {
  return {
    src,
    domPath: options.domPath || galleryPath(pathIndex),
    width: options.width || 0,
    height: options.height || 0,
    alt: options.alt || '',
    element: options.element,
    // 旧排序字段故意保留在输入中，用于验证它们不会影响排序或被持久化。
    pageRect: options.pageRect,
    ancestorRects: options.ancestorRects,
    captureOrder: options.captureOrder,
  };
}

test('twenty direct img children are sorted by numeric DOM path order', () => {
  const shuffled = [20, 10, 2, 1, 11, 3, 19, 4, 18, 5, 17, 6, 16, 7, 15, 8, 14, 9, 13, 12]
    .map((index) => image(`https://img.test/${index}.jpg`, index));

  assert.deepEqual(
    sortImagesByDomPath(shuffled).map((item) => item.src),
    Array.from({ length: 20 }, (_, index) => `https://img.test/${index + 1}.jpg`)
  );
});

test('page coordinates and capture order do not affect DOM path sorting', () => {
  const sorted = sortImagesByDomPath([
    image('https://img.test/10.jpg', 10, {
      pageRect: { top: 0, left: 0 },
      captureOrder: 0,
    }),
    image('https://img.test/2.jpg', 2, {
      pageRect: { top: 9999, left: 9999 },
      captureOrder: 9999,
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.src),
    ['https://img.test/2.jpg', 'https://img.test/10.jpg']
  );
});

test('equal DOM paths use natural URL order instead of capture order', () => {
  const samePath = galleryPath(1);
  const sorted = sortImagesByDomPath([
    image('https://img.test/image-10.jpg', 1, { domPath: samePath, captureOrder: 0 }),
    image('https://img.test/image-2.jpg', 1, { domPath: samePath, captureOrder: 1 }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.src),
    ['https://img.test/image-2.jpg', 'https://img.test/image-10.jpg']
  );
});

test('ImageCollection accumulates URLs and strips obsolete sorting metadata', () => {
  const collection = new ImageCollection();
  const first = collection.merge([
    image('https://img.test/a.jpg', 2, {
      pageRect: { top: 100, left: 20 },
      ancestorRects: [{ top: 0, left: 0 }],
      captureOrder: 7,
      element: {},
    }),
  ]);
  const second = collection.merge([image('https://img.test/b.jpg', 1)]);

  assert.deepEqual(first, { added: 1, updated: 0, changed: true });
  assert.deepEqual(second, { added: 1, updated: 0, changed: true });
  assert.equal(collection.size, 2);

  const storedA = collection.getSortedImages().find((item) => item.src.endsWith('/a.jpg'));
  assert.equal(storedA.element, undefined);
  assert.equal(storedA.pageRect, undefined);
  assert.equal(storedA.ancestorRects, undefined);
  assert.equal(storedA.captureOrder, undefined);
});

test('a changed path for an existing URL is stored and reports changed', () => {
  const collection = new ImageCollection();
  collection.merge([
    image('https://img.test/a.jpg', 1),
    image('https://img.test/b.jpg', 2),
  ]);

  const result = collection.merge([image('https://img.test/a.jpg', 3)]);

  assert.deepEqual(result, { added: 0, updated: 1, changed: true });
  assert.deepEqual(
    collection.getSortedImages().map((item) => item.src),
    ['https://img.test/b.jpg', 'https://img.test/a.jpg']
  );
  assert.deepEqual(
    collection.getSortedImages().find((item) => item.src.endsWith('/a.jpg')).domPath,
    galleryPath(3)
  );
});

test('an unchanged URL and path do not report a collection change', () => {
  const collection = new ImageCollection();
  collection.merge([image('https://img.test/a.jpg', 1)]);

  assert.deepEqual(
    collection.merge([image('https://img.test/a.jpg', 1)]),
    { added: 0, updated: 0, changed: false }
  );
});

test('the last occurrence of a URL in a merge replaces its earlier path', () => {
  const collection = new ImageCollection();
  collection.merge([
    image('https://img.test/a.jpg', 2),
    image('https://img.test/a.jpg', 10),
  ]);

  assert.equal(collection.size, 1);
  assert.deepEqual(collection.getSortedImages()[0].domPath, galleryPath(10));
});

test('merge keeps accumulated URLs that are absent from a later scan', () => {
  const collection = new ImageCollection();
  collection.merge([
    image('https://img.test/a.jpg', 1),
    image('https://img.test/b.jpg', 2),
  ]);
  collection.merge([image('https://img.test/b.jpg', 2)]);

  assert.equal(collection.size, 2);
});

test('replace clears the previous snapshot before sorting the new one', () => {
  const collection = new ImageCollection();
  collection.merge([image('https://img.test/old.jpg', 1)]);
  const result = collection.replace([image('https://img.test/new.jpg', 1)]);

  assert.equal(result.changed, true);
  assert.deepEqual(
    collection.getSortedImages().map((item) => item.src),
    ['https://img.test/new.jpg']
  );
});
