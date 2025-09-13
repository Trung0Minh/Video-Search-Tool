import { Component, Accessor, Setter } from 'solid-js';

interface VietnameseTextFilterProps {
  vietnameseQuery: Accessor<string>;
  setVietnameseQuery: Setter<string>;
}

const VietnameseTextFilter: Component<VietnameseTextFilterProps> = (props) => {
  return (
    <div>
      <label for="vietnamese-text-filter" class="block text-sm font-medium text-gray-700">Text Filter</label>
      <input 
        type="text" 
        id="vietnamese-text-filter" 
        class="mt-1 w-full p-2 border rounded shadow-sm"
        placeholder="Any related text"
        value={props.vietnameseQuery()}
        onInput={(e) => props.setVietnameseQuery(e.currentTarget.value)}
      />
    </div>
  );
};

export default VietnameseTextFilter;
