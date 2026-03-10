
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TreeViewer } from './components/TreeViewer';
import { Visualizer } from './components/Visualizer';
import { ViewMode, JsonStats, ActiveApp } from './types';
import { convertFormat } from './services/gemini';

// ---------------------------------------------------------------------------
// Copy-to-clipboard hook
// ---------------------------------------------------------------------------
const useCopyToClipboard = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  return { copy, copiedKey };
};

// ---------------------------------------------------------------------------
// Reusable Copy Button
// ---------------------------------------------------------------------------
const CopyButton: React.FC<{
  text: string;
  label?: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  isDarkMode: boolean;
  variant?: 'subtle' | 'badge';
}> = ({ text, label = 'Copy', copyKey, copiedKey, onCopy, isDarkMode, variant = 'subtle' }) => {
  const isCopied = copiedKey === copyKey;

  if (variant === 'badge') {
    return (
      <button
        onClick={() => onCopy(text, copyKey)}
        disabled={!text}
        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all disabled:opacity-30 ${isCopied
          ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20'
          : isDarkMode
            ? 'text-indigo-400 bg-indigo-900/30 border-indigo-800 hover:bg-indigo-900/50'
            : 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
          }`}
      >
        {isCopied ? '✓ COPIED' : label}
      </button>
    );
  }

  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      disabled={!text}
      title={isCopied ? 'Copied!' : 'Copy to clipboard'}
      className={`text-xs font-bold transition-colors disabled:opacity-30 ${isCopied
        ? 'text-green-500'
        : isDarkMode
          ? 'text-indigo-400 hover:text-indigo-300'
          : 'text-indigo-600 hover:text-indigo-800'
        }`}
    >
      {isCopied ? '✓ Copied!' : label}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Export Menu — dropdown for YAML / CSV / JSON download
// ---------------------------------------------------------------------------
type ExportFormat = 'yaml' | 'csv' | 'json';

const EXPORT_OPTIONS: { label: string; ext: string; mime: string; format: ExportFormat; ai: boolean }[] = [
  { label: 'YAML', ext: 'yaml', mime: 'text/yaml', format: 'yaml', ai: true },
  { label: 'CSV', ext: 'csv', mime: 'text/csv', format: 'csv', ai: true },
  { label: 'JSON', ext: 'json', mime: 'application/json', format: 'json', ai: false },
];

const ExportMenu: React.FC<{
  jsonInput: string;
  parsedData: any;
  isDarkMode: boolean;
  onExport: (format: ExportFormat) => Promise<void>;
  loadingFormat: ExportFormat | null;
}> = ({ parsedData, isDarkMode, onExport, loadingFormat }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isLoading = loadingFormat !== null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!parsedData || isLoading}
        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all disabled:opacity-30 ${isDarkMode
          ? 'text-indigo-400 bg-indigo-900/30 border-indigo-800 hover:bg-indigo-900/50'
          : 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
          }`}
      >
        {isLoading ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {isLoading ? `${loadingFormat!.toUpperCase()}…` : 'EXPORT'}
        {!isLoading && (
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && !isLoading && (
        <div className={`absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-xl z-50 overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          {EXPORT_OPTIONS.map(({ label, format, ai }) => (
            <button
              key={format}
              onClick={() => { setOpen(false); onExport(format); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${isDarkMode
                ? 'text-gray-200 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
            >
              <span>.{format.toUpperCase()}</span>
              {ai && (
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                  }`}>AI</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Undo/Redo hook
// ---------------------------------------------------------------------------
const useUndoRedo = <T,>(initialState: T, delay: number = 500) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [pointer, setPointer] = useState(0);
  const [internalState, setInternalState] = useState<T>(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushState = useCallback((state: T) => {
    setInternalState(state);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setHistory(prev => {
        const newHistory = prev.slice(0, pointer + 1);
        if (newHistory[newHistory.length - 1] === state) return prev;
        newHistory.push(state);
        // Limit history to 50 items
        if (newHistory.length > 50) newHistory.shift();
        setPointer(newHistory.length - 1);
        return newHistory;
      });
    }, delay);
  }, [pointer, delay]);

  const undo = useCallback(() => {
    if (pointer > 0) {
      const nextPointer = pointer - 1;
      setPointer(nextPointer);
      setInternalState(history[nextPointer]);
    }
  }, [pointer, history]);

  const redo = useCallback(() => {
    if (pointer < history.length - 1) {
      const nextPointer = pointer + 1;
      setPointer(nextPointer);
      setInternalState(history[nextPointer]);
    }
  }, [pointer, history]);

  const setManual = useCallback((state: T) => {
    setInternalState(state);
    setHistory(prev => {
      const newHistory = prev.slice(0, pointer + 1);
      newHistory.push(state);
      if (newHistory.length > 50) newHistory.shift();
      setPointer(newHistory.length - 1);
      return newHistory;
    });
  }, [pointer]);

  return {
    state: internalState,
    setState: pushState,
    setManual,
    undo,
    redo,
    canUndo: pointer > 0,
    canRedo: pointer < history.length - 1
  };
};

// ---------------------------------------------------------------------------
// File import hook
// ---------------------------------------------------------------------------
const useFileImport = (onLoad: (content: string) => void, accept: string) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onLoad(ev.target?.result as string ?? '');
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
  }, [onLoad]);

  const FileInput = useCallback(() => (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      onChange={handleInputChange}
      className="hidden"
    />
  ), [accept, handleInputChange]);

  return { openFilePicker, FileInput };
};

// ---------------------------------------------------------------------------
// Download / export utility
// ---------------------------------------------------------------------------
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// DragDropEditor — textarea with a drop overlay
// ---------------------------------------------------------------------------
const DragDropEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  accept: string[];         // e.g. ['.json', '.txt']
  isDarkMode: boolean;
  accentClass: string;      // e.g. 'border-indigo-500' or 'border-emerald-500'
  className?: string;
}> = ({ value, onChange, accept, isDarkMode, accentClass, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!accept.includes(ext) && !accept.includes('.' + file.type.split('/').pop())) {
      // still allow plain text
      if (file.type !== 'text/plain' && !accept.includes('.txt')) return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div
      className={`relative flex-1 flex flex-col ${className}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 p-8 code-font text-sm resize-none focus:outline-none ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
          }`}
        spellCheck={false}
      />
      {isDragging && (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed ${accentClass} ${isDarkMode ? 'bg-gray-900/90' : 'bg-white/90'
          } backdrop-blur-sm pointer-events-none`}>
          <svg className={`w-12 h-12 mb-3 ${accentClass.includes('indigo') ? 'text-indigo-500' : 'text-emerald-500'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className={`text-sm font-bold ${accentClass.includes('indigo') ? 'text-indigo-600' : 'text-emerald-600'
            }`}>Drop file to import</p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Accepts {accept.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

const INITIAL_JSON = `{
  "app": "Azela Studio",
  "version": "1.2.0",
  "status": "active"
}`;

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<app>
  <name>XML Architect</name>
  <version>1.0.0</version>
  <status>stable</status>
  <features>
    <feature>Formatting</feature>
    <feature>Validation</feature>
    <feature>JSON Conversion</feature>
  </features>
</app>`;

const App: React.FC = () => {
  const { copy, copiedKey } = useCopyToClipboard();
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Global Navigation State
  const [activeApp, setActiveApp] = useState<ActiveApp>('hub');

  // File input refs
  const jsonFileInputRef = React.useRef<HTMLInputElement>(null);
  const xmlFileInputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // JSON Studio State
  const {
    state: jsonInput,
    setState: setJsonInput,
    setManual: setJsonInputManual,
    undo: undoJson,
    redo: redoJson,
    canUndo: canUndoJson,
    canRedo: canRedoJson
  } = useUndoRedo(INITIAL_JSON);
  const [parsedData, setParsedData] = useState<any>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonViewMode, setJsonViewMode] = useState<ViewMode>('editor');
  const [jsonIsMaximized, setJsonIsMaximized] = useState(false);
  const [jsonSearchQuery, setJsonSearchQuery] = useState('');
  const [jsonActivePath, setJsonActivePath] = useState<string[]>([]);

  // XML Architect State
  const [xmlInput, setXmlInput] = useState(INITIAL_XML);
  const [xmlViewMode, setXmlViewMode] = useState<'editor'>('editor');
  const [xmlError, setXmlError] = useState<string | null>(null);

  // YAML Editor State
  const [yamlInput, setYamlInput] = useState('---\napp: Azela Studio\nstatus: active');
  const [yamlError, setYamlError] = useState<string | null>(null);

  // JWT Decoder State
  const [jwtInput, setJwtInput] = useState('');
  const [jwtHeader, setJwtHeader] = useState<any>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);
  const [jwtError, setJwtError] = useState<string | null>(null);

  // Base64 Tool State
  const [base64Input, setBase64Input] = useState('');
  const [base64Output, setBase64Output] = useState('');
  const [base64Mode, setBase64Mode] = useState<'encode' | 'decode'>('encode');

  // Diff Tool State
  const [diffLeft, setDiffLeft] = useState('');
  const [diffRight, setDiffRight] = useState('');

  // Shared State
  const [isLoading, setIsLoading] = useState(false);

  // Export loading state
  const [jsonExportLoading, setJsonExportLoading] = useState<ExportFormat | null>(null);

  // Handle YAML / CSV / JSON export
  const handleJsonExport = useCallback(async (format: ExportFormat) => {
    if (!jsonInput.trim()) return;
    const opt = EXPORT_OPTIONS.find(o => o.format === format)!;
    if (!opt.ai) {
      // JSON — direct download, no AI needed
      downloadFile(jsonInput, `data.${opt.ext}`, opt.mime);
      return;
    }
    setJsonExportLoading(format);
    try {
      const result = await convertFormat(jsonInput, format);
      downloadFile(result, `data.${opt.ext}`, opt.mime);
    } catch {
      alert(`Export to ${format.toUpperCase()} failed. Make sure your API key is configured.`);
    } finally {
      setJsonExportLoading(null);
    }
  }, [jsonInput]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // Ctrl+S  → format (pretty-print) the active editor
  // Ctrl+M  → minify the active editor
  // Ctrl+K  → focus Tree search (switches to Tree view if needed)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey; // support Cmd on macOS
      if (!ctrl) return;

      if (e.key === 's') {
        e.preventDefault();
        if (activeApp === 'json-studio' && parsedData) {
          setJsonInputManual(JSON.stringify(parsedData, null, 2));
        } else if (activeApp === 'xml-architect') {
          setXmlInput(prev =>
            prev.replace(/><\s*/g, '>\n<').trim()
          );
        }
      } else if (e.key === 'm') {
        e.preventDefault();
        if (activeApp === 'json-studio' && parsedData) {
          setJsonInputManual(JSON.stringify(parsedData));
        } else if (activeApp === 'xml-architect') {
          setXmlInput(prev => prev.replace(/>\s+</g, '><').trim());
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        if (activeApp === 'json-studio') {
          setJsonViewMode('tree');
          // Focus after React re-renders
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      } else if (e.key === 'z') {
        e.preventDefault();
        if (activeApp === 'json-studio') {
          undoJson();
        }
      } else if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) {
        e.preventDefault();
        if (activeApp === 'json-studio') {
          redoJson();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeApp, parsedData]);

  // Sync JSON parsing
  useEffect(() => {
    try {
      if (jsonInput.trim() === '') {
        setParsedData(null);
        setJsonError(null);
        return;
      }
      const parsed = JSON.parse(jsonInput);
      setParsedData(parsed);
      setJsonError(null);
    } catch (e: any) {
      setParsedData(null);
      setJsonError(e.message);
    }
  }, [jsonInput]);

  const jsonStats = useMemo<JsonStats | null>(() => {
    if (!parsedData) return null;
    let keys = 0, depth = 0, arrays = 0, objects = 0;
    const traverse = (obj: any, currentDepth: number) => {
      depth = Math.max(depth, currentDepth);
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          arrays++;
          obj.forEach(item => traverse(item, currentDepth + 1));
        } else {
          objects++;
          const entries = Object.entries(obj);
          keys += entries.length;
          entries.forEach(([_, value]) => traverse(value, currentDepth + 1));
        }
      }
    };
    traverse(parsedData, 1);
    return { size: new Blob([jsonInput]).size, keys, depth, arrays, objects };
  }, [parsedData, jsonInput]);

  // Count matching nodes for the live search badge
  const jsonSearchMatchCount = useMemo(() => {
    if (!jsonSearchQuery || !parsedData) return 0;
    const q = jsonSearchQuery.toLowerCase();
    let count = 0;
    const walk = (obj: any, key?: string | number) => {
      const keyHit = key !== undefined && String(key).toLowerCase().includes(q);
      if (typeof obj !== 'object' || obj === null) {
        if (keyHit || String(obj).toLowerCase().includes(q)) count++;
        return;
      }
      if (keyHit) count++;
      if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, i));
      else Object.entries(obj).forEach(([k, v]) => walk(v, k));
    };
    walk(parsedData);
    return count;
  }, [jsonSearchQuery, parsedData]);

  const handleXmlAction = async (action: 'format' | 'minify' | 'convert-json') => {
    setIsLoading(true);
    try {
      if (action === 'format') {
        // Simple formatting without AI
        const formatted = xmlInput
          .replace(/>\s+</g, '>\n<')
          .replace(/<\?xml[^>]*\?>/g, match => match + '\n')
          .replace(/<\/?(\w+)[^>]*>/g, match => match + '\n')
          .trim();
        setXmlInput(formatted);
      } else if (action === 'minify') {
        const minified = xmlInput.replace(/>\s+</g, '><').trim();
        setXmlInput(minified);
      } else if (action === 'convert-json') {
        // --- Real XML → JSON via DOMParser ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlInput, 'application/xml');

        // Check for parse errors (browsers embed <parsererror> in doc)
        const parseErr = doc.querySelector('parsererror');
        if (parseErr) {
          throw new Error(parseErr.textContent ?? 'Invalid XML');
        }

        /** Recursively convert a DOM Element to a plain JS object */
        const nodeToJson = (node: Element): any => {
          const obj: any = {};

          // Attributes → @attrName keys
          if (node.attributes.length > 0) {
            for (const attr of Array.from(node.attributes)) {
              obj[`@${attr.name}`] = attr.value;
            }
          }

          const childElements = Array.from(node.children);

          if (childElements.length === 0) {
            // Leaf node — return text content (or merge with attrs)
            const text = node.textContent?.trim() ?? '';
            if (Object.keys(obj).length === 0) return text || null;
            if (text) obj['#text'] = text;
            return obj;
          }

          // Group children by tag name to detect repeated siblings → arrays
          const groups: Record<string, Element[]> = {};
          for (const child of childElements) {
            if (!groups[child.tagName]) groups[child.tagName] = [];
            groups[child.tagName].push(child);
          }

          for (const [tag, elements] of Object.entries(groups)) {
            obj[tag] = elements.length === 1
              ? nodeToJson(elements[0])
              : elements.map(nodeToJson);
          }

          return obj;
        };

        const rootEl = doc.documentElement;
        const result = { [rootEl.tagName]: nodeToJson(rootEl) };

        setJsonInput(JSON.stringify(result, null, 2));
        setActiveApp('json-studio');
        setJsonViewMode('editor');
      }
    } catch (e) {
      alert(`${action} failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  const HubCard = ({ id, title, description, icon, color, tag }: { id: ActiveApp, title: string, description: string, icon: React.ReactNode, color: string, tag?: string }) => (
    <button
      onClick={() => setActiveApp(id)}
      className={`group relative flex flex-col text-left p-8 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-100'}`}
    >
      <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg ${isDarkMode ? 'shadow-gray-900' : 'shadow-gray-100'} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className={`text-2xl font-bold mb-2 group-hover:text-indigo-600 transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
      <div className={`mt-8 flex items-center text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
        Open Application
        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </div>
      {tag && <div className={`absolute top-6 right-6 text-[10px] font-bold px-3 py-1 rounded-full ${isDarkMode ? 'text-indigo-400 bg-indigo-900/30' : 'text-indigo-600 bg-indigo-50'}`}>{tag}</div>}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full group-hover:bg-indigo-50/50 transition-colors -z-10 ${isDarkMode ? 'bg-gray-900 group-hover:bg-indigo-900/20' : 'bg-gray-50'}`}></div>
    </button>
  );

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* Universal Header */}
      <header className={`flex items-center justify-between px-6 py-4 ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-100'} backdrop-blur-md border-b z-50`}>
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveApp('hub')}>
          <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-900'} rounded-xl flex items-center justify-center shadow-lg`}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-none ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Azela Studio</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Data Format Toolkit</p>
          </div>
        </div>

        {activeApp !== 'hub' && (
          <nav className={`flex items-center gap-2 p-1 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <button onClick={() => setActiveApp('hub')} className={`px-4 py-2 text-sm font-bold ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'}`}>Hub</button>
            <div className={`w-[1px] h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} mx-1`}></div>
            <span className={`px-4 py-2 text-sm font-bold rounded-lg shadow-sm border capitalize ${isDarkMode ? 'bg-gray-700 text-indigo-400 border-gray-600' : 'bg-white text-indigo-600 border-gray-200'}`}>
              {activeApp.replace('-', ' ')}
            </span>
          </nav>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-yellow-300' : 'hover:bg-gray-100 text-gray-400'}`}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeApp === 'hub' ? (
          <div className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
            <div className="max-w-6xl mx-auto px-6 py-24">
              <div className="max-w-3xl mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className={`text-6xl font-black tracking-tight leading-[1.1] mb-8 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Everything you need <br /> to <span className="text-indigo-600">build better.</span>
                </h2>
                <p className={`text-xl font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  A high-performance workspace with curated professional tools for the modern engineer. No ads, no tracking, just speed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <HubCard
                  id="json-studio"
                  title="JSON Studio"
                  description="Professional-grade JSON parsing, visualization, and formatting tools."
                  color="bg-blue-600"
                  tag="POPULAR"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                />
                <HubCard
                  id="xml-architect"
                  title="XML Architect"
                  description="Smart XML formatter, validator and converter. Perfect for SOAP/Legacy systems."
                  color="bg-emerald-600"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                />
                <HubCard
                  id="yaml-editor"
                  title="YAML Editor"
                  description="Clean and fast YAML formatting and JSON conversion."
                  color="bg-orange-600"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                />
                <HubCard
                  id="jwt-decoder"
                  title="JWT Decoder"
                  description="Securely decode JSON Web Tokens and inspect header and payload."
                  color="bg-purple-600"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                />
                <HubCard
                  id="base64-tool"
                  title="Base64 Tool"
                  description="Instant Base64 encoding and decoding for your data strings."
                  color="bg-amber-600"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                />
                <HubCard
                  id="diff-tool"
                  title="Diff Tool"
                  description="Side-by-side text comparison to spot differences instantly."
                  color="bg-rose-600"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                />
              </div>

              <div className={`mt-32 pt-20 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-12">
                  <h4 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Platform Performance</h4>
                  <div className={`px-4 py-1 text-[10px] font-black uppercase rounded-full ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>Systems Nominal</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>API LATENCY</p>
                    <p className={`text-3xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>42ms</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>ENGINE UPTIME</p>
                    <p className={`text-3xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>99.9%</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>FORMAT SUPPORT</p>
                    <p className={`text-3xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>JSON/XML</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>DATA PRIVACY</p>
                    <p className={`text-3xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Local-First</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeApp === 'json-studio' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className={`transition-all duration-300 ease-in-out border-r ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'} flex flex-col ${jsonIsMaximized ? 'w-0 opacity-0 overflow-hidden' : 'w-1/2'}`}>
              {/* JSON Import hidden input */}
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setJsonInputManual(ev.target?.result as string ?? '');
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className={`flex items-center justify-between px-6 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-b`}>
                <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Input Buffer</span>
                <div className="flex gap-4 items-center">
                  <div className="flex gap-1">
                    <button
                      onClick={undoJson}
                      disabled={!canUndoJson}
                      title="Undo (Ctrl+Z)"
                      className={`p-1 rounded hover:bg-gray-100 disabled:opacity-30 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button
                      onClick={redoJson}
                      disabled={!canRedoJson}
                      title="Redo (Ctrl+Y)"
                      className={`p-1 rounded hover:bg-gray-100 disabled:opacity-30 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                    </button>
                  </div>
                  <span className={`w-px h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                  <button onClick={() => setJsonInputManual(JSON.stringify(parsedData, null, 2))} className={`text-xs font-bold ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}>Pretty</button>
                  <button onClick={() => setJsonInputManual(JSON.stringify(parsedData))} className={`text-xs font-bold ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}>Ugly</button>
                  <span className={`w-px h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                  <button
                    onClick={() => jsonFileInputRef.current?.click()}
                    title="Import .json file"
                    className={`text-xs font-bold transition-colors ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => downloadFile(jsonInput, 'data.json', 'application/json')}
                    disabled={!jsonInput.trim()}
                    title="Export as .json"
                    className={`text-xs font-bold transition-colors disabled:opacity-30 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}
                  >
                    Export
                  </button>
                  <span className={`w-px h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                  <CopyButton text={jsonInput} label="Copy" copyKey="json-input" copiedKey={copiedKey} onCopy={copy} isDarkMode={isDarkMode} />
                </div>
              </div>
              <DragDropEditor
                value={jsonInput}
                onChange={setJsonInput}
                accept={['.json', '.txt']}
                isDarkMode={isDarkMode}
                accentClass="border-indigo-500"
              />
            </div>
            <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              {/* Output panel toolbar */}
              <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex gap-2">
                  {(['editor', 'tree', 'visualizer'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setJsonViewMode(m)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${jsonViewMode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-900'}`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 items-center">
                  {/* Search toggle — only show when tree is active */}
                  {jsonViewMode === 'tree' && (
                    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                      }`}>
                      <svg className={`w-3 h-3 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={jsonSearchQuery}
                        onChange={(e) => {
                          setJsonSearchQuery(e.target.value);
                          if (jsonViewMode !== 'tree') {
                            setJsonViewMode('tree');
                          }
                        }}
                        placeholder="Search keys & values…"
                        className={`w-40 text-xs font-medium bg-transparent focus:outline-none placeholder-gray-400 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                          }`}
                      />
                      {jsonSearchQuery && (
                        <>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${jsonSearchMatchCount > 0
                            ? isDarkMode ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                            : isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'
                            }`}>
                            {jsonSearchMatchCount > 0 ? jsonSearchMatchCount : '0'}
                          </span>
                          <button
                            onClick={() => setJsonSearchQuery('')}
                            className={`text-[11px] font-bold leading-none ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                              }`}
                            title="Clear search"
                          >✕</button>
                        </>
                      )}
                    </div>
                  )}
                  <ExportMenu jsonInput={jsonInput} parsedData={parsedData} isDarkMode={isDarkMode} onExport={handleJsonExport} loadingFormat={jsonExportLoading} />
                  <CopyButton text={jsonInput} label="COPY" copyKey="json-output" copiedKey={copiedKey} onCopy={copy} isDarkMode={isDarkMode} variant="badge" />
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable content */}
                <div className="flex-1 overflow-auto p-8">
                  {jsonViewMode === 'editor' && jsonStats && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Payload Size */}
                        <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50/60 border-blue-100'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-blue-400'}`}>Payload Size</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{(jsonStats.size / 1024).toFixed(2)} <span className="text-sm font-bold opacity-50">KB</span></p>
                          </div>
                        </div>
                        {/* Total Keys */}
                        <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-indigo-50/60 border-indigo-100'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-indigo-400'}`}>Total Keys</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{jsonStats.keys}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Max Depth */}
                        <div className={`p-5 rounded-2xl border flex items-start gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50/60 border-violet-100'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-violet-900/40' : 'bg-violet-100'}`}>
                            <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-violet-400'}`}>Max Depth</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{jsonStats.depth}</p>
                          </div>
                        </div>
                        {/* Arrays */}
                        <div className={`p-5 rounded-2xl border flex items-start gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-amber-50/60 border-amber-100'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-amber-500'}`}>Arrays</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{jsonStats.arrays}</p>
                          </div>
                        </div>
                        {/* Objects */}
                        <div className={`p-5 rounded-2xl border flex items-start gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50/60 border-emerald-100'}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-emerald-500'}`}>Objects</p>
                            <p className={`text-2xl font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{jsonStats.objects}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {jsonViewMode === 'tree' && <TreeViewer data={parsedData} searchQuery={jsonSearchQuery} onNodeSelect={setJsonActivePath} />}
                  {jsonViewMode === 'visualizer' && <Visualizer data={parsedData} />}
                </div>

                {/* JSON Path bar — visible in tree mode when a node is selected */}
                {jsonViewMode === 'tree' && (
                  <div className={`flex-shrink-0 border-t flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    {/* Path icon */}
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>

                    {jsonActivePath.length === 0 ? (
                      <span className={`text-[11px] font-medium italic ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Click a node in the tree to see its path
                      </span>
                    ) : (
                      <>
                        {/* Breadcrumb segments */}
                        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
                          {/* Root segment */}
                          <span className={`text-[11px] font-bold flex-shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>root</span>
                          {jsonActivePath.map((seg, i) => (
                            <React.Fragment key={i}>
                              <svg className={`w-3 h-3 flex-shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className={`text-[11px] font-semibold flex-shrink-0 ${i === jsonActivePath.length - 1
                                ? isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                {seg}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Copy path button */}
                        <button
                          onClick={() => copy('root.' + jsonActivePath.join('.'), 'json-path')}
                          title="Copy dot-notation path"
                          className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${copiedKey === 'json-path'
                            ? 'bg-green-500 text-white'
                            : isDarkMode
                              ? 'bg-gray-800 text-gray-400 hover:text-indigo-400 border border-gray-700'
                              : 'bg-white text-gray-400 hover:text-indigo-600 border border-gray-200'
                            }`}
                        >
                          {copiedKey === 'json-path' ? '✓' : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                          {copiedKey === 'json-path' ? 'COPIED' : 'COPY PATH'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeApp === 'xml-architect' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className={`w-1/2 border-r ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'} flex flex-col`}>
              {/* XML Import hidden input */}
              <input
                ref={xmlFileInputRef}
                type="file"
                accept=".xml,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setXmlInput(ev.target?.result as string ?? '');
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className={`flex items-center justify-between px-6 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-b`}>
                <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>XML Input</span>
                <div className="flex gap-4 items-center">
                  <button onClick={() => handleXmlAction('format')} className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-800'}`}>Pretty</button>
                  <button onClick={() => handleXmlAction('minify')} className={`text-xs font-bold ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-800'}`}>Ugly</button>
                  <span className={`w-px h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'}`} />
                  <button
                    onClick={() => xmlFileInputRef.current?.click()}
                    title="Import .xml file"
                    className={`text-xs font-bold transition-colors ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-800'}`}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => downloadFile(xmlInput, 'data.xml', 'application/xml')}
                    disabled={!xmlInput.trim()}
                    title="Export as .xml"
                    className={`text-xs font-bold transition-colors disabled:opacity-30 ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-800'}`}
                  >
                    Export
                  </button>
                  <span className={`w-px h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-500'}`} />
                  <CopyButton text={xmlInput} label="Copy" copyKey="xml-input" copiedKey={copiedKey} onCopy={copy} isDarkMode={isDarkMode} />
                </div>
              </div>
              <DragDropEditor
                value={xmlInput}
                onChange={setXmlInput}
                accept={['.xml', '.txt']}
                isDarkMode={isDarkMode}
                accentClass="border-emerald-500"
              />
            </div>
            <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex gap-2">
                  <button
                    onClick={() => setXmlViewMode('editor')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${xmlViewMode === 'editor' ? 'bg-emerald-600 text-white shadow-lg' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    DASHBOARD
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleXmlAction('convert-json')} className={`px-3 py-1 text-xs font-bold rounded-lg border ${isDarkMode ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800 hover:bg-emerald-900/50' : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}>TO JSON</button>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Processing Architecture...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 max-w-2xl">
                    <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
                      <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>XML Structural Health</h4>
                      <p className={`text-sm mb-6 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-700/80'}`}>Automated analysis of tag hierarchy and encoding standards.</p>
                      <div className="flex gap-4">
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border ${isDarkMode ? 'bg-gray-800 text-emerald-400 border-emerald-800' : 'bg-white text-emerald-600 border-emerald-100'}`}>UTF-8 Detected</div>
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border ${isDarkMode ? 'bg-gray-800 text-emerald-400 border-emerald-800' : 'bg-white text-emerald-600 border-emerald-100'}`}>Well-Formed</div>
                      </div>
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Quick Conversion</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleXmlAction('convert-json')} className={`p-4 rounded-2xl border text-center transition-all group ${isDarkMode ? 'bg-gray-700 hover:bg-indigo-900/30 border-gray-600' : 'bg-white hover:bg-indigo-50 border-gray-200'}`}>
                          <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-400 group-hover:text-indigo-400' : 'text-gray-400 group-hover:text-indigo-600'}`}>Export to</p>
                          <p className={`text-xl font-black ${isDarkMode ? 'text-gray-100 group-hover:text-indigo-400' : 'text-gray-900 group-hover:text-indigo-600'}`}>JSON</p>
                        </button>
                        <button className={`p-4 rounded-2xl border text-center transition-all group opacity-50 cursor-not-allowed ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white hover:bg-indigo-50 border-gray-200'}`}>
                          <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Export to</p>
                          <p className={`text-xl font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-900'}`}>XSLT</p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeApp === 'yaml-editor' ? (
          <div className="flex-1 flex overflow-hidden">
            <div className={`w-1/2 border-r ${isDarkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'} flex flex-col`}>
              <div className={`flex items-center justify-between px-6 py-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-b`}>
                <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>YAML Input</span>
              </div>
              <textarea
                value={yamlInput}
                onChange={(e) => setYamlInput(e.target.value)}
                className={`flex-1 p-8 code-font text-sm resize-none focus:outline-none ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
                spellCheck={false}
              />
            </div>
            <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <span className={`text-xs font-bold uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Controls</span>
                <div className="flex gap-4">
                  <button onClick={async () => {
                    setIsLoading(true);
                    try {
                      const result = await convertFormat(yamlInput, 'yaml' as any);
                      setYamlInput(result);
                    } catch (e) { alert('Formatting failed'); }
                    finally { setIsLoading(false); }
                  }} className={`text-xs font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Format (AI)</button>
                  <button onClick={async () => {
                    setIsLoading(true);
                    try {
                      const result = await convertFormat(yamlInput, 'json');
                      setJsonInputManual(result);
                      setActiveApp('json-studio');
                    } catch (e) { alert('Conversion failed'); }
                    finally { setIsLoading(false); }
                  }} className={`text-xs font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>To JSON</button>
                </div>
              </div>
              <div className="flex-1 p-8">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Processing YAML...</p>
                  </div>
                ) : (
                  <div className="max-w-md">
                    <h4 className="text-lg font-bold mb-2">YAML Tools</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Use Gemini AI to format your YAML or convert it to JSON for further inspection. Schema validation coming soon.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeApp === 'jwt-decoder' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-12 max-w-6xl mx-auto w-full">
            <h2 className="text-4xl font-black mb-8 tracking-tight">JWT Decoder</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1 overflow-hidden">
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Encoded Token</p>
                  {jwtError && <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Invalid Token</span>}
                </div>
                <textarea
                  value={jwtInput}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setJwtInput(val);
                    try {
                      if (!val) { setJwtHeader(null); setJwtPayload(null); setJwtError(null); return; }
                      const parts = val.split('.');
                      if (parts.length !== 3) throw new Error('Invalid JWT format');
                      setJwtHeader(JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))));
                      setJwtPayload(JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));
                      setJwtError(null);
                    } catch (e: any) {
                      setJwtError(e.message);
                      setJwtHeader(null);
                      setJwtPayload(null);
                    }
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className={`flex-1 p-6 rounded-[2rem] border code-font text-sm focus:outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  spellCheck={false}
                />
              </div>
              <div className="grid grid-rows-2 gap-8 flex-1 overflow-hidden h-full">
                <div className="flex flex-col overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Header</p>
                  <pre className={`flex-1 p-8 rounded-[2rem] border overflow-auto code-font text-xs scrollbar-hide ${isDarkMode ? 'bg-purple-900/10 border-purple-900/30 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-700'}`}>
                    {jwtHeader ? JSON.stringify(jwtHeader, null, 2) : '// Header will appear here'}
                  </pre>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Payload</p>
                  <pre className={`flex-1 p-8 rounded-[2rem] border overflow-auto code-font text-xs scrollbar-hide ${isDarkMode ? 'bg-indigo-900/10 border-indigo-900/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                    {jwtPayload ? JSON.stringify(jwtPayload, null, 2) : '// Payload will appear here'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ) : activeApp === 'base64-tool' ? (
          <div className="flex-1 flex flex-col p-12 max-w-4xl mx-auto w-full">
            <h2 className="text-4xl font-black mb-12 tracking-tight">Base64 Tool</h2>
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setBase64Mode('encode')}
                className={`px-8 py-3 rounded-2xl text-xs font-black tracking-widest transition-all ${base64Mode === 'encode' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >ENCODE</button>
              <button
                onClick={() => setBase64Mode('decode')}
                className={`px-8 py-3 rounded-2xl text-xs font-black tracking-widest transition-all ${base64Mode === 'decode' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >DECODE</button>
            </div>
            <div className="grid grid-cols-1 gap-12">
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Input Data</p>
                <textarea
                  value={base64Input}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBase64Input(val);
                    try {
                      if (!val) { setBase64Output(''); return; }
                      if (base64Mode === 'encode') setBase64Output(btoa(val));
                      else setBase64Output(atob(val.replace(/-/g, '+').replace(/_/g, '/')));
                    } catch (e) { setBase64Output('Invalid input for ' + base64Mode + ' mode.'); }
                  }}
                  placeholder={base64Mode === 'encode' ? "Enter text to encode..." : "Enter Base64 to decode..."}
                  className={`h-48 p-8 rounded-[2.5rem] border code-font text-sm focus:outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Result</p>
                <div className={`h-48 p-8 rounded-[2.5rem] border code-font text-sm overflow-auto break-all scrollbar-hide ${isDarkMode ? 'bg-indigo-900/10 border-indigo-900/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                  {base64Output || <span className="opacity-30 italic">Output will appear here...</span>}
                </div>
              </div>
            </div>
          </div>
        ) : activeApp === 'diff-tool' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-2 overflow-hidden">
              <div className="flex flex-col border-r h-full overflow-hidden">
                <div className={`px-6 py-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Original Text</span>
                </div>
                <textarea
                  value={diffLeft}
                  onChange={(e) => setDiffLeft(e.target.value)}
                  placeholder="Paste original text here..."
                  className={`flex-1 p-8 code-font text-sm resize-none focus:outline-none scrollbar-hide ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col h-full overflow-hidden">
                <div className={`px-6 py-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Modified Text</span>
                </div>
                <textarea
                  value={diffRight}
                  onChange={(e) => setDiffRight(e.target.value)}
                  placeholder="Paste modified text here..."
                  className={`flex-1 p-8 code-font text-sm resize-none focus:outline-none scrollbar-hide ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className={`h-1/3 border-t overflow-auto p-8 code-font text-xs scrollbar-hide ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Line-by-Line Difference</p>
              <div className="space-y-1">
                {diffLeft.split('\n').map((line, i) => {
                  const linesR = diffRight.split('\n');
                  const other = linesR[i];
                  const isSame = line === other;
                  const isExtra = i >= linesR.length;

                  return (
                    <div key={i} className={`flex items-start rounded-lg transition-colors ${isSame ? 'opacity-50' : isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50'}`}>
                      <span className="w-12 shrink-0 py-1 text-[10px] font-bold opacity-30 text-right pr-6 select-none">{i + 1}</span>
                      <div className="flex-1 py-1">
                        {isSame ? (
                          <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>{line}</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black px-1.5 rounded bg-rose-500 text-white">-</span>
                              <span className="text-rose-500 line-through opacity-50">{line}</span>
                            </div>
                            {!isExtra && (
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black px-1.5 rounded bg-green-500 text-white">+</span>
                                <span className="text-green-500">{other}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {diffRight.split('\n').slice(diffLeft.split('\n').length).map((line, i) => {
                  const actualIndex = diffLeft.split('\n').length + i;
                  return (
                    <div key={actualIndex} className={`flex items-start rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                      <span className="w-12 shrink-0 py-1 text-[10px] font-bold opacity-30 text-right pr-6 select-none">{actualIndex + 1}</span>
                      <div className="flex-1 py-1 flex items-center gap-2">
                        <span className="text-[8px] font-black px-1.5 rounded bg-green-500 text-white">+</span>
                        <span className="text-green-500">{line}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeApp === 'hub' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-full mb-4"></div>
              <p className="text-sm font-bold text-indigo-600">Redirecting to Hub...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-xl font-bold">This application is under development.</p>
          </div>
        )}
      </main>

      {/* Global Status Footer */}
      <footer className={`px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-tight border-t ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-500' : 'bg-white border-gray-100 text-gray-400'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>CLOUD READY</span>
          </div>
          <span className={`${isDarkMode ? 'opacity-20' : 'opacity-30'}`}>|</span>
          <span>AZELA STUDIO v1.2.0</span>
        </div>
        <div>
          <span>&copy; 2026 Azela Studio &middot; ALL RIGHTS RESERVED</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
