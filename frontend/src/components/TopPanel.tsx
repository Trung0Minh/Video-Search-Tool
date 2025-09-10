import { Component, Accessor, Setter, For } from 'solid-js';

interface TopPanelProps {
  videoId: Accessor<string>;
  setVideoId: Setter<string>;
  keyframeId: Accessor<string>;
  setKeyframeId: Setter<string>;
  onAddToSubmission: () => void;
  keyframeNote: Accessor<string>;
  setKeyframeNote: Setter<string>;
  onGroup: () => void;
  onGridChange: (cols: number) => void;
  isTemporalMode: Accessor<boolean>;
  setIsTemporalMode: Setter<boolean>;
}

const TopPanel: Component<TopPanelProps> = (props) => {
  return (
    <div class="border-b border-gray-200 bg-white p-3 flex items-center space-x-4">
      <h1 class="text-xl font-semibold text-gray-800 flex-shrink-0">Video Retrieval</h1>
      
      <div class="flex-grow flex items-center space-x-2">
        <label for="display-video-id" class="text-sm font-medium text-gray-700">Video ID:</label>
        <input type="text" id="display-video-id" class="p-1 border rounded text-sm w-32 bg-gray-100" readOnly value={props.videoId()} />
        <label for="display-keyframe-id" class="text-sm font-medium text-gray-700">Keyframe ID:</label>
        <input type="text" id="display-keyframe-id" class="p-1 border rounded text-sm w-24 bg-gray-100" readOnly value={props.keyframeId()} />
        
        <label for="display-keyframe-note" class="text-sm font-medium text-gray-700">Note:</label>
        <input
          type="text"
          id="display-keyframe-note"
          class="p-1 border rounded text-sm w-48"
          placeholder="Add a descriptive note..."
          value={props.keyframeNote()}
          onInput={(e) => props.setKeyframeNote(e.currentTarget.value)}
        />
      </div>

      <button
        class="px-3 py-1 text-white text-sm rounded transition-colors"
        classList={{
          'bg-gray-500 hover:bg-gray-600': !props.isTemporalMode(),
          'bg-teal-500 hover:bg-teal-600': props.isTemporalMode(),
        }}
        onClick={() => props.setIsTemporalMode(!props.isTemporalMode())}
        title={props.isTemporalMode() ? 'Temporal Mode ON (Append)' : 'Temporal Mode OFF (Replace)'}
      >
        {props.isTemporalMode() ? '⏰' : '🔄'}
      </button>

      <button 
        class="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        onClick={props.onAddToSubmission}
        disabled={!props.videoId()}
        title="Add to List"
      >
        ➕
      </button>

      <div class="flex items-center space-x-2">
        <button class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300" onClick={() => props.onGroup()} title="Group by Video ID">
          🗂️
        </button>
        <select class="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onChange={(e) => props.onGridChange(parseInt(e.currentTarget.value, 10))}>
          <For each={Array.from({ length: 10 }, (_, i) => i + 1)}>
            {(i) => <option value={i}>{i}</option>}
          </For>
        </select>
      </div>
    </div>
  );
};
export default TopPanel;