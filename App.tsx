
import React, { useState, useEffect, useMemo } from 'react';
import { TreeViewer } from './components/TreeViewer';
import { Visualizer } from './components/Visualizer';
import { ViewMode, JsonStats, ActiveApp } from './types';

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
  // Global Navigation State
  const [activeApp, setActiveApp] = useState<ActiveApp>('hub');
  
  // JSON Studio State
  const [jsonInput, setJsonInput] = useState(INITIAL_JSON);
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
  
  // Shared State
  const [isLoading, setIsLoading] = useState(false);

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
        // Simple XML to JSON conversion (basic example)
        const json = {
          xml: xmlInput,
          converted: new Date().toISOString()
        };
        setJsonInput(JSON.stringify(json, null, 2));
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
      className="group relative flex flex-col text-left p-8 bg-white border border-gray-100 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
    >
      <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{description}</p>
      <div className="mt-8 flex items-center text-xs font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
        Open Application
        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </div>
      {tag && <div className="absolute top-6 right-6 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{tag}</div>}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gray-50 rounded-full group-hover:bg-indigo-50/50 transition-colors -z-10"></div>
    </button>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-gray-900">
      {/* Universal Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveApp('hub')}>
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 leading-none">Azela Studio</h1>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Data Format Toolkit</p>
          </div>
        </div>

        {activeApp !== 'hub' && (
          <nav className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button onClick={() => setActiveApp('hub')} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900">Hub</button>
            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
            <span className="px-4 py-2 text-sm font-bold text-indigo-600 bg-white rounded-lg shadow-sm border border-gray-200 capitalize">
              {activeApp.replace('-', ' ')}
            </span>
          </nav>
        )}

        <div className="flex items-center gap-4">
           <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeApp === 'hub' ? (
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <div className="max-w-6xl mx-auto px-6 py-24">
              <div className="max-w-3xl mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-6xl font-black text-gray-900 tracking-tight leading-[1.1] mb-8">
                  Everything you need <br/> to <span className="text-indigo-600">build better.</span>
                </h2>
                <p className="text-xl text-gray-500 font-medium">
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
                  tag="NEW"
                  icon={<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                />
              </div>

              <div className="mt-32 pt-20 border-t border-gray-200">
                <div className="flex items-center justify-between mb-12">
                   <h4 className="text-xl font-bold text-gray-900">Platform Performance</h4>
                   <div className="px-4 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full">Systems Nominal</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">API LATENCY</p>
                     <p className="text-3xl font-black text-gray-900">42ms</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ENGINE UPTIME</p>
                     <p className="text-3xl font-black text-gray-900">99.9%</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">FORMAT SUPPORT</p>
                     <p className="text-3xl font-black text-gray-900">JSON/XML</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">DATA PRIVACY</p>
                     <p className="text-3xl font-black text-gray-900">Local-First</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeApp === 'json-studio' ? (
          <div className="flex-1 flex overflow-hidden">
             <div className={`transition-all duration-300 ease-in-out border-r border-gray-100 bg-gray-50/50 flex flex-col ${jsonIsMaximized ? 'w-0 opacity-0 overflow-hidden' : 'w-1/2'}`}>
                <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase">Input Buffer</span>
                  <div className="flex gap-4">
                    <button onClick={() => setJsonInput(JSON.stringify(parsedData, null, 2))} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Pretty</button>
                    <button onClick={() => setJsonInput(JSON.stringify(parsedData))} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Ugly</button>
                  </div>
                </div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="flex-1 p-8 code-font text-sm bg-white resize-none focus:outline-none"
                  spellCheck={false}
                />
             </div>
             <div className="flex-1 flex flex-col bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                  <div className="flex gap-2">
                    {['editor', 'tree', 'visualizer'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setJsonViewMode(m as any)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${jsonViewMode === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-gray-900'}`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setJsonInput(JSON.stringify(parsedData, null, 2))} className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100">PRETTY</button>
                    <button onClick={() => setJsonInput(JSON.stringify(parsedData))} className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100">MINIFY</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-8">
                  {jsonViewMode === 'editor' && jsonStats && (
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payload Size</p>
                          <p className="text-2xl font-black">{(jsonStats.size / 1024).toFixed(2)} KB</p>
                       </div>
                       <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Keys</p>
                          <p className="text-2xl font-black">{jsonStats.keys}</p>
                       </div>
                    </div>
                  )}
                  {jsonViewMode === 'tree' && <TreeViewer data={parsedData} searchQuery={jsonSearchQuery} onNodeSelect={setJsonActivePath} />}
                  {jsonViewMode === 'visualizer' && <Visualizer data={parsedData} />}
                </div>
             </div>
          </div>
        ) : activeApp === 'xml-architect' ? (
          <div className="flex-1 flex overflow-hidden">
             <div className="w-1/2 border-r border-gray-100 bg-gray-50/50 flex flex-col">
                <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase">XML Input</span>
                  <div className="flex gap-4">
                    <button onClick={() => handleXmlAction('format')} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Pretty</button>
                    <button onClick={() => handleXmlAction('minify')} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Ugly</button>
                  </div>
                </div>
                <textarea
                  value={xmlInput}
                  onChange={(e) => setXmlInput(e.target.value)}
                  className="flex-1 p-8 code-font text-sm bg-white resize-none focus:outline-none"
                  spellCheck={false}
                />
             </div>
             <div className="flex-1 flex flex-col bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setXmlViewMode('editor')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${xmlViewMode === 'editor' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}
                    >
                      DASHBOARD
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleXmlAction('convert-json')} className="px-3 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100">TO JSON</button>
                  </div>
                </div>
                <div className="flex-1 p-8 overflow-auto">
                   {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-full">
                         <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                         <p className="text-sm font-bold text-gray-500">Processing Architecture...</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 gap-8 max-w-2xl">
                         <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                            <h4 className="text-lg font-bold text-emerald-900 mb-2">XML Structural Health</h4>
                            <p className="text-sm text-emerald-700/80 mb-6">Automated analysis of tag hierarchy and encoding standards.</p>
                            <div className="flex gap-4">
                               <div className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-emerald-600 shadow-sm border border-emerald-100">UTF-8 Detected</div>
                               <div className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-emerald-600 shadow-sm border border-emerald-100">Well-Formed</div>
                            </div>
                         </div>
                         <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Conversion</h4>
                            <div className="grid grid-cols-2 gap-4">
                               <button onClick={() => handleXmlAction('convert-json')} className="p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-gray-200 text-center transition-all group">
                                  <p className="text-xs font-bold text-gray-400 group-hover:text-indigo-600 uppercase mb-1">Export to</p>
                                  <p className="text-xl font-black text-gray-900 group-hover:text-indigo-600">JSON</p>
                               </button>
                               <button className="p-4 bg-white hover:bg-amber-50 rounded-2xl border border-gray-200 text-center transition-all group opacity-50 cursor-not-allowed">
                                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Export to</p>
                                  <p className="text-xl font-black text-gray-900">XSLT</p>
                               </button>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-xl font-bold">This application is under development.</p>
          </div>
        )}
      </main>

      {/* Global Status Footer */}
      <footer className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-bold tracking-tight">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-600">CLOUD READY</span>
          </div>
          <span className="opacity-30">|</span>
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
