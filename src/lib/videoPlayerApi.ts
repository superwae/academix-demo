/**
 * Load third-party embed APIs once so we can read current time (notes, progress).
 */

let youtubeApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  const w = window as Window & {
    YT?: { Player: new (id: string | HTMLElement, opts: Record<string, unknown>) => unknown };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (w.YT?.Player) return Promise.resolve();

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const finish = () => {
        if (w.YT?.Player) resolve();
      };

      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        finish();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }

      const poll = window.setInterval(() => {
        if (w.YT?.Player) {
          window.clearInterval(poll);
          finish();
        }
      }, 50);
    });
  }

  return youtubeApiPromise;
}

/** Minimal typing for YouTube IFrame API */
export interface YTPlayer {
  destroy(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
}

let vimeoApiPromise: Promise<void> | null = null;

export function loadVimeoPlayerApi(): Promise<void> {
  const w = window as Window & { Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer } };

  if (w.Vimeo?.Player) return Promise.resolve();

  if (!vimeoApiPromise) {
    vimeoApiPromise = new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')) {
        const poll = window.setInterval(() => {
          if (w.Vimeo?.Player) {
            window.clearInterval(poll);
            resolve();
          }
        }, 50);
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://player.vimeo.com/api/player.js';
      tag.async = true;
      tag.onload = () => resolve();
      tag.onerror = () => reject(new Error('Vimeo player script failed'));
      document.head.appendChild(tag);
    });
  }

  return vimeoApiPromise;
}

export interface VimeoPlayer {
  destroy(): void;
  setCurrentTime(seconds: number): Promise<number>;
  on(event: 'timeupdate', fn: (data: { seconds: number }) => void): void;
}
