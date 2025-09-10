import { Component, For, Accessor } from 'solid-js';
import type { SearchResultItem } from '../App';
import ResultCard from './ResultCard';

interface GroupedResultCardProps {
  video_id: string;
  items: SearchResultItem[];
  handlers: {
    onVideoView: (videoUrl: string, videoId: string, keyframeId: string) => void;
    onKeyframeView: (videoId: string) => void;
    onPopulateIdFields: (videoId: string, keyframeIndex: string) => void;
    onDirectAddToSubmission: (videoId: string, keyframeIndex: number) => void;
    onImageZoom: (imageUrl: string) => void;
  };
  gridCols: Accessor<number>;
}

const GroupedResultCard: Component<GroupedResultCardProps> = (props) => {
  return (
    <div class="border rounded-lg p-4">
      <h3 class="text-lg font-bold mb-2">{props.video_id}</h3>
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