"use client";

import React, { useEffect, useRef } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

// Dynamically import Sigma with SSR disabled
//  tells Next.js not to render this component during server-side rendering.
//import dynamic from "next/dynamic"; 
//const Sigma = dynamic(() => import("sigma"), { ssr: false });

interface GraphViewProps {
  data: any | null;
}
export default function GraphView({ data }: GraphViewProps) {
    const elements = [
    { data: { id: 'one', label: 'Node 1' }, position: { x: 50, y: 50 } },
    { data: { id: 'two', label: 'Node 2' }, position: { x: 100, y: 75 } },
    { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } }
 ];
 
  const containerRef = useRef<HTMLDivElement>(null); // Reference to Sigma container

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a graph
    s = new Sigma(
      {
         renderer: {
           container: document.getElementById('sigma-container'),
           type: 'canvas'
         },
         settings: {}
       }
     );
    const graph = new Graph(options: { });

    // Add nodes
    graph.addNode("1", { label: "Node 1", x: 0, y: 0, size: 10, color: "red" });
    graph.addNode("2", { label: "Node 2", x: 1, y: 0, size: 10, color: "blue" });
    graph.addNode("3", { label: "Node 3", x: -1, y: 0, size: 10, color: "green" });

    // Add edges
    graph.addEdge("1", "2");
    graph.addEdge("2", "3");
    graph.addEdge("3", "1");

    // Enable node dragging
    graph.nodes().forEach(node => {
      node.settings('nodeSettings.draggable', true);
    });

    // Apply ForceAtlas2 layout for better positioning
    forceAtlas2.assign(graph, { iterations: 100 });

    // Initialize Sigma.js and mount it to the container
    const renderer = new Sigma(graph, containerRef.current);

    return () => {
      renderer.kill(); // Cleanup on unmount
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Graph Visualization</h2>
      <div ref={containerRef} className="border rounded-md shadow-md h-[500px]" />
    </div>
  );
}