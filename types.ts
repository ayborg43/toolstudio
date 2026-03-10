
export type ActiveApp = 'hub' | 'json-studio' | 'xml-architect' | 'yaml-editor' | 'jwt-decoder' | 'base64-tool' | 'diff-tool';

export type ViewMode = 'editor' | 'tree' | 'visualizer';

export interface JsonStats {
  size: number;
  keys: number;
  depth: number;
  arrays: number;
  objects: number;
}
