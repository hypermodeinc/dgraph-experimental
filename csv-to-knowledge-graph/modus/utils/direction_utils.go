package utils

import (
	"modus/types"
)

func EnsureConsistentDirections(graph *types.Graph) {
	if graph == nil {
		return
	}
	
	existingEdges := make(map[string]bool)
	for _, edge := range graph.Edges {
		key := edge.Source + "|" + edge.Target + "|" + edge.Label
		existingEdges[key] = true
	}
	
	var newEdges []types.Edge
	for i := range graph.Edges {
		if graph.Edges[i].Direction == "bidirectional" {
			reverseKey := graph.Edges[i].Target + "|" + graph.Edges[i].Source + "|" + graph.Edges[i].Label
			if !existingEdges[reverseKey] {
				reverseEdge := types.Edge{
					Source:    graph.Edges[i].Target,
					Target:    graph.Edges[i].Source,
					Label:     CreateReverseLabel(graph.Edges[i].Label),
					Direction: "incoming", 
					Props:     graph.Edges[i].Props,
				}
				newEdges = append(newEdges, reverseEdge)
			}
			
			graph.Edges[i].Direction = "outgoing"
		}
		
		if graph.Edges[i].Direction == "" {
			graph.Edges[i].Direction = "outgoing"
		}
	}
	
	graph.Edges = append(graph.Edges, newEdges...)
}