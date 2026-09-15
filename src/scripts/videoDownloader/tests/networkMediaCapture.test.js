import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NetworkMediaCollector,
  classifyNetworkMedia,
  installNetworkMediaHooks,
} from '../networkMediaCapture.js';

test('classifies manifests and preserves signed query parameters', () => {
  const hls = classifyNetworkMedia(
    'https://cdn.example/video/master.m3u8?token=abc%20123#player'
  );
  const dash = classifyNetworkMedia({
    src: '/play?id=42',
    mimeType: 'application/dash+xml; charset=utf-8',
  }, { baseUrl: 'https://example.com/watch' });

  assert.equal(hls.type, 'm3u8');
  assert.equal(hls.src, 'https://cdn.example/video/master.m3u8?token=abc%20123');
  assert.equal(hls.supported, true);
  assert.equal(dash.type, 'dash');
  assert.equal(dash.src, 'https://example.com/play?id=42');
  assert.equal(dash.supported, true);
});

test('uses response MIME for extensionless and dynamic media endpoints', () => {
  const direct = classifyNetworkMedia({
    src: 'https://example.com/video.php?id=7',
    mimeType: 'video/mp4',
  });
  const hls = classifyNetworkMedia({
    src: 'https://example.com/play?id=7',
    mimeType: 'application/vnd.apple.mpegurl',
  });

  assert.equal(direct.type, 'mp4');
  assert.equal(direct.supported, true);
  assert.equal(hls.type, 'm3u8');
});

test('collector counts segments without retaining their URLs', () => {
  const collector = new NetworkMediaCollector({ baseUrl: 'https://example.com/' });

  collector.add('/segments/1.ts?token=secret');
  collector.add('/segments/1.ts?token=secret');
  collector.add('/segments/2.ts?token=secret');
  collector.add('/video/track-1.m4s');

  const snapshot = collector.getSnapshot();
  assert.deepEqual(snapshot.videos, []);
  assert.deepEqual(snapshot.segmentSummary, { ts: 2, m4s: 1, blob: 0 });
});

test('collector deduplicates candidates and enforces its size limit', () => {
  const collector = new NetworkMediaCollector({ maxCandidates: 2 });

  collector.add('https://cdn.example/one.mp4');
  collector.add({
    src: 'https://cdn.example/one.mp4',
    mimeType: 'video/mp4',
    captureSource: 'response',
  });
  collector.add('https://cdn.example/two.webm');
  collector.add('https://cdn.example/three.m3u8');

  const snapshot = collector.getSnapshot();
  assert.deepEqual(
    snapshot.videos.map((video) => video.src),
    ['https://cdn.example/two.webm', 'https://cdn.example/three.m3u8']
  );
});

test('collector collapses blob observations to one diagnostic candidate', () => {
  const collector = new NetworkMediaCollector();
  collector.add({ src: 'blob:https://example.com/one', blobKind: 'media-source' });
  collector.add({ src: 'blob:https://example.com/two', blobKind: 'media-source' });

  const snapshot = collector.getSnapshot();
  assert.equal(snapshot.videos.length, 1);
  assert.equal(snapshot.videos[0].type, 'blob');
  assert.equal(snapshot.videos[0].blobKind, 'media-source');
  assert.equal(snapshot.videos[0].blobCount, 2);
  assert.equal(snapshot.segmentSummary.blob, 2);
});

test('network hooks observe fetch without changing the returned promise', async () => {
  const captured = [];
  let originalPromise;
  const response = {
    url: 'https://cdn.example/final/video',
    headers: {
      get: () => 'video/mp4',
    },
  };
  const pageWindow = createFakeWindow();
  pageWindow.fetch = function () {
    originalPromise = Promise.resolve(response);
    return originalPromise;
  };

  const hooks = installNetworkMediaHooks({
    pageWindow,
    onCandidate: (candidate) => captured.push(candidate),
  });

  const returnedPromise = pageWindow.fetch('https://cdn.example/request?id=1');
  assert.equal(returnedPromise, originalPromise);
  await returnedPromise;
  await Promise.resolve();

  assert.equal(captured.some((item) => item.src === response.url), true);
  assert.equal(captured.some((item) => item.mimeType === 'video/mp4'), true);

  hooks.cleanup();
});

test('network hooks observe XHR, Performance entries and createObjectURL', () => {
  const captured = [];
  const pageWindow = createFakeWindow();
  const hooks = installNetworkMediaHooks({
    pageWindow,
    onCandidate: (candidate) => captured.push(candidate),
  });

  const xhr = new pageWindow.XMLHttpRequest();
  assert.equal(xhr.open('GET', 'https://cdn.example/master.m3u8'), 'opened');
  xhr.responseURL = 'https://cdn.example/redirected/master.m3u8';
  xhr.dispatch('loadend');

  const mediaSource = new pageWindow.MediaSource();
  const blobUrl = pageWindow.URL.createObjectURL(mediaSource);

  assert.equal(blobUrl, 'blob:https://example.com/generated');
  assert.equal(
    captured.some((item) => item.src === 'https://cdn.example/initial.mp4'),
    true
  );
  assert.equal(
    captured.some((item) => item.src === 'https://cdn.example/redirected/master.m3u8'),
    true
  );
  assert.equal(
    captured.some((item) => item.src === blobUrl && item.blobKind === 'media-source'),
    true
  );

  hooks.cleanup();
});

test('installing hooks twice does not wrap page APIs twice', () => {
  const pageWindow = createFakeWindow();
  const first = installNetworkMediaHooks({ pageWindow, onCandidate: () => {} });
  const wrappedFetch = pageWindow.fetch;
  const second = installNetworkMediaHooks({ pageWindow, onCandidate: () => {} });

  assert.equal(first, second);
  assert.equal(pageWindow.fetch, wrappedFetch);

  first.cleanup();
});

function createFakeWindow() {
  class FakeMediaSource {}
  class FakeBlob {}
  class FakeXHR {
    constructor() {
      this.listeners = new Map();
      this.responseURL = '';
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    open() {
      return 'opened';
    }

    getResponseHeader() {
      return 'application/vnd.apple.mpegurl';
    }

    dispatch(type) {
      this.listeners.get(type)?.call(this);
    }
  }

  class FakePerformanceObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {}

    disconnect() {}
  }

  return {
    location: { href: 'https://example.com/watch' },
    fetch() {
      return Promise.resolve({ url: '', headers: { get: () => '' } });
    },
    XMLHttpRequest: FakeXHR,
    MediaSource: FakeMediaSource,
    Blob: FakeBlob,
    URL: {
      createObjectURL() {
        return 'blob:https://example.com/generated';
      },
    },
    performance: {
      getEntriesByType() {
        return [{ name: 'https://cdn.example/initial.mp4', initiatorType: 'video' }];
      },
    },
    PerformanceObserver: FakePerformanceObserver,
  };
}
