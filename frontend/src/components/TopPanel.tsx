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
  totalResults: Accessor<number>;
  setTotalResults: Setter<number>;
}

const TopPanel: Component<TopPanelProps> = (props) => {
  return (
    <div class="border-b border-gray-200 bg-white p-3 flex items-center space-x-4">
      <h1 class="text-xl font-semibold text-gray-800 flex-shrink-0"></h1>
      
      <div class="flex-grow flex items-center space-x-2">
        <label for="display-video-id" class="text-sm font-medium text-gray-700">Video ID:</label>
        <input type="text" id="display-video-id" class="p-1 border rounded text-sm w-32" value={props.videoId()} onInput={(e) => props.setVideoId(e.currentTarget.value)} />
        <label for="display-keyframe-id" class="text-sm font-medium text-gray-700">Keyframe ID:</label>
        <input type="text" id="display-keyframe-id" class="p-1 border rounded text-sm w-24" value={props.keyframeId()} onInput={(e) => props.setKeyframeId(e.currentTarget.value)} />
        
        <label for="display-keyframe-note" class="text-sm font-medium text-gray-700">Answer:</label>
        <input
          type="text"
          id="display-keyframe-note"
          class="p-1 border rounded text-sm w-48"
          placeholder="Add answer..."
          value={props.keyframeNote()}
          onInput={(e) => props.setKeyframeNote(e.currentTarget.value)}
        />
      </div>

      <div class="flex items-center space-x-2">
        <label for="total-results" class="text-sm font-medium text-gray-700">Total Results:</label>
        <input type="number" id="total-results" min="1" max="1000" class="p-1 border rounded text-sm w-24" value={props.totalResults()} onInput={(e) => props.setTotalResults(parseInt(e.currentTarget.value, 10))} />
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