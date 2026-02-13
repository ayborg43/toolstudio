
export type ActiveApp = 'hub' | 'json-studio' | 'xml-architect';

export type ViewMode = 'editor' | 'tree' | 'visualizer';

export interface JsonStats {
  size: number;
  keys: number;
  depth: number;
  arrays: number;
  objects: number;
}
