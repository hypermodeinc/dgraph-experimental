export interface Node {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
  level?: number;
  x?: number;
  y?: number;
}

export interface Edge {
  source: string;
  target: string;
  label: string;
  type?: string;
  properties?: Record<string, string>;
  direction?: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface EdgeIdentifier {
  source: string;
  target: string;
  label: string;
}

export interface NodeModification {
  id: string;
  modifications: {
    label?: string;
    properties?: Record<string, string>;
  };
}

export interface PropertyAddition {
  nodeId: string;
  property: string;
  type: string;
}

export interface PropertyDeletion {
  nodeId: string;
  property: string;
}

export interface GraphChanges {
  additions?: {
    nodes?: Node[] | null;
    edges?: Edge[] | null;
    properties?: PropertyAddition[] | null;
  } | null;
  deletions?: {
    nodes?: string[] | null;
    edges?: EdgeIdentifier[] | null;
    properties?: PropertyDeletion[] | null;
  } | null;
  modifications?: {
    nodes?: NodeModification[] | null;
  } | null;
}
