import { Component, Accessor, Setter, For, Show } from 'solid-js';
import type { QueryItem } from '../App';
import PackFilter from './PackFilter';
import VideoFilter from './VideoFilter';
import ExcludedVideos from './ExcludedVideos';
import VietnameseTextFilter from './TextFilter';

interface LeftPanelProps {
  queries: QueryItem[];
  onAddQuery: () => void;
  onRemoveQuery: (id: number) => void;
  onUpdateQuery: (id: number, text: string) => void;
  topKPerQuery: Accessor<number>;
  setTopKPerQuery: Setter<number>;
  keywordFilter: Accessor<string>;
  setKeywordFilter: Setter<string>;
  vietnameseQuery: Accessor<string>;
  setVietnameseQuery: Setter<string>;
  selectedObjects: Accessor<string[]>;
  setSelectedObjects: Setter<string[]>;
  selectedPacks: Accessor<string[]>;
  setSelectedPacks: Setter<string[]>;
  selectedVideos: Accessor<string[]>;
  setSelectedVideos: Setter<string[]>;
  excludedVideos: Accessor<string[]>;
  setExcludedVideos: Setter<string[]>;
  onSearch: () => void;
  isLoading: Accessor<boolean>;
  submissionFilename: Accessor<string>;
  setSubmissionFilename: Setter<string>;
  submissionContent: Accessor<string>;
  setSubmissionContent: Setter<string>;
  onSaveCsv: () => void;
  API_BASE_URL: string;
}

const LeftPanel: Component<LeftPanelProps> = (props) => {
  return (
    <div class="p-4 h-full flex flex-col">
      <div class="flex-grow overflow-y-auto pr-2">
        <h2 class="text-lg font-bold mb-4 text-gray-800">Query Tools</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {props.queries.length > 1 ? 'Temporal Queries' : 'Search Query'}
            </label>
            <For each={props.queries}>
              {(query) => (
                <div class="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., a dog playing fetch"
                    class="w-full p-2 border rounded shadow-sm"
                    value={query.text}
                    onInput={(e) => props.onUpdateQuery(query.id, e.currentTarget.value)}
                  />
                  <Show when={props.queries.length > 1}>
                    <button
                      onClick={() => props.onRemoveQuery(query.id)}
                      class="p-2 text-red-500 hover:text-red-700"
                      title="Remove Query"
                    >
                      &#10005;
                    </button>
                  </Show>
                </div>
              )}
            </For>
            <button
              onClick={props.onAddQuery}
              class="mt-2 w-full p-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              + Add Query
            </button>
          </div>
          
          <div>
            <label for="top-k-per-query" class="block text-sm font-medium text-gray-700">Max Results per Query</label>
            <input type="number" id="top-k-per-query" min="1" max="50" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.topKPerQuery()} onInput={(e) => props.setTopKPerQuery(parseInt(e.currentTarget.value, 10))} />
          </div>
          <hr />
          <VietnameseTextFilter 
            vietnameseQuery={props.vietnameseQuery}
            setVietnameseQuery={props.setVietnameseQuery}
          />
          <PackFilter 
            selectedPacks={props.selectedPacks}
            setSelectedPacks={props.setSelectedPacks}
            API_BASE_URL={props.API_BASE_URL}
          />
          <VideoFilter
            selectedPacks={props.selectedPacks}
            selectedVideos={props.selectedVideos}
            setSelectedVideos={props.setSelectedVideos}
            API_BASE_URL={props.API_BASE_URL}
          />
          <ExcludedVideos
            excludedVideos={props.excludedVideos}
            setExcludedVideos={props.setExcludedVideos}
          />
        </div>

        <hr class="my-6" />
        
        <div class="space-y-4">
          <h2 class="text-lg font-bold mb-4 text-gray-800">Submission</h2>
          <div>
            <label for="submission-filename" class="block text-sm font-medium text-gray-700">Filename</label>
            <input type="text" id="submission-filename" placeholder="e.g., interesting_frames" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.submissionFilename()} onInput={(e) => props.setSubmissionFilename(e.currentTarget.value)} />
          </div>
          <div>
            <div class="flex items-center justify-between">
            <label for="submission-content" class="block text-sm font-medium text-gray-700">Content</label>
            <Show when={props.submissionContent()}>
              <button 
                class="text-xs text-blue-500 hover:text-blue-700"
                onClick={() => props.setSubmissionContent('')}
              >
                Clear All
              </button>
            </Show>
          </div>
            <textarea id="submission-content" rows="8" class="mt-1 w-full p-2 border rounded shadow-sm font-mono text-xs" value={props.submissionContent()} onInput={(e) => props.setSubmissionContent(e.currentTarget.value)} />
          </div>
        </div>
      </div>

      <div class="pt-4 flex-shrink-0 space-y-2">
        <button class="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400" onClick={props.onSearch} disabled={props.isLoading()} >
          🔍 {props.isLoading() ? 'Searching...' : 'Search'}
        </button>
        <button class="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onClick={props.onSaveCsv} title="Save CSV to Server">
          💾 Save to Server
        </button>
      </div>
    </div>
  );
};
export default LeftPanel;
