import { Node, Edge, Graph } from "./types";

const isNodeConnected = (nodeId: string, edges: Edge[]): boolean => {
  return edges.some((edge) => edge.source === nodeId || edge.target === nodeId);
};

export function assignNodeLevels(nodes: Node[], edges: Edge[]): Node[] {
  const connectionCounts = new Map<string, number>();

  edges.forEach((edge) => {
    connectionCounts.set(
      edge.source,
      (connectionCounts.get(edge.source) || 0) + 1,
    );
    connectionCounts.set(
      edge.target,
      (connectionCounts.get(edge.target) || 0) + 1,
    );
  });

  const sortedNodes = [...connectionCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  let rootNodeId =
    sortedNodes.length > 0
      ? sortedNodes[0][0]
      : nodes.length > 0
        ? nodes[0].id
        : "";

  const centralNode = nodes.find((node) =>
    [
      "customer",
      "company",
      "movie",
      "hotel",
      "patient",
      "product",
      "person",
    ].includes(node.label.toLowerCase()),
  );
  if (centralNode) {
    rootNodeId = centralNode.id;
  }

  const nodeLevels = new Map<string, number>();
  nodeLevels.set(rootNodeId, 0);

  edges.forEach((edge) => {
    if (edge.source === rootNodeId && !nodeLevels.has(edge.target)) {
      nodeLevels.set(edge.target, 1);
    } else if (edge.target === rootNodeId && !nodeLevels.has(edge.source)) {
      nodeLevels.set(edge.source, -1);
    }
  });

  let changed = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 10;

  while (changed && iterationCount < MAX_ITERATIONS) {
    changed = false;
    iterationCount++;

    edges.forEach((edge) => {
      if (nodeLevels.has(edge.source) && !nodeLevels.has(edge.target)) {
        const sourceLevel = nodeLevels.get(edge.source) || 0;
        if (sourceLevel < 0) {
          nodeLevels.set(edge.target, sourceLevel - 1);
        } else {
          nodeLevels.set(edge.target, sourceLevel + 1);
        }
        changed = true;
      } else if (nodeLevels.has(edge.target) && !nodeLevels.has(edge.source)) {
        const targetLevel = nodeLevels.get(edge.target) || 0;
        if (targetLevel < 0) {
          nodeLevels.set(edge.source, targetLevel - 1);
        } else {
          nodeLevels.set(edge.source, targetLevel - 1);
        }
        changed = true;
      } else if (nodeLevels.has(edge.source) && nodeLevels.has(edge.target)) {
        const sourceLevel = nodeLevels.get(edge.source) || 0;
        const targetLevel = nodeLevels.get(edge.target) || 0;

        if (sourceLevel === targetLevel) {
          nodeLevels.set(edge.target, targetLevel + 1);
          changed = true;
        }
      }
    });
  }

  let maxLevelRight = 0;
  let maxLevelLeft = 0;

  for (const level of nodeLevels.values()) {
    if (level > maxLevelRight) maxLevelRight = level;
    if (level < maxLevelLeft) maxLevelLeft = Math.abs(level);
  }

  let rightAssignment = true;

  nodes.forEach((node) => {
    if (!nodeLevels.has(node.id)) {
      if (rightAssignment) {
        nodeLevels.set(node.id, maxLevelRight + 1);
      } else {
        nodeLevels.set(node.id, -(maxLevelLeft + 1));
      }
      rightAssignment = !rightAssignment;
    }
  });

  let nodesOnRight = 0;
  let nodesOnLeft = 0;

  for (const level of nodeLevels.values()) {
    if (level > 0) nodesOnRight++;
    else if (level < 0) nodesOnLeft++;
  }

  const unbalanceFactor = 2;
  if (nodesOnRight > unbalanceFactor * nodesOnLeft) {
    for (const [nodeId, level] of nodeLevels.entries()) {
      if (level > 0 && !isNodeConnected(nodeId, edges)) {
        nodeLevels.set(nodeId, -1);
        nodesOnRight--;
        nodesOnLeft++;
        if (nodesOnRight <= unbalanceFactor * nodesOnLeft) break;
      }
    }
  } else if (nodesOnLeft > unbalanceFactor * nodesOnRight) {
    for (const [nodeId, level] of nodeLevels.entries()) {
      if (level < 0 && !isNodeConnected(nodeId, edges)) {
        nodeLevels.set(nodeId, 1);
        nodesOnLeft--;
        nodesOnRight++;
        if (nodesOnLeft <= unbalanceFactor * nodesOnRight) break;
      }
    }
  }

  return nodes.map((node) => ({
    ...node,
    level: nodeLevels.get(node.id) || 0,
  }));
}

export function createHierarchy(graph: Graph): Graph {
  const nodesWithLevels = assignNodeLevels(graph.nodes, graph.edges);
  return {
    ...graph,
    nodes: nodesWithLevels,
  };
}
