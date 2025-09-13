import { Component, For, Accessor } from 'solid-js';
import type { SearchResultItem } from '../App';
import ResultCard from './ResultCard';

interface GroupedResultCardProps {
  video: string;
  items: SearchResultItem[];
  handlers: {
    onVideoView: (videoUrl: string, video: string, frame: string, frame_index: number) => void;
    onKeyframeView: (video: string) => void;
    onPopulateIdFields: (video: string, frame_index: string) => void;
    onDirectAddToSubmission: (video: string, frame_index: number) => void;
    onImageZoom: (imageUrl: string) => void;
    onExcludeVideo: (video: string) => void;
  };
  gridCols: Accessor<number>;
}

const GroupedResultCard: Component<GroupedResultCardProps> = (props) => {
  return (
    <div class="border rounded-lg p-4">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-bold">{props.video}</h3>
        <button 
          class="p-2 text-xs bg-red-600 text-white rounded hover:bg-red-700" 
          onClick={() => props.handlers.onExcludeVideo(props.video)} title="Exclude Video">
          ❌
        </button>
      </div>
      <div 
        class="grid gap-4"
        style={{ "grid-template-columns": `repeat(${props.gridCols()}, minmax(0, 1fr))` }}
      >
        <For each={props.items}>{(item) => <ResultCard item={item} handlers={props.handlers} />}</For>
      </div>
    </div>
  );
};

export default GroupedResultCard;
