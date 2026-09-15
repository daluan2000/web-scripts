import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getImageDedupKey,
  normalizeCapturedImageUrl,
} from '../imageUrl.js';

test('protocol-relative image URLs normalize to absolute URLs', () => {
  assert.equal(
    normalizeCapturedImageUrl(
      '//i1.hdslb.com/bfs/static/example.gif@3840w.avif',
      'https://www.bilibili.com/video/BV1'
    ),
    'https://i1.hdslb.com/bfs/static/example.gif@3840w.avif'
  );
});

test('Bilibili protocol variants normalize while different formats stay independent', () => {
  const urls = [
    'https://i1.hdslb.com/bfs/static/jinkela/long/images/wlpip-playing-active.gif@3840w.avif',
    normalizeCapturedImageUrl(
      '//i1.hdslb.com/bfs/static/jinkela/long/images/wlpip-playing-active.gif@3840w.avif',
      'https://www.bilibili.com/'
    ),
    normalizeCapturedImageUrl(
      '//i1.hdslb.com/bfs/static/jinkela/long/images/wlpip-playing-active.gif@3840w.webp',
      'https://www.bilibili.com/'
    ),
  ];

  assert.equal(getImageDedupKey(urls[0]), getImageDedupKey(urls[1]));
  assert.notEqual(getImageDedupKey(urls[0]), getImageDedupKey(urls[2]));
  assert.equal(new Set(urls.map(getImageDedupKey)).size, 2);
});

test('output format remains significant for non-Bilibili images', () => {
  assert.notEqual(
    getImageDedupKey('https://example.com/image.jpg@3840w.avif'),
    getImageDedupKey('https://example.com/image.jpg@3840w.webp')
  );
});
