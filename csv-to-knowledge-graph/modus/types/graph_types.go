package types

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
	CSVHeaders []string `json:"csvHeaders"`
}

type Node struct {
	ID    string                 `json:"id"`
	Label string                 `json:"label"`
	Props map[string]interface{} `json:"properties,omitempty"`
	Type  string                 `json:"type,omitempty"`
}

type Edge struct {
	Source    string                 `json:"source"`
	Target    string                 `json:"target"`
	Label     string                 `json:"label"`
	Props     map[string]interface{} `json:"properties,omitempty"`
	Direction string                 `json:"direction,omitempty"` // "outgoing", "incoming", or "bidirectional"
}

type NodeType struct {
	Name       string   `json:"name"`
	Count      int      `json:"count"`
	Properties []string `json:"properties,omitempty"`
}