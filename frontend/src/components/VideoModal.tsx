import { Component, createSignal, onMount } from 'solid-js';

interface VideoModalProps {
  videoUrl: string;
  videoId: string;
  onSelectFrame: (frameIndex: number) => void;
}

const VideoModal: Component<VideoModalProps> = (props) => {
  let videoRef: HTMLVideoElement | undefined;
  const [fps, setFps] = createSignal<number | null>(null);
  const [currentFrame, setCurrentFrame] = createSignal(0);

  onMount(async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/video_info/${props.videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video info');
      }
      const data = await response.json();
      setFps(data.fps);
    } catch (error) {
      console.error("Error fetching video FPS:", error);
      setFps(25); // Fallback FPS
    }
  });

  const handleTimeUpdate = () => {
    if (!videoRef) return;
    const frame = Math.floor(videoRef.currentTime * (fps() || 0));
    setCurrentFrame(frame);
  };

  const stepFrame = (direction: 1 | -1) => {
    if (!fps() || !videoRef || isNaN(videoRef.duration)) return;
    videoRef.pause();
    const newTime = videoRef.currentTime + direction * (1 / fps()!);
    videoRef.currentTime = Math.max(0, Math.min(newTime, videoRef.duration));
  };

  const handleSelectCurrentFrame = () => {
    props.onSelectFrame(currentFrame());
  };

  return (
    <div class="w-full h-full flex flex-col items-center justify-center bg-black p-4">
      <video
        ref={videoRef}
        controls
        // Autoplay has been removed for reliability. User will press play.
        class="w-full max-h-[80vh] object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
      >
        <source src={props.videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div class="flex-shrink-0 w-full bg-gray-800 p-2 mt-2 rounded-lg flex items-center justify-center space-x-4 text-white">
        <button
          onClick={() => stepFrame(-1)}
          class="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
          disabled={!fps()}
        >
          -1 Frame
        </button>
        <div class="font-mono text-lg w-48 text-center">
          Frame: {currentFrame()}
        </div>
        <button
          onClick={() => stepFrame(1)}
          class="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
          disabled={!fps()}
        >
          +1 Frame
        </button>
        <button
          onClick={handleSelectCurrentFrame}
          class="px-3 py-1 bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50"
          disabled={!fps()}
        >
          Select Current Frame
        </button>
      </div>
    </div>
  );
};

export default VideoModal;