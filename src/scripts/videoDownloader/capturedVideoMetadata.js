function toPositiveNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getFrameKey(video) {
  return String(video?.frameUrl || '');
}

function hasUsefulPlaybackMetadata(video) {
  return (
    toPositiveNumber(video?.duration) > 0 ||
    toPositiveNumber(video?.width) > 0 ||
    toPositiveNumber(video?.height) > 0 ||
    Boolean(String(video?.poster || '').trim())
  );
}

/**
 * HLS/DASH players commonly expose a blob URL on the <video> element while the
 * downloadable manifest is only visible in network traffic. When a frame has a
 * single metadata-bearing blob video, copy its playback metadata to manifests
 * captured from the same frame.
 */
export function enrichManifestMetadataFromBlobVideos(videos) {
  const input = Array.isArray(videos) ? videos : [];
  const blobSourcesByFrame = new Map();

  input.forEach((video) => {
    if (video?.type !== 'blob' || !hasUsefulPlaybackMetadata(video)) return;

    const frameKey = getFrameKey(video);
    const sources = blobSourcesByFrame.get(frameKey) || [];
    sources.push(video);
    blobSourcesByFrame.set(frameKey, sources);
  });

  return input.map((video) => {
    if (video?.type !== 'm3u8' && video?.type !== 'dash') return video;

    const sources = blobSourcesByFrame.get(getFrameKey(video)) || [];
    if (sources.length !== 1) return video;

    const source = sources[0];
    return {
      ...video,
      duration: toPositiveNumber(video.duration) || toPositiveNumber(source.duration),
      width: toPositiveNumber(video.width) || toPositiveNumber(source.width),
      height: toPositiveNumber(video.height) || toPositiveNumber(source.height),
      poster: String(video.poster || '').trim() || String(source.poster || '').trim(),
      title: String(video.title || '').trim() || String(source.title || '').trim(),
    };
  });
}
