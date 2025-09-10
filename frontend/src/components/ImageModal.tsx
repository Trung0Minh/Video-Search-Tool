import { Component } from 'solid-js';

interface ImageModalProps {
  imageUrl: string;
}

const ImageModal: Component<ImageModalProps> = (props) => {
  return (
    <div class="w-full h-full flex items-center justify-center bg-black">
      <img 
        src={props.imageUrl} 
        alt="Zoomed Keyframe" 
        class="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default ImageModal;