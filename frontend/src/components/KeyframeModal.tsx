import { Component, createSignal, onMount, For, Show } from 'solid-js';

interface KeyframeModalProps {
  videoId: string;
  handlers: {
    onImageZoom: (imageUrl: string) => void;
    onDirectAddToSubmission: (videoId: string, keyframeIndex: number) => void;
    onModalPopulate: (videoId: string, keyframeId: string) => void;
  }
}

const KeyframeModal: Component<KeyframeModalProps> = (props) => {
  const [keyframes, setKeyframes] = createSignal<{ id: string; url: string; index: number }[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/video_keyframes/${props.videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch keyframes for video');
      }
      const data = await response.json();
      const processedKeyframes = data.keyframes.map((keyframe: { keyframe_id: string; keyframe_index: number; }) => ({
        id: keyframe.keyframe_id,
        url: `http://localhost:8000/static/keyframes/${props.videoId}/${keyframe.keyframe_id}.jpg`,
        index: keyframe.keyframe_index,
      }));
      setKeyframes(processedKeyframes);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching video keyframes:", err);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div class="p-4 h-full">
      <h3 class="text-lg font-semibold mb-4">Keyframes for Video: {props.videoId}</h3>
      <div class="h-full overflow-y-auto">
        <Show when={isLoading()}>
          <div class="text-center text-gray-500">Loading keyframes...</div>
        </Show>
        <Show when={error()}>
          <div class="text-center text-red-500">Error: {error()}</div>
        </Show>
        <Show when={!isLoading() && keyframes().length > 0}>
          <div class="grid grid-cols-4 gap-4">
            <For each={keyframes()}>
              {(keyframe) => (
                <div class="overflow-hidden rounded-lg shadow-lg bg-gray-100 flex flex-col">
                  <img 
                    src={keyframe.url} 
                    alt={`Keyframe ${keyframe.id}`} 
                    class="w-full h-32 object-cover cursor-pointer" 
                    onClick={() => props.handlers.onImageZoom(keyframe.url)}
                  />
                  <div class="p-2 flex flex-col gap-2">
                    <p class="text-sm font-medium text-gray-700 truncate text-center">{keyframe.index}</p>
                    <div class="flex flex-row gap-1">
                        <button 
                        class="flex-1 p-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                        onClick={() => props.handlers.onModalPopulate(props.videoId, keyframe.index.toString())}
                        >
                        🔽 Populate
                        </button>
                        <button 
                        class="flex-1 p-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => props.handlers.onDirectAddToSubmission(props.videoId, keyframe.index)}
                        >
                        ➕ Add
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={!isLoading() && keyframes().length === 0 && !error()}>
          <div class="text-center text-gray-500">No keyframes found for this video.</div>
        </Show>
      </div>
    </div>
  );
};

export default KeyframeModal;