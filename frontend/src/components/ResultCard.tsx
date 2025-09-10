import { Component } from 'solid-js';
import type { SearchResultItem } from '../App';

interface ResultCardProps {
  item: SearchResultItem;
  handlers: {
    onVideoView: (videoUrl: string, videoId: string, keyframeId: string) => void;
    onKeyframeView: (videoId: string) => void;
    onPopulateIdFields: (videoId: string, keyframeIndex: string) => void;
    onDirectAddToSubmission: (videoId: string, keyframeIndex: number) => void;
    onImageZoom: (imageUrl: string) => void;
  }
}

const ResultCard: Component<ResultCardProps> = (props) => {
  const displayText = `${props.item.video_id}/${props.item.keyframe_index}`;
  const altText = `${props.item.video_id}/${props.item.keyframe_id}.jpg`;

  return (
    <div class="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-white">
      <img
        src={props.item.image_url}
        alt={altText}
        class="w-full h-48 object-cover cursor-pointer"
        onClick={() => props.handlers.onImageZoom(props.item.image_url)}
      />
      <div class="px-1 pb-1">
        <p class="text-sm font-medium text-gray-700 truncate text-center">{displayText}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          <button class="flex-1 p-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => props.handlers.onVideoView(props.item.video_url, props.item.video_id, props.item.keyframe_id)} title="View Video">
            ▶️
          </button>
          <button class="flex-1 p-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600" onClick={() => props.handlers.onKeyframeView(props.item.video_id)} title="View Keyframes">
            🖼️
          </button>
          <button class="flex-1 p-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600" onClick={() => props.handlers.onPopulateIdFields(props.item.video_id, props.item.keyframe_index.toString())} title="Populate ID">
            🔽
          </button>
          <button 
            class="flex-1 p-2 text-xs bg-green-600 text-white rounded hover:bg-green-700" 
            onClick={() => props.handlers.onDirectAddToSubmission(props.item.video_id, props.item.keyframe_index)} title="Direct Add">
            ➕
          </button>
        </div>
      </div>
    </div>
  );
};
export default ResultCard;