import { Component, Accessor, Setter, For, Show } from 'solid-js';
import type { QueryItem } from '../App';

interface LeftPanelProps {
  queries: QueryItem[];
  onAddQuery: () => void;
  onRemoveQuery: (id: number) => void;
  onUpdateQuery: (id: number, text: string) => void;
  retriever: Accessor<string>;
  setRetriever: Setter<string>;
  topKPerQuery: Accessor<number>;
  setTopKPerQuery: Setter<number>;
  keywordFilter: Accessor<string>;
  setKeywordFilter: Setter<string>;
  objectFilter: Accessor<string>;
  setObjectFilter: Setter<string>;
  onSearch: () => void;
  isLoading: Accessor<boolean>;
  submissionFilename: Accessor<string>;
  setSubmissionFilename: Setter<string>;
  submissionContent: Accessor<string>;
  setSubmissionContent: Setter<string>;
  onDownloadCsv: () => void;
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
            <label for="retriever" class="block text-sm font-medium text-gray-700">Retriever</label>
            <select id="retriever" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.retriever()} onInput={(e) => props.setRetriever(e.currentTarget.value)} >
              <option value="clip">CLIP (Semantic)</option>
              <option value="es">Elasticsearch (Text)</option>
            </select>
          </div>
          <div>
            <label for="top-k-per-query" class="block text-sm font-medium text-gray-700">Max Results per Query</label>
            <input type="number" id="top-k-per-query" min="1" max="50" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.topKPerQuery()} onInput={(e) => props.setTopKPerQuery(parseInt(e.currentTarget.value, 10))} />
          </div>
          <hr />
          <h3 class="text-md font-semibold text-gray-600">Filters</h3>
          <div>
            <label for="filter-keyword" class="block text-sm font-medium text-gray-700">Keywords</label>
            <input type="text" id="filter-keyword" placeholder="e.g., park, daytime" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.keywordFilter()} onInput={(e) => props.setKeywordFilter(e.currentTarget.value)} />
          </div>
          <div>
            <label for="filter-object" class="block text-sm font-medium text-gray-700">Objects</label>
            <input type="text" id="filter-object" placeholder="e.g., dog>0.8, cat" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.objectFilter()} onInput={(e) => props.setObjectFilter(e.currentTarget.value)} />
          </div>
        </div>

        <hr class="my-6" />
        
        <div class="space-y-4">
          <h2 class="text-lg font-bold mb-4 text-gray-800">Submission</h2>
          <div>
            <label for="submission-filename" class="block text-sm font-medium text-gray-700">Filename</label>
            <input type="text" id="submission-filename" placeholder="e.g., interesting_frames" class="mt-1 w-full p-2 border rounded shadow-sm" value={props.submissionFilename()} onInput={(e) => props.setSubmissionFilename(e.currentTarget.value)} />
          </div>
          <div>
            <label for="submission-content" class="block text-sm font-medium text-gray-700">Content</label>
            <textarea id="submission-content" rows="8" class="mt-1 w-full p-2 border rounded shadow-sm font-mono text-xs" value={props.submissionContent()} onInput={(e) => props.setSubmissionContent(e.currentTarget.value)} />
          </div>
        </div>
      </div>

      <div class="pt-4 flex-shrink-0 space-y-2">
        <button class="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400" onClick={props.onSearch} disabled={props.isLoading()} >
          🔍 {props.isLoading() ? 'Searching...' : 'Search'}
        </button>
        <button class="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors" onClick={props.onDownloadCsv} title="Download CSV">
          ⬇️ Download CSV
        </button>
      </div>
    </div>
  );
};
export default LeftPanel;
