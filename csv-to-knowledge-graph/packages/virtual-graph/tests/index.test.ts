import {
  Graph,
  GraphChanges,
  mergeGraphChanges,
  validateGraph,
  getGraphStats,
  findShortestPath,
} from "../src/index";

describe("Virtual Graph Package", () => {
  const sampleGraph: Graph = {
    nodes: [
      { id: "node1", label: "Node 1", type: "Type1" },
      { id: "node2", label: "Node 2", type: "Type2" },
      { id: "node3", label: "Node 3", type: "Type1" },
    ],
    edges: [
      { source: "node1", target: "node2", label: "connects_to" },
      { source: "node2", target: "node3", label: "leads_to" },
    ],
  };

  describe("validateGraph", () => {
    it("should validate a well-formed graph", () => {
      expect(validateGraph(sampleGraph)).toBe(true);
    });

    it("should invalidate a graph with invalid edges", () => {
      const invalidGraph: Graph = {
        nodes: [{ id: "node1", label: "Node 1", type: "Type1" }],
        edges: [{ source: "node1", target: "nonexistent", label: "invalid" }],
      };
      expect(validateGraph(invalidGraph)).toBe(false);
    });
  });

  describe("mergeGraphChanges", () => {
    it("should add new nodes", () => {
      const changes: GraphChanges = {
        additions: {
          nodes: [{ id: "node4", label: "Node 4", type: "Type2" }],
        },
      };
      const result = mergeGraphChanges(sampleGraph, changes);
      expect(result.nodes.length).toBe(4);
      expect(result.nodes[3].id).toBe("node4");
    });

    it("should delete nodes and their connected edges", () => {
      const changes: GraphChanges = {
        deletions: {
          nodes: ["node2"],
        },
      };
      const result = mergeGraphChanges(sampleGraph, changes);
      expect(result.nodes.length).toBe(2);
      expect(result.edges.length).toBe(0); // Both edges connected to node2 should be deleted
    });

    it("should modify node properties", () => {
      const changes: GraphChanges = {
        modifications: {
          nodes: [
            {
              id: "node1",
              modifications: {
                label: "Updated Node 1",
                properties: { newProp: "value" },
              },
            },
          ],
        },
      };
      const result = mergeGraphChanges(sampleGraph, changes);
      const updatedNode = result.nodes.find((n) => n.id === "node1");
      expect(updatedNode?.label).toBe("Updated Node 1");
      expect(updatedNode?.properties?.newProp).toBe("value");
    });
  });

  describe("getGraphStats", () => {
    it("should calculate graph statistics correctly", () => {
      const stats = getGraphStats(sampleGraph);
      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.nodeTypes["Type1"]).toBe(2);
      expect(stats.nodeTypes["Type2"]).toBe(1);
      expect(stats.avgConnections).toBeCloseTo(1.33, 2);
    });
  });

  describe("findShortestPath", () => {
    it("should find a path between connected nodes", () => {
      const path = findShortestPath(sampleGraph, "node1", "node3");
      expect(path).not.toBeNull();
      expect(path?.length).toBe(3);
      expect(path?.[0].id).toBe("node1");
      expect(path?.[2].id).toBe("node3");
    });

    it("should return null for disconnected nodes", () => {
      const disconnectedGraph: Graph = {
        nodes: [
          { id: "node1", label: "Node 1", type: "Type1" },
          { id: "node2", label: "Node 2", type: "Type2" },
        ],
        edges: [],
      };
      const path = findShortestPath(disconnectedGraph, "node1", "node2");
      expect(path).toBeNull();
    });
  });
});
