import { Component } from 'solid-js';

interface ModalInputControlsProps {
  modalVideoId: string;
  modalKeyframeId: string;
  modalNote: string;
  setModalNote: (note: string) => void;
  handleModalAddToSubmission: () => void;
}

const ModalInputControls: Component<ModalInputControlsProps> = (props) => {
  return (
    <div class="flex items-center space-x-3 w-full">
      <label class="text-sm font-medium">Video ID:</label>
      <input type="text" readOnly class="p-1 border rounded text-sm w-32 bg-gray-100" value={props.modalVideoId} />
      <label class="text-sm font-medium">Keyframe ID:</label>
      <input type="text" readOnly class="p-1 border rounded text-sm w-24 bg-gray-100" value={props.modalKeyframeId} />
      <label class="text-sm font-medium">Note:</label>
      <input
        type="text"
        class="p-1 border rounded text-sm flex-grow"
        placeholder="Add a note..."
        value={props.modalNote}
        onInput={(e) => props.setModalNote(e.currentTarget.value)}
      />
      <button
        class="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        onClick={props.handleModalAddToSubmission}
        disabled={!props.modalVideoId || !props.modalKeyframeId}
        title="Add to List"
      >
        <i class="fas fa-plus-circle"></i>
      </button>
    </div>
  );
};

export default ModalInputControls;