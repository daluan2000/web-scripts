import { ResourceSelector } from '@/shared/resourceSelector.js';

function getFileName(url) {
  if (!url) return '未命名';
  const parts = String(url).split('/');
  const filename = parts[parts.length - 1]?.split('?')[0] || '未命名';
  try {
    return decodeURIComponent(filename) || '未命名';
  } catch {
    return filename || '未命名';
  }
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);
  if (!value || !Number.isFinite(value)) return '--:--';
  const hours = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatType(type) {
  if (!type) return 'video';
  if (type === 'm3u8') return 'HLS';
  if (type === 'dash') return 'DASH';
  if (type === 'blob') return 'BLOB';
  return String(type).toUpperCase();
}

/**
 * 视频选择器
 */
export class VideoSelector extends ResourceSelector {
  constructor(options) {
    super({
      ...options,
      emptyText: '未找到视频资源',
      classNames: {
        item: 'vd-video-item',
        selected: 'selected',
        empty: 'vd-empty',
        thumb: 'vd-video-thumb',
        checkbox: 'vd-checkbox',
        info: 'vd-video-info',
      },
      createThumbnail: (video, index, helpers) => {
        const thumb = helpers.createElement('div', { className: 'vd-video-thumb' });

        if (video.poster) {
          const imgEl = helpers.createElement('img', {
            src: video.poster,
            alt: video.title || `视频 ${index + 1}`,
            loading: 'lazy',
            onerror: () => {
              thumb.classList.add('vd-video-thumb-fallback');
            },
          });
          thumb.appendChild(imgEl);
        } else if (video.type !== 'm3u8' && video.type !== 'dash' && video.type !== 'blob') {
          const videoEl = helpers.createElement('video', {
            src: video.src,
            preload: 'metadata',
            muted: 'muted',
            playsinline: 'playsinline',
          });

          videoEl.onloadedmetadata = () => {
            const nextDuration = Number.isFinite(videoEl.duration) ? Math.round(videoEl.duration) : 0;
            helpers.updateResource({
              duration: nextDuration,
              width: videoEl.videoWidth || video.width || 0,
              height: videoEl.videoHeight || video.height || 0,
            });
          };

          videoEl.onerror = () => {
            thumb.classList.add('vd-video-thumb-fallback');
            videoEl.remove();
          };

          thumb.appendChild(videoEl);
        } else {
          thumb.classList.add('vd-video-thumb-fallback');
        }

        const playBadge = helpers.createElement('span', { className: 'vd-play-badge' }, '▶');
        thumb.appendChild(playBadge);

        thumb.addEventListener('click', () => {
          helpers.toggle();
        });

        return thumb;
      },
      createInfo: (video, index, helpers) => {
        const info = helpers.createElement('div', { className: 'vd-video-info' });
        const filename = getFileName(video.src);

        const meta = `${formatType(video.type)}  ·  ${formatDuration(video.duration)}`;

        info.appendChild(
          helpers.createElement(
            'span',
            { className: 'vd-filename', title: video.src },
            truncate(filename, 26)
          )
        );

        info.appendChild(
          helpers.createElement('span', { className: 'vd-meta' }, meta)
        );

        if (!video.supported) {
          info.appendChild(
            helpers.createElement('span', { className: 'vd-badge vd-badge-unsupported' }, '暂不支持')
          );
        } else if (video.type === 'm3u8') {
          info.appendChild(
            helpers.createElement('span', { className: 'vd-badge vd-badge-hls' }, 'm3u8')
          );
        }

        return info;
      },
    });
  }

  getSelectedVideos() {
    return this.getSelectedResources();
  }
}
