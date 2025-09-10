import { Component, For, Accessor } from 'solid-js';
import type { TemporalQueryResult, SearchResultItem } from '../App';
import ResultCard from './ResultCard';

interface TemporalResultCardProps {
  result: TemporalQueryResult;
  handlers: {
    onVideoView: (videoUrl: string, videoId: string, keyframeId: string) => void;
    onKeyframeView: (videoId: string) => void;
    onPopulateIdFields: (videoId: string, keyframeIndex: string) => void;
    onDirectAddToSubmission: (videoId: string, keyframeIndex: number) => void;
    onImageZoom: (imageUrl: string) => void;
  };
  gridCols: Accessor<number>;
}

const TemporalResultCard: Component<TemporalResultCardProps> = (props) => {
  return (
    <div class="bg-white border border-gray-200 rounded-lg shadow-md p-4">
      <h2 class="text-xl font-bold text-gray-800 mb-3">
        Video: {props.result.video_id}
      </h2>
      <div class="space-y-4">
        <For each={props.result.query_results}>
          {(queryResult) => (
            <div>
              <h3 class="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">
                Results for: <span class="font-mono text-blue-600">"{queryResult.query}"</span>
              </h3>
              <div
                class="grid gap-4"
                style={{ "grid-template-columns": `repeat(${props.gridCols()}, minmax(0, 1fr))` }}
              >
                <For each={queryResult.keyframes}>
                  {(keyframe) => {
                    const item: SearchResultItem = {
                      video_id: props.result.video_id,
                      video_url: props.result.video_url,
                      keyframe_id: keyframe.keyframe_id,
                      keyframe_index: keyframe.keyframe_index,
                      image_url: keyframe.image_url,
                    };
                    return <ResultCard item={item} handlers={props.handlers} />;
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default TemporalResultCard;
