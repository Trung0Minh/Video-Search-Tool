import { Component, createSignal, onMount, For, Accessor, Setter, createEffect } from 'solid-js';

interface VideoFilterProps {
  selectedPacks: Accessor<string[]>;
  selectedVideos: Accessor<string[]>;
  setSelectedVideos: Setter<string[]>;
  API_BASE_URL: string;
}

const VideoFilter: Component<VideoFilterProps> = (props) => {
  const [availableVideos, setAvailableVideos] = createSignal<string[]>([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  createEffect(async () => {
    const packs = props.selectedPacks();
    if (packs.length > 0) {
      setIsLoading(true);
      try {
        const response = await fetch(`${props.API_BASE_URL}/api/videos_in_packs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packs }),
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableVideos(data);
        } else {
          setAvailableVideos([]);
        }
      } catch (error) {
        console.error("Failed to fetch videos:", error);
        setAvailableVideos([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setAvailableVideos([]);
      props.setSelectedVideos([]);
    }
  });

  const handleVideoSelection = (video: string) => {
    const currentSelection = props.selectedVideos();
    if (currentSelection.includes(video)) {
      props.setSelectedVideos(currentSelection.filter(v => v !== video));
    } else {
      props.setSelectedVideos([...currentSelection, video]);
    }
  };

  return (
    <div>
      <label class="block text-sm font-medium text-gray-700">Videos</label>
      <div class="relative mt-1">
        <button 
          class="w-full p-2 border rounded shadow-sm text-left bg-white disabled:bg-gray-100"
          onClick={() => setIsOpen(!isOpen())}
          disabled={props.selectedPacks().length === 0 || isLoading()}
        >
          <span class="block">
            {isLoading() 
              ? 'Loading videos...'
              : props.selectedVideos().length === 0
                ? 'Select videos...'
                : props.selectedVideos().join(', ')}
          </span>
        </button>
        <div class={`absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg ${isOpen() && !isLoading() ? 'block' : 'hidden'}`}>
          <ul class="max-h-60 overflow-auto">
            <For each={availableVideos()}>{video => 
              <li class="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleVideoSelection(video)}>
                <input 
                  type="checkbox" 
                  class="mr-2"
                  checked={props.selectedVideos().includes(video)}
                />
                {video}
              </li>
            }</For>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoFilter;
