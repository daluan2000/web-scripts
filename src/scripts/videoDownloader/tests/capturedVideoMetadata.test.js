import test from 'node:test';
import assert from 'node:assert/strict';

import { enrichManifestMetadataFromBlobVideos } from '../capturedVideoMetadata.js';

test('copies playback metadata from a single blob video to manifests in the same frame', () => {
  const videos = enrichManifestMetadataFromBlobVideos([
    {
      src: 'blob:https://player.example/video',
      type: 'blob',
      frameUrl: 'https://player.example/embed/1',
      duration: 125,
      width: 1920,
      height: 1080,
      poster: 'https://player.example/poster.jpg',
      title: 'Episode 1',
    },
    {
      src: 'https://cdn.example/index.m3u8',
      type: 'm3u8',
      frameUrl: 'https://player.example/embed/1',
      duration: 0,
    },
  ]);

  assert.equal(videos[1].duration, 125);
  assert.equal(videos[1].width, 1920);
  assert.equal(videos[1].height, 1080);
  assert.equal(videos[1].poster, 'https://player.example/poster.jpg');
  assert.equal(videos[1].title, 'Episode 1');
});

test('does not overwrite manifest metadata that is already available', () => {
  const videos = enrichManifestMetadataFromBlobVideos([
    {
      src: 'blob:https://player.example/video',
      type: 'blob',
      frameUrl: 'https://player.example/embed/1',
      duration: 125,
      width: 1920,
      height: 1080,
    },
    {
      src: 'https://cdn.example/index.m3u8',
      type: 'm3u8',
      frameUrl: 'https://player.example/embed/1',
      duration: 99,
      width: 1280,
      height: 720,
    },
  ]);

  assert.equal(videos[1].duration, 99);
  assert.equal(videos[1].width, 1280);
  assert.equal(videos[1].height, 720);
});

test('does not guess when a frame contains multiple blob videos', () => {
  const videos = enrichManifestMetadataFromBlobVideos([
    {
      src: 'blob:https://player.example/one',
      type: 'blob',
      frameUrl: 'https://player.example/embed/1',
      duration: 60,
    },
    {
      src: 'blob:https://player.example/two',
      type: 'blob',
      frameUrl: 'https://player.example/embed/1',
      duration: 120,
    },
    {
      src: 'https://cdn.example/index.m3u8',
      type: 'm3u8',
      frameUrl: 'https://player.example/embed/1',
      duration: 0,
    },
  ]);

  assert.equal(videos[2].duration, 0);
});

test('does not copy metadata between frames', () => {
  const videos = enrichManifestMetadataFromBlobVideos([
    {
      src: 'blob:https://player.example/video',
      type: 'blob',
      frameUrl: 'https://player.example/embed/1',
      duration: 125,
    },
    {
      src: 'https://cdn.example/index.m3u8',
      type: 'm3u8',
      frameUrl: 'https://player.example/embed/2',
      duration: 0,
    },
  ]);

  assert.equal(videos[1].duration, 0);
});
