import { Component, Show } from 'solid-js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: any; // Content to display inside the modal
  footer?: any;
  size?: 'default' | 'large' | 'extra-large';
}

const Modal: Component<ModalProps> = (props) => {
  const sizeClass = () => {
    switch (props.size) {
      case 'large':
        return 'max-w-5xl';
      case 'extra-large':
        return 'max-w-7xl';
      default:
        return 'max-w-3xl';
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <div 
          class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={props.onClose}
        ></div>

        {/* Modal Content */}
        <div class={`relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col ${sizeClass()}`}>
          {/* Close Button (X icon) */}
          <div class="absolute top-3 right-3 z-10">
            <button
              onClick={props.onClose}
              class="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div class="flex-grow overflow-y-auto">
            {props.children}
          </div>

          {/* Modal Footer */}
          <Show when={props.footer}>
            <div class="p-4 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
              <div class="w-full">{props.footer}</div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default Modal;