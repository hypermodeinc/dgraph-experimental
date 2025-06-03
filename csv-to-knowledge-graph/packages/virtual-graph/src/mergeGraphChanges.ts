import { Graph, GraphChanges } from "./types";

export function mergeGraphChanges(
  currentGraph: Graph,
  changes: GraphChanges,
): Graph {
  if (!currentGraph) return currentGraph;
  if (!changes) return currentGraph;

  const newGraph: Graph = {
    nodes: [...currentGraph.nodes],
    edges: [...currentGraph.edges],
  };

  if (changes.additions) {
    if (
      changes.additions.nodes &&
      Array.isArray(changes.additions.nodes) &&
      changes.additions.nodes.length > 0
    ) {
      newGraph.nodes = [...newGraph.nodes, ...changes.additions.nodes];
    }

    if (
      changes.additions.edges &&
      Array.isArray(changes.additions.edges) &&
      changes.additions.edges.length > 0
    ) {
      newGraph.edges = [...newGraph.edges, ...changes.additions.edges];
    }

    if (
      changes.additions.properties &&
      Array.isArray(changes.additions.properties) &&
      changes.additions.properties.length > 0
    ) {
      newGraph.nodes = newGraph.nodes.map((node) => {
        const propertyAdditions = changes.additions?.properties?.filter(
          (p) => p.nodeId === node.id,
        );

        if (propertyAdditions && propertyAdditions.length > 0) {
          const updatedProperties = { ...(node.properties || {}) };

          propertyAdditions.forEach((addition) => {
            updatedProperties[addition.property] = addition.type;
          });

          return {
            ...node,
            properties: updatedProperties,
          };
        }

        return node;
      });
    }
  }

  if (changes.deletions) {
    if (
      changes.deletions.nodes &&
      Array.isArray(changes.deletions.nodes) &&
      changes.deletions.nodes.length > 0
    ) {
      const nodesToDelete = new Set(changes.deletions.nodes);
      newGraph.nodes = newGraph.nodes.filter(
        (node) => !nodesToDelete.has(node.id),
      );
      newGraph.edges = newGraph.edges.filter(
        (edge) =>
          !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target),
      );
    }

    if (
      changes.deletions.edges &&
      Array.isArray(changes.deletions.edges) &&
      changes.deletions.edges.length > 0
    ) {
      newGraph.edges = newGraph.edges.filter((edge) => {
        return !changes.deletions?.edges?.some(
          (identifier) =>
            identifier.source === edge.source &&
            identifier.target === edge.target &&
            identifier.label === edge.label,
        );
      });
    }

    if (
      changes.deletions.properties &&
      Array.isArray(changes.deletions.properties) &&
      changes.deletions.properties.length > 0
    ) {
      newGraph.nodes = newGraph.nodes.map((node) => {
        const propertyDeletions = changes.deletions?.properties?.filter(
          (p) => p.nodeId === node.id,
        );

        if (
          propertyDeletions &&
          propertyDeletions.length > 0 &&
          node.properties
        ) {
          const updatedProperties = { ...node.properties };

          propertyDeletions.forEach((deletion) => {
            delete updatedProperties[deletion.property];
          });

          return {
            ...node,
            properties: updatedProperties,
          };
        }

        return node;
      });
    }
  }

  if (changes.modifications && changes.modifications.nodes) {
    if (
      Array.isArray(changes.modifications.nodes) &&
      changes.modifications.nodes.length > 0
    ) {
      newGraph.nodes = newGraph.nodes.map((node) => {
        const modification = changes.modifications?.nodes?.find(
          (mod) => mod.id === node.id,
        );
        if (modification && modification.modifications) {
          return {
            ...node,
            ...(modification.modifications.label
              ? { label: modification.modifications.label }
              : {}),
            properties: {
              ...node.properties,
              ...(modification.modifications.properties || {}),
            },
          };
        }
        return node;
      });
    }
  }

  return newGraph;
}
