import { createSignal, onMount, For, Accessor, Setter } from 'solid-js';

interface ObjectFilterProps {
  selectedObjects: Accessor<string[]>;
  setSelectedObjects: Setter<string[]>;
  API_BASE_URL: string;
}

const ObjectFilter = (props: ObjectFilterProps) => {
  const [allObjects, setAllObjects] = createSignal<string[]>([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [isOpen, setIsOpen] = createSignal(true);

  onMount(async () => {
    try {
      const response = await fetch(`${props.API_BASE_URL}/api/objects`);
      if (response.ok) {
        const data = await response.json();
        setAllObjects(data);
      } else {
        console.error('Failed to fetch objects');
      }
    } catch (error) {
      console.error('Error fetching objects:', error);
    }
  });

  const filteredObjects = () => {
    if (!searchTerm()) {
      return allObjects();
    }
    return allObjects().filter(obj => 
      obj.toLowerCase().includes(searchTerm().toLowerCase())
    );
  };

  const handleCheckboxChange = (object: string, checked: boolean) => {
    if (checked) {
      props.setSelectedObjects([...props.selectedObjects(), object]);
    } else {
      props.setSelectedObjects(props.selectedObjects().filter(o => o !== object));
    }
  };

  return (
    <div>
      <div class="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen())}>
        <label class="block text-sm font-medium text-gray-700">Objects</label>
        <span class="text-gray-500">{isOpen() ? '▲' : '▼'}</span>
      </div>
      {isOpen() && (
        <div class="mt-2">
          <input
            type="text"
            placeholder={`Search ${allObjects().length} objects...`}
            class="w-full p-2 border rounded shadow-sm mb-2"
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <div class="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
            <For each={filteredObjects()}>
              {(object) => (
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id={`obj-${object}`}
                    class="mr-2"
                    checked={props.selectedObjects().includes(object)}
                    onChange={(e) => handleCheckboxChange(object, e.currentTarget.checked)}
                  />
                  <label for={`obj-${object}`} class="text-sm text-gray-800">{object}</label>
                </div>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectFilter;