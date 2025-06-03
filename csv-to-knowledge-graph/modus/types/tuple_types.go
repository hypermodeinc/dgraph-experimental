package types

type TupleGraph struct {
	// Format: [id, label, type]
	Nodes [][]string `json:"nodes"`
	
	// Format: [nodeId, propName, propType]
	NodeProps [][]string `json:"nodeProps"`
	
	// Format: [sourceId, targetId, label, direction?]
	Edges [][]string `json:"edges"`
	
	// Format: [sourceId, targetId, label, propName, propType]
	EdgeProps [][]string `json:"edgeProps"`
}

type TupleGraphChanges struct {
	// Nodes to add: [id, label, type]
	AddNodes [][]string `json:"addNodes"`
	
	// Edges to add: [sourceId, targetId, label]
	AddEdges [][]string `json:"addEdges"`
	
	// Node properties to add: [nodeId, propName, propType]
	AddNodeProps [][]string `json:"addNodeProps"`
	
	// Edge properties to add: [sourceId, targetId, label, propName, propType]
	AddEdgeProps [][]string `json:"addEdgeProps"`
	
	// Nodes to delete: [nodeId]
	DeleteNodes []string `json:"deleteNodes"`
	
	// Edges to delete: [sourceId, targetId, label]
	DeleteEdges [][]string `json:"deleteEdges"`
	
	// Node properties to delete: [nodeId, propName]
	DeleteNodeProps [][]string `json:"deleteNodeProps"`
	
	// Node modifications: [nodeId, field, newValue]
	// where field can be "label" or "type"
	ModifyNodes [][]string `json:"modifyNodes"`
}