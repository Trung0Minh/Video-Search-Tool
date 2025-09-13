import { Component, For, Accessor, Setter, Show } from 'solid-js';

interface ExcludedVideosProps {
  excludedVideos: Accessor<string[]>;
  setExcludedVideos: Setter<string[]>;
}

const ExcludedVideos: Component<ExcludedVideosProps> = (props) => {
  const handleRemove = (video: string) => {
    props.setExcludedVideos(props.excludedVideos().filter(v => v !== video));
  };

  return (
    <div>
      <div class="flex items-center justify-between mt-4">
        <h3 class="text-md font-semibold text-gray-700">Excluded Videos</h3>
        <Show when={props.excludedVideos().length > 0}>
          <button 
            class="text-xs text-blue-500 hover:text-blue-700"
            onClick={() => props.setExcludedVideos([])}
          >
            Clear All
          </button>
        </Show>
      </div>
      <div class="mt-2 p-2 border rounded-md bg-gray-50 max-h-40 overflow-y-auto">
        <For each={props.excludedVideos()}>
          {(video) => (
            <div class="flex items-center justify-between p-1 bg-white rounded-md shadow-sm mb-1">
              <span class="text-sm font-mono">{video}</span>
              <button 
                class="text-red-500 hover:text-red-700 p-1 rounded-full"
                onClick={() => handleRemove(video)}
                title="Re-include Video"
              >
                &#10005;
              </button>
            </div>
          )}
        </For>
        {props.excludedVideos().length === 0 && (
          <p class="text-sm text-gray-500 italic">No videos excluded.</p>
        )}
      </div>
    </div>
  );
};

export default ExcludedVideos;
