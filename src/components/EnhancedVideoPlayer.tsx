import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { progressService } from '../services/progressService';
import { bookmarkService } from '../services/bookmarkService';
import { cn } from '../lib/cn';
import { loadYouTubeIframeApi, loadVimeoPlayerApi, type YTPlayer, type VimeoPlayer } from '../lib/videoPlayerApi';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface EnhancedVideoPlayerProps {
  src: string;
  lessonId: string;
  courseId: string;
  totalDuration?: number; // in seconds
  onProgressUpdate?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

interface DetectedSource {
  type: VideoSourceType;
  embedUrl: string;
  originalUrl: string;
  youtubeId?: string;
  vimeoId?: string;
}

// Video source type detection
type VideoSourceType = 'youtube' | 'vimeo' | 'zoom' | 'google-drive' | 'loom' | 'wistia' | 'direct' | 'embed';

function detectVideoSource(url: string): DetectedSource {
  const originalUrl = url;
  
  // YouTube detection (youtube.com, youtu.be, youtube-nocookie.com)
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      type: 'youtube',
      youtubeId: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
      originalUrl
    };
  }

  // Vimeo detection
  const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      vimeoId: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&api=1`,
      originalUrl
    };
  }

  // Zoom recording detection
  if (url.includes('zoom.us/rec/') || url.includes('zoom.us/recording/')) {
    // Zoom recordings need to be viewed in their player
    // Try to extract share URL or use as-is
    const zoomShareRegex = /zoom\.us\/rec\/share\/([a-zA-Z0-9_-]+)/;
    const zoomMatch = url.match(zoomShareRegex);
    if (zoomMatch) {
      return {
        type: 'zoom',
        embedUrl: url, // Zoom doesn't support iframe embedding directly
        originalUrl
      };
    }
    return {
      type: 'zoom',
      embedUrl: url,
      originalUrl
    };
  }

  // Google Drive detection
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return {
      type: 'google-drive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl
    };
  }

  // Loom detection
  const loomRegex = /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/;
  const loomMatch = url.match(loomRegex);
  if (loomMatch) {
    const videoId = loomMatch[1];
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${videoId}`,
      originalUrl
    };
  }

  // Wistia detection
  const wistiaRegex = /(?:wistia\.com|wi\.st)\/(?:medias|embed)\/([a-zA-Z0-9]+)/;
  const wistiaMatch = url.match(wistiaRegex);
  if (wistiaMatch) {
    const videoId = wistiaMatch[1];
    return {
      type: 'wistia',
      embedUrl: `https://fast.wistia.net/embed/iframe/${videoId}`,
      originalUrl
    };
  }

  // Check if it's already an embed URL (iframe src)
  if (url.includes('/embed') || url.includes('/player') || url.includes('iframe')) {
    return {
      type: 'embed',
      embedUrl: url,
      originalUrl
    };
  }

  // Default to direct video URL (MP4, WebM, etc.)
  return {
    type: 'direct',
    embedUrl: url,
    originalUrl
  };
}

