import React, { useEffect, useRef, useState, useCallback } from "react";
import { Network, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { KnowledgeGraphProps } from "./types";
import { calculateEdgeLabelPositions, calculateEdgePoints } from "./utils";
import {
  GraphData,
  calculateNodePositions,
} from "@hypermode/csvkit-virtual-graph";

export default function KnowledgeGraph({
  graphData,
  width = "100%",
  height = "100%",
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: typeof width === "number" ? width : 800,
    height: typeof height === "number" ? height : 600,
  });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [isNodeDragging, setIsNodeDragging] = useState(false);

  useEffect(() => {
    if (!graphData) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      let parsedData: GraphData;

      if (typeof graphData === "string") {
        parsedData = JSON.parse(graphData);
      } else {
        parsedData = graphData as GraphData;
      }

      setData(parsedData);
      setError(null);
    } catch (err) {
      setError("Failed to parse graph data " + (err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [graphData]);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      if (offsetWidth > 0 && offsetHeight > 0) {
        setDimensions({
          width: offsetWidth,
          height: offsetHeight,
        });
      }
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    if (containerRef.current && "ResizeObserver" in window) {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateDimensions);
      };
    }

    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      try {
        const nodesWithPositions = calculateNodePositions(
          data,
          dimensions.width,
          dimensions.height,
        );

        const posMap: Record<string, { x: number; y: number }> = {};
        nodesWithPositions.forEach((node) => {
          const x =
            typeof node.x === "number" && !isNaN(node.x)
              ? node.x
              : dimensions.width / 2;
          const y =
            typeof node.y === "number" && !isNaN(node.y)
              ? node.y
              : dimensions.height / 2;

          posMap[node.id] = { x, y };
        });

        // Make sure all nodes have positions even if calculations failed
        data.nodes.forEach((node) => {
          if (!posMap[node.id]) {
            // Assign a default position for any node without coordinates
            posMap[node.id] = {
              x:
                Math.random() * dimensions.width * 0.8 + dimensions.width * 0.1,
              y:
                Math.random() * dimensions.height * 0.8 +
                dimensions.height * 0.1,
            };
          }
        });

        setNodePositions(posMap);

        // Reset transform to center when graph data changes
        setTransform({ x: 0, y: 0, scale: 1 });
      } catch (error) {
        console.error("Error initializing node positions:", error);
        // Create fallback positions in case of error
        const fallbackPositions: Record<string, { x: number; y: number }> = {};
        data.nodes.forEach((node, index) => {
          const angle = (index / data.nodes.length) * 2 * Math.PI;
          const radius = Math.min(dimensions.width, dimensions.height) * 0.3;
          fallbackPositions[node.id] = {
            x: dimensions.width / 2 + radius * Math.cos(angle),
            y: dimensions.height / 2 + radius * Math.sin(angle),
          };
        });
        setNodePositions(fallbackPositions);
      }
    }
  }, [data, dimensions.width, dimensions.height]);

  // Zoom controls
  const zoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: prev.scale * 1.2,
    }));
  };

  const zoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2),
    }));
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });

    // Reset any custom node positions
    if (data && data.nodes) {
      const nodesWithPositions = calculateNodePositions(
        data,
        dimensions.width,
        dimensions.height,
      );

      const posMap: Record<string, { x: number; y: number }> = {};
      nodesWithPositions.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          posMap[node.id] = { x: node.x, y: node.y };
        }
      });

      setNodePositions(posMap);
    }
  };

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only start dragging if we're not clicking on a node
    if ((e.target as SVGElement).classList.contains("node-circle")) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedNode && isNodeDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      // Update node position accounting for current transform
      setNodePositions((prev) => ({
        ...prev,
        [draggedNode]: {
          x: (prev[draggedNode]?.x || 0) + dx / transform.scale,
          y: (prev[draggedNode]?.y || 0) + dy / transform.scale,
        },
      }));

      // Update drag start for next move
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Otherwise handle canvas dragging
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setTransform((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    // Handle node dragging end
    if (draggedNode && isNodeDragging) {
      setIsNodeDragging(false);
      setDraggedNode(null);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);

    // Also end node dragging if mouse leaves
    if (isNodeDragging) {
      setIsNodeDragging(false);
      setDraggedNode(null);
    }
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.1, prev.scale * zoomFactor),
    }));
  };

  // Handle node drag start
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    setIsNodeDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Create the visual representation of the graph
  const renderGraph = () => {
    if (!data || !data.nodes || !data.edges || data.nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Network className="w-16 h-16 text-gray-600 mb-4" />
          <p className="text-gray-500">No graph data available</p>
        </div>
      );
    }

    // Use our stored node positions or calculate them if not available
    const nodesWithPositions = data.nodes.map((node) => {
      const position = nodePositions[node.id];
      // Ensure we have valid coordinates
      const safeX =
        position?.x !== undefined && !isNaN(position.x)
          ? position.x
          : dimensions.width / 2;
      const safeY =
        position?.y !== undefined && !isNaN(position.y)
          ? position.y
          : dimensions.height / 2;

      return {
        ...node,
        x: safeX,
        y: safeY,
      };
    });

    // Create a map for quick lookup of node positions
    const nodePositionsMap: Record<string, { x: number; y: number }> = {};
    nodesWithPositions.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) {
        nodePositionsMap[node.id] = { x: node.x, y: node.y };
      }
    });

    const transformString = `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`;

    // Configure node appearance
    const nodeSize = 35;
    const nodeColors = {
      default: "#9333ea", // Purple 600
    };

    // Calculate edge labels with better positioning
    const edgeLabelPositions = calculateEdgeLabelPositions(
      data.edges,
      nodePositionsMap,
    );

    return (
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`bg-[#1c1c1c] rounded-lg overflow-hidden ${isDragging || isNodeDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
            fill="#718096"
          >
            <polygon points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>
        <g transform={transformString}>
          {/* Draw edges */}
          <g className="edges">
            {data.edges.map((edge, index) => {
              const sourcePos = nodePositionsMap[edge.source];
              const targetPos = nodePositionsMap[edge.target];

              if (!sourcePos || !targetPos) {
                return null;
              }

              // Get the adjusted label position
              const labelKey = `${edge.source}-${edge.target}-${edge.label}`;
              const labelPos = edgeLabelPositions.get(labelKey) || {
                // Offset the midpoint slightly perpendicular to the edge
                x: (sourcePos.x + targetPos.x) / 2 + (Math.random() * 20 - 10),
                y: (sourcePos.y + targetPos.y) / 2 + (Math.random() * 20 - 10),
                angle: 0,
              };

              // Calculate edge points with proper distance from nodes
              const { startX, startY, endX, endY } = calculateEdgePoints(
                sourcePos,
                targetPos,
                nodeSize,
              );

              // Check for NaN values before rendering the line
              if (
                isNaN(startX) ||
                isNaN(startY) ||
                isNaN(endX) ||
                isNaN(endY)
              ) {
                console.warn("Invalid edge coordinates", {
                  sourcePos,
                  targetPos,
                  edge,
                });
                return null;
              }

              return (
                <g key={`edge-${index}`} className="edge">
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="#718096"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                    markerEnd="url(#arrowhead)"
                  />

                  <rect
                    x={labelPos.x - 60}
                    y={labelPos.y - 12}
                    width={120}
                    height={24}
                    rx={12}
                    fill="#222"
                    stroke="#333"
                    strokeWidth={1}
                    fillOpacity={0.95}
                    className="edge-label-bg"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#aaa"
                    className="edge-label"
                    pointerEvents="none"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Draw nodes */}
          <g className="nodes">
            {nodesWithPositions.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;

              const nodeColor = nodeColors.default;

              // Add dragging visual feedback
              const isDraggingThisNode =
                draggedNode === node.id && isNodeDragging;
              const nodeOpacity = isDraggingThisNode ? 0.7 : 1;

              return (
                <g
                  key={node.id}
                  className="node"
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  style={{
                    cursor: isDraggingThisNode ? "grabbing" : "grab",
                    opacity: nodeOpacity,
                  }}
                >
                  {/* Node circle */}
                  <circle
                    r={nodeSize}
                    fill={nodeColor}
                    stroke="#222"
                    strokeWidth={2.5}
                    className="node-circle"
                  />

                  {/* Node label background */}
                  <rect
                    x={-70}
                    y={-nodeSize - 35}
                    width={140}
                    height={28}
                    rx={14}
                    fill="#222"
                    stroke="#333"
                    strokeWidth={1}
                    fillOpacity={0.95}
                    className="node-label-bg"
                  />

                  {/* Node label text */}
                  <text
                    textAnchor="middle"
                    y={-nodeSize - 18}
                    fontSize="13"
                    fontWeight="bold"
                    fill="#fff"
                    className="node-label"
                    pointerEvents="none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    );
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full text-white"
        style={{ minHeight: "600px" }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-gray-400">Loading graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full text-red-400"
        style={{ minHeight: "600px" }}
      >
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="knowledge-graph-container relative w-full h-full"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "600px",
        flex: "1 1 auto",
      }}
    >
      {renderGraph()}

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="p-2 bg-[#222] text-gray-300 rounded-full shadow-md hover:bg-[#333] hover:text-white"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-[#222] text-gray-300 rounded-full shadow-md hover:bg-[#333] hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-[#222] text-gray-300 rounded-full shadow-md hover:bg-[#333] hover:text-white"
          title="Reset View"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
