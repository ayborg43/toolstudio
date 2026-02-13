
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const INITIAL_MAX_NODES = 250;
const INITIAL_MAX_CHILDREN = 20;
const INITIAL_MAX_DEPTH = 8;
const ABSOLUTE_MAX_NODES = 2000; // Hard cap to prevent browser hanging

export const Visualizer: React.FC<{ data: any }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [limits, setLimits] = useState({
    nodes: INITIAL_MAX_NODES,
    children: INITIAL_MAX_CHILDREN,
    depth: INITIAL_MAX_DEPTH
  });

  // Reset limits when data changes significantly
  useEffect(() => {
    setLimits({
      nodes: INITIAL_MAX_NODES,
      children: INITIAL_MAX_CHILDREN,
      depth: INITIAL_MAX_DEPTH
    });
  }, [data]);

  const handleShowMore = () => {
    setLimits(prev => ({
      nodes: Math.min(prev.nodes + 250, ABSOLUTE_MAX_NODES),
      children: prev.children + 20,
      depth: prev.depth + 4
    }));
  };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    let nodeCount = 0;
    let truncated = false;

    // Helper to transform raw JSON into a D3-friendly hierarchy with safety limits
    const transformData = (d: any, name: string = 'root', depth: number = 0): any => {
      nodeCount++;
      
      if (nodeCount > limits.nodes || depth > limits.depth) {
        truncated = true;
        return null;
      }

      const result: any = { name };

      if (d && typeof d === 'object' && d !== null) {
        const isArr = Array.isArray(d);
        const entries = isArr ? d.map((v, i) => [`[${i}]`, v]) : Object.entries(d);
        
        if (entries.length > 0) {
          const children = [];
          const limit = Math.min(entries.length, limits.children);
          
          for (let i = 0; i < limit; i++) {
            const child = transformData(entries[i][1], entries[i][0], depth + 1);
            if (child) children.push(child);
          }

          if (entries.length > limits.children) {
            truncated = true;
            children.push({ name: `... (${entries.length - limits.children} more items)`, isSummary: true });
          }
          
          if (children.length > 0) result.children = children;
        }
      } else {
        result.value = String(d);
      }

      return result;
    };

    const safeData = transformData(data);
    setIsTruncated(truncated);

    // Clear previous
    const svgSelection = d3.select(svgRef.current);
    svgSelection.selectAll("*").remove();

    if (!safeData) return;

    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = Math.max(containerWidth, 800);
    // Adjust height based on actual node count to ensure readability
    const height = Math.max(600, nodeCount * 22); 

    const svg = svgSelection
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(120,40)");

    const hierarchy = d3.hierarchy(safeData);
    // Tree layout sizing: [height, width]
    const treeLayout = d3.tree().size([height - 80, width - 400]);
    const root = treeLayout(hierarchy);

    // Links
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any
      )
      .attr("fill", "none")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1.5);

    // Nodes
    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    nodes.append("circle")
      .attr("r", d => (d.data as any).isSummary ? 4 : 5)
      .attr("fill", d => {
        if ((d.data as any).isSummary) return "#fbbf24";
        return d.children ? "#6366f1" : "#94a3b8";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    nodes.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -14 : 14)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text((d: any) => {
        const val = d.data.value !== undefined ? `: ${d.data.value}` : '';
        const label = d.data.name + val;
        // Truncate long strings for visual clarity
        return label.length > 40 ? label.substring(0, 37) + '...' : label;
      })
      .attr("fill", d => (d.data as any).isSummary ? "#92400e" : "#334155")
      .style("font-size", "11px")
      .style("font-weight", d => d.children ? "600" : "400")
      .style("font-family", "Inter")
      .style("pointer-events", "none");

  }, [data, limits]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {isTruncated && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800">Visual Budget Reached</p>
              <p className="text-[11px] text-amber-700/80">Showing a simplified view to protect browser performance.</p>
            </div>
          </div>
          {limits.nodes < ABSOLUTE_MAX_NODES && (
            <button 
              onClick={handleShowMore}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-md shadow-amber-600/20 flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Show More Nodes
            </button>
          )}
        </div>
      )}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-auto shadow-inner relative group">
        <svg ref={svgRef} className="min-w-full"></svg>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-medium text-gray-400">
          Scroll to explore
        </div>
      </div>
    </div>
  );
};
