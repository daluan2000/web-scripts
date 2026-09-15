import test from 'node:test';
import assert from 'node:assert/strict';

import { ImageDimensionResolver } from '../imageDimensionResolver.js';

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('dimension resolver deduplicates URLs and respects concurrency', async () => {
  const pending = new Map();
  const resolved = [];
  let active = 0;
  let maxActive = 0;

  const resolver = new ImageDimensionResolver({
    concurrency: 2,
    timeout: 1000,
    loadImage: (url) => new Promise((resolve) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      pending.set(url, (dimensions) => {
        active -= 1;
        resolve(dimensions);
      });
    }),
    onResolved: (src, width, height) => resolved.push({ src, width, height }),
  });

  resolver.enqueue([
    { src: 'a', width: 0, height: 0 },
    { src: 'a', width: 0, height: 0 },
    { src: 'b', width: 0, height: 0 },
    { src: 'c', width: 0, height: 0 },
    { src: 'known', width: 20, height: 20 },
  ]);
  await flushPromises();

  assert.equal(active, 2);
  assert.equal(resolver.getProgress().total, 3);

  pending.get('a')({ width: 100, height: 80 });
  pending.get('b')({ width: 200, height: 160 });
  await flushPromises();
  assert.equal(active, 1);

  pending.get('c')({ width: 300, height: 240 });
  await flushPromises();

  assert.equal(maxActive, 2);
  assert.deepEqual(resolved.map((item) => item.src).sort(), ['a', 'b', 'c']);
  assert.deepEqual(resolver.getProgress(), {
    total: 3,
    completed: 3,
    active: 0,
    pending: 0,
  });
});

test('failed and timed out dimensions remain unresolved', async () => {
  const resolved = [];
  const resolver = new ImageDimensionResolver({
    concurrency: 2,
    timeout: 5,
    loadImage: (url) => url === 'failed'
      ? Promise.reject(new Error('failed'))
      : new Promise(() => {}),
    onResolved: (...args) => resolved.push(args),
  });

  resolver.enqueue([
    { src: 'failed', width: 0, height: 0 },
    { src: 'timeout', width: 0, height: 0 },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(resolved, []);
  assert.equal(resolver.getProgress().completed, 2);
  assert.equal(resolver.getProgress().pending, 0);
});

test('reset ignores dimensions returned by stale active work', async () => {
  let completeLoad;
  const resolved = [];
  const resolver = new ImageDimensionResolver({
    concurrency: 1,
    timeout: 1000,
    loadImage: () => new Promise((resolve) => {
      completeLoad = resolve;
    }),
    onResolved: (...args) => resolved.push(args),
  });

  resolver.enqueue([{ src: 'stale', width: 0, height: 0 }]);
  await flushPromises();
  resolver.reset();
  completeLoad({ width: 640, height: 480 });
  await flushPromises();

  assert.deepEqual(resolved, []);
  assert.deepEqual(resolver.getProgress(), {
    total: 0,
    completed: 0,
    active: 0,
    pending: 0,
  });
});
