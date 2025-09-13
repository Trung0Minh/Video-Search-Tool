import { For, Show, type Component, type Accessor, createMemo } from 'solid-js';
import ResultCard from './ResultCard';
import GroupedResultCard from './GroupedResultCard';
import TemporalResultCard from './TemporalResultCard';
import type { SearchResultItem, TemporalQueryResult } from '../App';

interface RightPanelProps {
  images: Accessor<SearchResultItem[]>;
  temporalResults: Accessor<TemporalQueryResult[]>;
  excludedVideos: Accessor<string[]>;
  isTemporalResult: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  onVideoView: (videoUrl: string, video: string, frame: string, frame_index: number) => void;
  onKeyframeView: (video: string) => void;
  onPopulateIdFields: (video: string, frame_index: string) => void;
  onDirectAddToSubmission: (video: string, frame_index: number) => void;
  onImageZoom: (imageUrl: string) => void;
  onExcludeVideo: (video: string) => void;
  gridCols: Accessor<number>;
  groupByVideo: Accessor<boolean>;
}

const RightPanel: Component<RightPanelProps> = (props) => {
  const filteredImages = createMemo(() => 
    props.images().filter(item => !props.excludedVideos().includes(item.video))
  );

  const filteredTemporalResults = createMemo(() => 
    props.temporalResults().filter(item => !props.excludedVideos().includes(item.video))
  );

  const groupedImages = createMemo(() => {
    if (!props.groupByVideo()) return null;
    const groups: { [key: string]: SearchResultItem[] } = {};
    filteredImages().forEach(item => {
      if (!groups[item.video]) {
        groups[item.video] = [];
      }
      groups[item.video].push(item);
    });
    return Object.entries(groups);
  });

  const hasResults = () => {
    return props.isTemporalResult() ? filteredTemporalResults().length > 0 : filteredImages().length > 0;
  };

  return (
    <div>
      <Show when={props.isLoading()}>
        <div class="flex justify-center items-center h-full">
          <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Show>
      <Show when={!props.isLoading() && !hasResults()}>
        <div class="text-center text-gray-500 mt-10">
          <p class="text-lg">No results to display.</p>
        </div>
      </Show>
      <Show when={!props.isLoading() && hasResults()}>
        {/* Temporal Results View */}
        <Show when={props.isTemporalResult()}>
          <div class="space-y-8">
            <For each={filteredTemporalResults()}>
              {(videoResult) => (
                <TemporalResultCard
                  result={videoResult}
                  handlers={props}
                  gridCols={props.gridCols}
                />
              )}
            </For>
          </div>
        </Show>

        {/* Standard Results View */}
        <Show when={!props.isTemporalResult()}>
          <Show when={props.groupByVideo()}>
            <div class="space-y-4">
              <For each={groupedImages()}>
                {([video, items]) => (
                  <GroupedResultCard video={video} items={items} handlers={props} gridCols={props.gridCols} />
                )}
              </For>
            </div>
          </Show>
          <Show when={!props.groupByVideo()}>
            <div
              class="grid gap-4"
              style={{ "grid-template-columns": `repeat(${props.gridCols()}, minmax(0, 1fr))` }}
            >
              <For each={filteredImages()}>
                {(item) => (
                  <ResultCard
                    item={item}
                    handlers={props}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
};
export default RightPanel;
