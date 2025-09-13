import { Component, createSignal, onMount, For, Accessor, Setter, Show } from 'solid-js';

interface PackFilterProps {
  selectedPacks: Accessor<string[]>;
  setSelectedPacks: Setter<string[]>;
  API_BASE_URL: string;
}

const PackFilter: Component<PackFilterProps> = (props) => {
  const [availablePacks, setAvailablePacks] = createSignal<string[]>([]);
  const [isOpen, setIsOpen] = createSignal(false);

  onMount(async () => {
    try {
      const response = await fetch(`${props.API_BASE_URL}/api/packs`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePacks(data);
      }
    } catch (error) {
      console.error("Failed to fetch packs:", error);
    }
  });

  const handlePackSelection = (pack: string) => {
    const currentSelection = props.selectedPacks();
    if (currentSelection.includes(pack)) {
      props.setSelectedPacks(currentSelection.filter(p => p !== pack));
    } else {
      props.setSelectedPacks([...currentSelection, pack]);
    }
  };

  return (
    <div>
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-gray-700">Packs</label>
        <Show when={props.selectedPacks().length > 0}>
          <button 
            class="text-xs text-blue-500 hover:text-blue-700"
            onClick={() => props.setSelectedPacks([])}
          >
            Clear All
          </button>
        </Show>
      </div>
      <div class="relative mt-1">
        <button 
          class="w-full p-2 border rounded shadow-sm text-left bg-white"
          onClick={() => setIsOpen(!isOpen())}
        >
          <span class="block">
            {props.selectedPacks().length === 0
              ? 'Select packs...'
              : props.selectedPacks().join(', ')}
          </span>
        </button>
        <div class={`absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg ${isOpen() ? 'block' : 'hidden'}`}>
          <ul class="max-h-60 overflow-auto">
            <For each={availablePacks()}>{pack => 
              <li class="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handlePackSelection(pack)}>
                <input 
                  type="checkbox" 
                  class="mr-2"
                  checked={props.selectedPacks().includes(pack)}
                />
                {pack}
              </li>
            }</For>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PackFilter;