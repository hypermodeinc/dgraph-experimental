import { Node, Edge, GraphData } from "./types";

export function parseGraphData(data: GraphData): {
  nodes: Node[];
  edges: Edge[];
} {
  return {
    nodes: data.nodes.map((node) => ({ ...node, type: node.type ?? "" })),
    edges: data.edges.map((edge) => ({
      ...edge,
      label: edge.label ?? "",
      type: edge.type ?? "",
    })),
  };
}

export function validateGraph(graph: GraphData): boolean {
  if (!graph.nodes || !Array.isArray(graph.nodes)) return false;
  if (!graph.edges || !Array.isArray(graph.edges)) return false;

  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return false;
    }
  }

  return true;
}

export function getConnectedNodes(
  graph: GraphData,
  nodeId: string,
): {
  inbound: Node[];
  outbound: Node[];
} {
  const inbound: Node[] = [];
  const outbound: Node[] = [];

  graph.edges.forEach((edge) => {
    if (edge.source === nodeId) {
      const targetNode = graph.nodes.find((n) => n.id === edge.target);
      if (targetNode) outbound.push(targetNode);
    }
    if (edge.target === nodeId) {
      const sourceNode = graph.nodes.find((n) => n.id === edge.source);
      if (sourceNode) inbound.push(sourceNode);
    }
  });

  return { inbound, outbound };
}

export function getGraphStats(graph: GraphData) {
  const nodeTypes = graph.nodes.reduce(
    (acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalConnections = graph.edges.length * 2;
  const avgConnections =
    graph.nodes.length > 0 ? totalConnections / graph.nodes.length : 0;

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    nodeTypes,
    avgConnections,
  };
}

export function findShortestPath(
  graph: GraphData,
  sourceId: string,
  targetId: string,
): Node[] | null {
  const visited = new Set<string>();
  const queue: { nodeId: string; path: Node[] }[] = [];

  const sourceNode = graph.nodes.find((n) => n.id === sourceId);
  if (!sourceNode) return null;

  queue.push({ nodeId: sourceId, path: [sourceNode] });
  visited.add(sourceId);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === targetId) {
      return path;
    }

    const connected = getConnectedNodes(graph, nodeId);
    const allConnected = [...connected.inbound, ...connected.outbound];

    for (const neighbor of allConnected) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push({ nodeId: neighbor.id, path: [...path, neighbor] });
      }
    }
  }

  return null;
}

export function calculateNodePositions(
  graphData: GraphData,
  containerWidth: number,
  containerHeight: number,
): Node[] {
  const { nodes } = parseGraphData(graphData);

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    const radius = Math.min(containerWidth, containerHeight) * 0.3;

    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}
