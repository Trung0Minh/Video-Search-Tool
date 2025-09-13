import { Component, onMount, onCleanup, createSignal } from 'solid-js';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface VideoModalProps {
  watchUrl: string;
  fps: number;
  videoId: string;
  keyframeIndex: number;
  onSelectFrame: (frameIndex: number) => void;
}

const VideoModal: Component<VideoModalProps> = (props) => {
  let playerEl: HTMLDivElement | undefined;
  let player: any;
  let videoEl: HTMLVideoElement | undefined;
  let frameUpdateInterval: number;
  const [isPlayerReady, setIsPlayerReady] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [debugInfo, setDebugInfo] = createSignal<string[]>([]);
  const [currentFrame, setCurrentFrame] = createSignal(0);

  const addDebug = (message: string) => {
    console.log('VideoModal Debug:', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const isYouTubeUrl = (url: string) =>
    url.includes("youtube.com") || url.includes("youtu.be");

  const getYouTubeId = (url: string) => {
    addDebug(`Parsing YouTube URL: ${url}`);
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[2] && match[2].length === 11) {
        addDebug(`Extracted video ID: ${match[2]}`);
        return match[2];
      }
    }
    
    addDebug('Failed to extract video ID from URL');
    return null;
  };

  const onPlayerReady = (event: any) => {
    addDebug('YouTube player ready event fired');
    setIsPlayerReady(true);
    setIsLoading(false);
    
    try {
      const startSeconds = props.keyframeIndex / props.fps;
      event.target.seekTo(startSeconds, true);
      event.target.playVideo();
    } catch (err) {
      const errorMsg = `Error seeking to start time: ${err}`;
      addDebug(errorMsg);
      setError(errorMsg);
    }
  };

  const onPlayerError = (event: any) => {
    const errorCodes: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Video not allowed to be played in embedded players',
      150: 'Video not allowed to be played in embedded players'
    };
    
    const errorMsg = `YouTube player error ${event.data}: ${errorCodes[event.data] || 'Unknown error'}`;
    addDebug(errorMsg);
    setError(errorMsg);
    setIsLoading(false);
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      frameUpdateInterval = window.setInterval(() => {
        const frame = Math.floor(player.getCurrentTime() * props.fps);
        setCurrentFrame(frame);
      }, 100);
    } else {
      window.clearInterval(frameUpdateInterval);
    }
  };

  const loadYouTubeAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="youtube"]');
      if (existingScript) {
        const checkYT = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkYT);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkYT);
          reject(new Error('YouTube API load timeout'));
        }, 10000);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        resolve();
      };

      script.onerror = () => reject(new Error('Failed to load YouTube API'));
      document.head.appendChild(script);
    });
  };

  const setupPlayer = async () => {
    const videoId = getYouTubeId(props.watchUrl);
    if (!videoId) {
      setError(`Invalid YouTube URL: ${props.watchUrl}`);
      setIsLoading(false);
      return;
    }

    try {
      await loadYouTubeAPI();
      const startTime = Math.floor(props.keyframeIndex / props.fps);
      player = new window.YT.Player(playerEl, {
        height: '480',
        width: '100%',
        videoId,
        playerVars: {
          'playsinline': 1,
          'autoplay': 1,
          'controls': 1,
          'rel': 0,
          'start': startTime,
          'enablejsapi': 1
        },
        events: {
          'onReady': onPlayerReady,
          'onError': onPlayerError,
          'onStateChange': onPlayerStateChange,
        }
      });
    } catch (err) {
      setError(`Error setting up YouTube player: ${err}`);
      setIsLoading(false);
    }
  };

  const setupHTML5Video = () => {
    if (!videoEl) return;
    addDebug("Setting up HTML5 video player...");
    setIsPlayerReady(true);
    setIsLoading(false);

    // start from keyframe index
    videoEl.currentTime = props.keyframeIndex / props.fps;

    videoEl.addEventListener("timeupdate", () => {
      const frame = Math.floor(videoEl!.currentTime * props.fps);
      setCurrentFrame(frame);
    });
  };

  onMount(() => {
    if (isYouTubeUrl(props.watchUrl)) {
      setupPlayer();
    } else {
      setupHTML5Video();
    }
  });

  onCleanup(() => {
    window.clearInterval(frameUpdateInterval);
    if (player && typeof player.destroy === 'function') {
      try {
        player.destroy();
      } catch (err) {
        addDebug(`Error destroying player: ${err}`);
      }
    }
  });

  const handleSeek = () => {
    if (isYouTubeUrl(props.watchUrl)) {
      if (!isPlayerReady() || !player) return;
      const currentFrame = Math.floor(player.getCurrentTime() * props.fps);
      props.onSelectFrame(currentFrame);
    } else {
      if (!videoEl) return;
      const currentFrame = Math.floor(videoEl.currentTime * props.fps);
      props.onSelectFrame(currentFrame);
    }
  };

  const moveFrame = (direction: 1 | -1) => {
    if (isYouTubeUrl(props.watchUrl)) {
      if (!isPlayerReady() || !player) return;
      const currentFrame = Math.floor(player.getCurrentTime() * props.fps);
      const newFrame = Math.max(0, currentFrame + direction);
      player.pauseVideo();
      player.seekTo(newFrame / props.fps, true);
      setCurrentFrame(newFrame);
    } else {
      if (!videoEl) return;
      const currentFrame = Math.floor(videoEl.currentTime * props.fps);
      const newFrame = Math.max(0, currentFrame + direction);
      videoEl.pause();
      videoEl.currentTime = newFrame / props.fps;
      setCurrentFrame(newFrame);
    }
  };

  return (
    <div class="p-4">
      <h3 class="text-lg font-semibold mb-2">{props.videoId}</h3>
      
      {error() && (
        <div class="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          <div class="font-semibold">Error:</div>
          <div>{error()}</div>
        </div>
      )}
      
      {isLoading() && (
        <div class="flex items-center justify-center h-96 bg-gray-100 rounded mb-4">
          <div class="text-center">
            <div class="text-gray-600 mb-2">Loading video player...</div>
          </div>
        </div>
      )}
      
      {isYouTubeUrl(props.watchUrl) ? (
        <div ref={playerEl} class="mb-4"></div>
      ) : (
        <video
          ref={videoEl}
          src={props.watchUrl}
          controls
          autoPlay
          class="w-full h-96 mb-4 bg-black rounded"
        />
      )}
      
      <div class="flex items-center justify-center gap-4 mb-4">
        <button 
          onClick={() => moveFrame(-1)}
          class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          disabled={!isPlayerReady()}
        >
          <span class="text-sm">←</span>
        </button>
        
        <button 
          onClick={handleSeek}
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isPlayerReady()}
        >
          Select Current Frame
        </button>
        
        <button 
          onClick={() => moveFrame(1)}
          class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          disabled={!isPlayerReady()}
        >
          <span class="text-sm">→</span>
        </button>
      </div>

      <div class="text-center text-lg font-mono mb-4">
        Current Frame: {currentFrame()}
      </div>
      
      <details class="mt-4">
        <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          Debug Info ({debugInfo().length} messages)
        </summary>
        <div class="mt-2 p-2 bg-gray-100 rounded text-xs max-h-48 overflow-y-auto">
          {debugInfo().map((msg, index) => (
            <div key={index} class="mb-1">{msg}</div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default VideoModal;
