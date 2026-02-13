
import React, { useState, useEffect } from 'react';

interface TreeItemProps {
  label?: string | number;
  value: any;
  depth: number;
  searchQuery?: string;
  path?: string[];
  onNodeSelect?: (path: string[]) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ label, value, depth, searchQuery, path = [], onNodeSelect }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  const currentPath = label !== undefined ? [...path, String(label)] : path;
  
  const labelMatches = searchQuery && label?.toString().toLowerCase().includes(searchQuery.toLowerCase());
  const valueMatches = searchQuery && !isObject && value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
  const isVisible = !searchQuery || labelMatches || valueMatches || (isObject && JSON.stringify(value).toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (searchQuery && isVisible) setIsOpen(true);
  }, [searchQuery, isVisible]);

  if (!isVisible) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (onNodeSelect && label !== undefined) onNodeSelect(currentPath);
  };

  if (!isObject) {
    return (
      <div 
        className={`flex items-start py-0.5 ml-4 border-l border-gray-200 pl-4 group cursor-pointer hover:bg-indigo-50/50 rounded transition-colors ${valueMatches ? 'bg-amber-100 ring-1 ring-amber-200' : ''}`}
        onClick={() => onNodeSelect && onNodeSelect(currentPath)}
      >
        {label !== undefined && (
          <span className={`text-blue-600 font-medium mr-2 ${labelMatches ? 'bg-amber-200' : ''}`}>"{label}":</span>
        )}
        <span className={`${typeof value === 'string' ? 'text-green-600' : 'text-amber-600'} ${valueMatches ? 'font-bold underline' : ''}`}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);

  return (
    <div className="ml-4 border-l border-gray-200">
      <div 
        className={`flex items-center py-1 cursor-pointer hover:bg-gray-100/80 rounded px-2 pl-0 group ${labelMatches ? 'bg-amber-100 ring-1 ring-amber-200' : ''}`}
        onClick={toggle}
      >
        <span className="mr-1 text-gray-400 w-4 inline-block text-center select-none text-[10px]">
          {isOpen ? '▼' : '▶'}
        </span>
        {label !== undefined && (
          <span className={`text-blue-600 font-medium mr-2 ${labelMatches ? 'bg-amber-200' : ''}`}>"{label}":</span>
        )}
        <span className="text-gray-400 text-[10px] font-mono opacity-60">
          {isArray ? `Array(${value.length})` : `Object{${Object.keys(value).length}}`}
        </span>
      </div>
      
      {isOpen && (
        <div className="pl-2 border-l border-gray-100 ml-2">
          {entries.map(([k, v], idx) => (
            <TreeItem 
              key={idx} 
              label={k} 
              value={v} 
              depth={depth + 1} 
              searchQuery={searchQuery} 
              path={currentPath}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeViewer: React.FC<{ data: any, searchQuery?: string, onNodeSelect?: (path: string[]) => void }> = ({ data, searchQuery, onNodeSelect }) => {
  return (
    <div className="code-font text-sm">
      <TreeItem value={data} depth={0} searchQuery={searchQuery} onNodeSelect={onNodeSelect} />
    </div>
  );
};