const EmbeddedVideoPlayer = forwardRef<VideoPlayerHandle, {
  embedUrl: string;
  originalUrl: string;
  sourceType: VideoSourceType;
  lessonId: string;
  courseId: string;
  totalDuration?: number;
  onProgressUpdate?: (t: number) => void;
  onComplete?: () => void;
  className?: string;
  youtubeId?: string;
  vimeoId?: string;
}>(function EmbeddedVideoPlayer(
  {
    embedUrl,
    originalUrl,
    sourceType,
    lessonId,
    courseId,
    totalDuration,
    onProgressUpdate,
    onComplete,
    className,
    youtubeId,
    vimeoId,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubeHostId = useMemo(() => `yt-host-${lessonId.replace(/[^a-zA-Z0-9-]/g, '')}`, [lessonId]);
  const vimeoIframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytTickRef = useRef<number | undefined>(undefined);
  const vimeoPlayerRef = useRef<VimeoPlayer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const completeOnceRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        const t = Math.max(0, seconds);
        try {
          if (sourceType === 'youtube' && ytPlayerRef.current) {
            ytPlayerRef.current.seekTo(t, true);
            onProgressUpdate?.(t);
            return;
          }
          if (sourceType === 'vimeo' && vimeoPlayerRef.current) {
            void vimeoPlayerRef.current.setCurrentTime(t);
            onProgressUpdate?.(t);
            return;
          }
        } catch {
          /* ignore */
        }
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = t;
          onProgressUpdate?.(t);
        }
      },
    }),
    [sourceType, onProgressUpdate],
  );

  useEffect(() => {
    completeOnceRef.current = false;
  }, [lessonId]);

  useEffect(() => {
    if (totalDuration) {
      progressService.updateLessonProgress(lessonId, courseId, 0, totalDuration, false).catch(err => {
        console.error('Failed to save initial progress:', err);
      });
    }
  }, [lessonId, courseId, totalDuration]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  const handleMarkComplete = useCallback(() => {
    if (totalDuration) {
      progressService.markLessonCompleted(lessonId, courseId, totalDuration).catch(err => {
        console.error('Failed to mark lesson as completed:', err);
      });
    }
    if (onComplete && !completeOnceRef.current) {
      completeOnceRef.current = true;
      onComplete();
    }
  }, [lessonId, courseId, totalDuration, onComplete]);

  // YouTube: IFrame API → current time for notes & progress
  useEffect(() => {
    if (sourceType !== 'youtube' || !youtubeId) return;

    let cancelled = false;

    const run = async () => {
      try {
        await loadYouTubeIframeApi();
        if (cancelled) return;
        const w = window as unknown as { YT: { Player: new (id: string, opts: Record<string, unknown>) => YTPlayer } };
        const player = new w.YT.Player(youtubeHostId, {
          height: '100%',
          width: '100%',
          videoId: youtubeId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              ytPlayerRef.current = player;
              if (ytTickRef.current) window.clearInterval(ytTickRef.current);
              ytTickRef.current = window.setInterval(() => {
                try {
                  const cur = player.getCurrentTime?.();
                  if (typeof cur === 'number' && !Number.isNaN(cur)) {
                    onProgressUpdate?.(cur);
                  }
                } catch {
                  /* ignore */
                }
              }, 400);
            },
          },
        });
      } catch (e) {
        console.error('YouTube player init failed:', e);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (ytTickRef.current) {
        window.clearInterval(ytTickRef.current);
        ytTickRef.current = undefined;
      }
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, [sourceType, youtubeId, youtubeHostId, lessonId, onProgressUpdate]);

  // Vimeo: Player API → timeupdate
  useEffect(() => {
    if (sourceType !== 'vimeo' || !vimeoId) return;

    let cancelled = false;

    const run = async () => {
      try {
        await loadVimeoPlayerApi();
        if (cancelled) return;
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (cancelled) return;
        const iframe = vimeoIframeRef.current;
        if (!iframe) return;
        const w = window as unknown as { Vimeo: { Player: new (el: HTMLIFrameElement) => VimeoPlayer } };
        const player = new w.Vimeo.Player(iframe);
        vimeoPlayerRef.current = player;
        player.on('timeupdate', (data: { seconds: number }) => {
          onProgressUpdate?.(data.seconds);
        });
      } catch (e) {
        console.error('Vimeo player init failed:', e);
      }
    };

    void run();

    return () => {
      cancelled = true;
      try {
        vimeoPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      vimeoPlayerRef.current = null;
    };
  }, [sourceType, vimeoId, embedUrl, onProgressUpdate]);

  // For Zoom recordings, show a link instead of trying to embed
  if (sourceType === 'zoom') {
    return (
      <div className={cn('relative bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg overflow-hidden', className)}>
        <div className="aspect-video flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 mb-6">
            <svg className="h-16 w-16 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h10v10H4V4zm12 0v10l4-5-4-5zM4 16h10v4H4v-4zm12 0v4h4v-4h-4z"/>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Zoom Recording</h3>
          <p className="text-white/80 mb-6 max-w-md">
            This lesson contains a Zoom recording. Click the button below to open it in a new tab.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => window.open(originalUrl, '_blank')}
              className="bg-white text-blue-700 hover:bg-white/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Zoom Recording
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkComplete}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Mark as Completed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sourceLabels: Record<VideoSourceType, string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    zoom: 'Zoom',
    'google-drive': 'Google Drive',
    loom: 'Loom',
    wistia: 'Wistia',
    direct: 'Video',
    embed: 'Video',
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black rounded-lg overflow-hidden group', className)}
    >
      <div className="aspect-video">
        {sourceType === 'youtube' && youtubeId ? (
          <div id={youtubeHostId} className="w-full h-full min-h-[200px]" />
        ) : sourceType === 'vimeo' && vimeoId ? (
          <iframe
            ref={vimeoIframeRef}
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            frameBorder="0"
            title="Lesson Video"
          />
        ) : (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            frameBorder="0"
            title="Lesson Video"
          />
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs px-2 py-1 bg-white/10 rounded">
              {sourceLabels[sourceType]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkComplete}
              className="text-white hover:bg-white/20 text-xs"
            >
              Mark Complete
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => window.open(originalUrl, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

const NativeVideoPlayer = forwardRef<VideoPlayerHandle, {
  src: string;
  lessonId: string;
  courseId: string;
  totalDuration?: number;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}>(function NativeVideoPlayer(
  { src, lessonId, courseId, totalDuration, onProgressUpdate, onComplete, className },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const completeOnceRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (!videoRef.current) return;
        const t = Math.max(0, seconds);
        videoRef.current.currentTime = t;
        onProgressUpdate?.(t);
      },
    }),
    [onProgressUpdate],
  );

  useEffect(() => {
    completeOnceRef.current = false;
  }, [lessonId]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load saved progress and resume from last position
  useEffect(() => {
    const loadProgress = async () => {
      const progress = await progressService.getLessonProgress(lessonId);
      if (progress && videoRef.current) {
        const seekToLastPosition = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            if (!progress.isCompleted && progress.watchedDuration > 0) {
              videoRef.current.currentTime = progress.watchedDuration;
              setCurrentTime(progress.watchedDuration);
            }
          }
        };

        seekToLastPosition();

        if (videoRef.current) {
          videoRef.current.addEventListener('loadedmetadata', seekToLastPosition, { once: true });
          videoRef.current.addEventListener('canplay', seekToLastPosition, { once: true });
        }
      }
    };
    loadProgress();

    setIsBookmarked(bookmarkService.isBookmarked(lessonId));
  }, [lessonId]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setHasError(false);
      
      const resumeFromProgress = async () => {
        const progress = await progressService.getLessonProgress(lessonId);
        if (progress && videoRef.current && !progress.isCompleted && progress.watchedDuration > 0) {
          if (videoRef.current.currentTime === 0) {
            videoRef.current.currentTime = progress.watchedDuration;
            setCurrentTime(progress.watchedDuration);
          }
        }
      };
      resumeFromProgress();
    }
  }, [lessonId]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      if (Math.floor(time) % 5 === 0 && Math.floor(time) > 0) {
        const total = totalDuration || duration || videoRef.current.duration;
        const isCompleted = time >= total * 0.95;
        
        progressService.updateLessonProgress(lessonId, courseId, time, total, isCompleted).catch(err => {
          console.error('Failed to update progress:', err);
        });
        
        if (isCompleted && onComplete && !completeOnceRef.current) {
          completeOnceRef.current = true;
          onComplete();
        }
      }

      if (onProgressUpdate) {
        onProgressUpdate(time);
      }
    }
  }, [lessonId, courseId, duration, totalDuration, onProgressUpdate, onComplete]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const handleBookmark = useCallback(() => {
    if (isBookmarked) {
      const bookmarks = bookmarkService.getLessonBookmarks(lessonId);
      bookmarks.forEach((b) => bookmarkService.removeBookmark(b.id));
      setIsBookmarked(false);
    } else {
      bookmarkService.addBookmark(lessonId, courseId, currentTime);
      setIsBookmarked(true);
    }
  }, [lessonId, courseId, currentTime, isBookmarked]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true' ||
        (activeElement as HTMLElement).isContentEditable
      );

      if (isTyping) {
        if (e.key === 'Escape' && isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
        }
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(
            duration,
            videoRef.current.currentTime + 10
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange([Math.min(1, volume + 0.1)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange([Math.max(0, volume - 0.1)]);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay, toggleFullscreen, toggleMute, volume, handleVolumeChange, duration, isFullscreen]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If there's an error loading the video, show a fallback with link
  if (hasError) {
    return (
      <div className={cn('relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden', className)}>
        <div className="aspect-video flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 mb-6">
            <Play className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Video Unavailable</h3>
          <p className="text-white/80 mb-6 max-w-md">
            Unable to play this video directly. Click below to open it in a new tab.
          </p>
          <Button
            onClick={() => window.open(src, '_blank')}
            className="bg-white text-gray-900 hover:bg-white/90"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black rounded-lg overflow-hidden group', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
        onEnded={() => {
          setIsPlaying(false);
          if (totalDuration || duration) {
            progressService.markLessonCompleted(lessonId, courseId, totalDuration || duration).catch(err => {
              console.error('Failed to mark lesson as completed:', err);
            });
          }
          if (onComplete && !completeOnceRef.current) {
            completeOnceRef.current = true;
            onComplete();
          }
        }}
        onClick={togglePlay}
      />

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={handleBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 fill-white" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={playbackRate === rate ? 'bg-primary/10' : ''}
                >
                  {rate}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <div className="w-24">
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-white text-sm">{playbackRate}x</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const EnhancedVideoPlayer = forwardRef<VideoPlayerHandle, EnhancedVideoPlayerProps>(
  function EnhancedVideoPlayer(
    { src, lessonId, courseId, totalDuration, onProgressUpdate, onComplete, className },
    ref,
  ) {
    const videoSource = useMemo(() => detectVideoSource(src), [src]);

    if (videoSource.type !== 'direct') {
      return (
        <EmbeddedVideoPlayer
          ref={ref}
          embedUrl={videoSource.embedUrl}
          originalUrl={videoSource.originalUrl}
          sourceType={videoSource.type}
          lessonId={lessonId}
          courseId={courseId}
          totalDuration={totalDuration}
          onProgressUpdate={onProgressUpdate}
          onComplete={onComplete}
          className={className}
          youtubeId={videoSource.youtubeId}
          vimeoId={videoSource.vimeoId}
        />
      );
    }

    return (
      <NativeVideoPlayer
        ref={ref}
        src={src}
        lessonId={lessonId}
        courseId={courseId}
        totalDuration={totalDuration}
        onProgressUpdate={onProgressUpdate}
        onComplete={onComplete}
        className={className}
      />
    );
  },
);

