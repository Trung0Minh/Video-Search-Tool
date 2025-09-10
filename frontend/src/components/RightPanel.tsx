import { For, Show, type Component, type Accessor } from 'solid-js';
import ResultCard from './ResultCard';
import GroupedResultCard from './GroupedResultCard';
import TemporalResultCard from './TemporalResultCard';
import type { SearchResultItem, TemporalQueryResult } from '../App';

interface RightPanelProps {
  images: Accessor<SearchResultItem[]>;
  temporalResults: Accessor<TemporalQueryResult[]>;
  isTemporalResult: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  onVideoView: (videoUrl: string, videoId: string, keyframeId: string) => void;
  onKeyframeView: (videoId: string) => void;
  onPopulateIdFields: (videoId: string, keyframeIndex: string) => void;
  onDirectAddToSubmission: (videoId: string, keyframeIndex: number) => void;
  onImageZoom: (imageUrl: string) => void;
  gridCols: Accessor<number>;
  groupByVideo: Accessor<boolean>;
}

const RightPanel: Component<RightPanelProps> = (props) => {
  const groupedImages = () => {
    if (!props.groupByVideo()) return null;
    const groups: { [key: string]: SearchResultItem[] } = {};
    props.images().forEach(item => {
      if (!groups[item.video_id]) {
        groups[item.video_id] = [];
      }
      groups[item.video_id].push(item);
    });
    return Object.entries(groups);
  };

  const hasResults = () => {
    return props.isTemporalResult() ? props.temporalResults().length > 0 : props.images().length > 0;
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
            <For each={props.temporalResults()}>
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
                {([video_id, items]) => (
                  <GroupedResultCard video_id={video_id} items={items} handlers={props} gridCols={props.gridCols} />
                )}
              </For>
            </div>
          </Show>
          <Show when={!props.groupByVideo()}>
            <div
              class="grid gap-4"
              style={{ "grid-template-columns": `repeat(${props.gridCols()}, minmax(0, 1fr))` }}
            >
              <For each={props.images()}>
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
