package utils

import (
	"encoding/json"
	"fmt"
	"strings"

	"modus/types"
)

func GraphToTupleString(graph types.Graph) string {
	var sb strings.Builder
	
	sb.WriteString("NODES:\n")
	for _, node := range graph.Nodes {
		sb.WriteString(fmt.Sprintf("%s, %s, %s\n", node.ID, node.Label, node.Type))
	}
	
	if HasNodeProps(graph) {
		sb.WriteString("\nNODE_PROPS:\n")
		for _, node := range graph.Nodes {
			if node.Props != nil && len(node.Props) > 0 {
				for propName, propType := range node.Props {
					sb.WriteString(fmt.Sprintf("%s, %s, %s\n", node.ID, propName, propType))
				}
			}
		}
	}
	
	if len(graph.Edges) > 0 {
		sb.WriteString("\nEDGES:\n")
		for _, edge := range graph.Edges {
			sb.WriteString(fmt.Sprintf("%s, %s, %s", edge.Source, edge.Target, edge.Label))
			if edge.Direction != "" {
				sb.WriteString(fmt.Sprintf(", %s", edge.Direction))
			}
			sb.WriteString("\n")
		}
	}
	
	if HasEdgeProps(graph) {
		sb.WriteString("\nEDGE_PROPS:\n")
		for _, edge := range graph.Edges {
			if edge.Props != nil && len(edge.Props) > 0 {
				for propName, propType := range edge.Props {
					sb.WriteString(fmt.Sprintf("%s, %s, %s, %s, %s\n", 
						edge.Source, edge.Target, edge.Label, propName, propType))
				}
			}
		}
	}

	if len(graph.CSVHeaders) > 0 {
		sb.WriteString("\nCSV_HEADERS:\n")
		sb.WriteString(strings.Join(graph.CSVHeaders, ", "))
		sb.WriteString("\n")
	}
	
	return sb.String()
}

func HasNodeProps(graph types.Graph) bool {
	for _, node := range graph.Nodes {
		if node.Props != nil && len(node.Props) > 0 {
			return true
		}
	}
	return false
}

func HasEdgeProps(graph types.Graph) bool {
	for _, edge := range graph.Edges {
		if edge.Props != nil && len(edge.Props) > 0 {
			return true
		}
	}
	return false
}

func ProcessGraphStructure(graph *types.Graph, columnNames []string) {
	// Set CSV headers
	if columnNames != nil {
		graph.CSVHeaders = columnNames
	}

	// Ensure all edges have directions, default to "outgoing"
	for i := range graph.Edges {
		if graph.Edges[i].Direction == "" {
			graph.Edges[i].Direction = "outgoing"
		}
	}

	// Initialize empty Props maps for nodes if not already present
	for i := range graph.Nodes {
		if graph.Nodes[i].Props == nil {
			graph.Nodes[i].Props = make(map[string]interface{})
		}
	}
	
	// Initialize empty Props maps for edges if not already present
	for i := range graph.Edges {
		if graph.Edges[i].Props == nil {
			graph.Edges[i].Props = make(map[string]interface{})
		}
	}
}

func SerializeGraph(graph types.Graph) (string, error) {
	graphJSON, err := json.Marshal(graph)
	if err != nil {
		return "", fmt.Errorf("error serializing graph: %v", err)
	}
	
	return string(graphJSON), nil
}

func ParseTupleGraphString(str string) types.Graph {
	var graph types.Graph
	graph.Nodes = make([]types.Node, 0)
	graph.Edges = make([]types.Edge, 0)
	
	// Maps to track nodes/edges for property assignment
	nodesMap := make(map[string]*types.Node)
	edgesMap := make(map[string]*types.Edge)
	
	var currentSection string
	lines := strings.Split(str, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		
		// Detect section headers
		if line == "NODES:" {
			currentSection = "nodes"
			continue
		} else if line == "NODE_PROPS:" {
			currentSection = "nodeProps"
			continue
		} else if line == "EDGES:" {
			currentSection = "edges"
			continue
		} else if line == "EDGE_PROPS:" {
			currentSection = "edgeProps"
			continue
		} else if line == "CSV_HEADERS:" {
			currentSection = "csvHeaders"
			continue
		}
		
		// Split line into parts
		parts := strings.Split(line, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		
		switch currentSection {
		case "nodes":
			if len(parts) >= 2 {
				id := parts[0]
				label := parts[1]
				var nodeType string
				if len(parts) >= 3 {
					nodeType = parts[2]
				}
				
				node := types.Node{
					ID:    id,
					Label: label,
					Type:  nodeType,
					Props: make(map[string]interface{}),
				}
				
				graph.Nodes = append(graph.Nodes, node)
				nodesMap[id] = &graph.Nodes[len(graph.Nodes)-1]
			}
			
		case "nodeProps":
			if len(parts) >= 3 {
				nodeId := parts[0]
				propName := parts[1]
				propType := parts[2]
				
				if node, exists := nodesMap[nodeId]; exists {
					if node.Props == nil {
						node.Props = make(map[string]interface{})
					}
					node.Props[propName] = propType
				}
			}
			
		case "edges":
			if len(parts) >= 3 {
				source := parts[0]
				target := parts[1]
				label := parts[2]
				var direction string
				if len(parts) >= 4 {
					direction = parts[3]
				}
				
				edge := types.Edge{
					Source:    source,
					Target:    target,
					Label:     label,
					Direction: direction,
					Props:     make(map[string]interface{}),
				}
				
				graph.Edges = append(graph.Edges, edge)
				key := fmt.Sprintf("%s|%s|%s", source, target, label)
				edgesMap[key] = &graph.Edges[len(graph.Edges)-1]
			}
			
		case "edgeProps":
			if len(parts) >= 5 {
				source := parts[0]
				target := parts[1]
				label := parts[2]
				propName := parts[3]
				propType := parts[4]
				
				key := fmt.Sprintf("%s|%s|%s", source, target, label)
				if edge, exists := edgesMap[key]; exists {
					if edge.Props == nil {
						edge.Props = make(map[string]interface{})
					}
					edge.Props[propName] = propType
				}
			}
			
		case "csvHeaders":
			if len(line) > 0 {
				graph.CSVHeaders = strings.Split(line, ", ")
			}
		}
	}
	
	return graph
}

func ExtractNodeTypes(graph types.Graph) []types.NodeType {
	typeCounts := make(map[string]int)
	typeProperties := make(map[string]map[string]bool)
	
	// Count node types and collect their properties
	for _, node := range graph.Nodes {
		nodeType := node.Type
		if nodeType == "" {
			nodeType = node.Label
		}
		
		typeCounts[nodeType]++
		
		// Track properties for this node type
		if _, exists := typeProperties[nodeType]; !exists {
			typeProperties[nodeType] = make(map[string]bool)
		}
		
		// Add properties
		if node.Props != nil {
			for propName := range node.Props {
				typeProperties[nodeType][propName] = true
			}
		}
	}
	
	// Convert to NodeType array
	nodeTypes := make([]types.NodeType, 0, len(typeCounts))
	for typeName, count := range typeCounts {
		properties := make([]string, 0)
		for prop := range typeProperties[typeName] {
			properties = append(properties, prop)
		}
		
		nodeTypes = append(nodeTypes, types.NodeType{
			Name:       typeName,
			Count:      count,
			Properties: properties,
		})
	}
	
	return nodeTypes
}


func DeduplicateNodes(graph *types.Graph) {
	if graph == nil || len(graph.Nodes) == 0 {
		return
	}
	
	// Track nodes by label (which should be unique)
	nodeLabelMap := make(map[string]*types.Node)
	
	// Map of duplicate IDs to their surviving node ID
	idReplaceMap := make(map[string]string)
	
	var uniqueNodes []types.Node
	
	// First pass: identify duplicates and choose survivors
	for i := range graph.Nodes {
		node := graph.Nodes[i]
		label := node.Label
		
		if existingNode, found := nodeLabelMap[label]; found {
			// This is a duplicate node - map its ID to the surviving node
			idReplaceMap[node.ID] = existingNode.ID
			
			// Merge properties into the surviving node
			for propName, propType := range node.Props {
				if existingNode.Props == nil {
					existingNode.Props = make(map[string]interface{})
				}
				existingNode.Props[propName] = propType
			}
		} else {
			// This is a unique node - keep it
			nodeLabelMap[label] = &graph.Nodes[i]
			uniqueNodes = append(uniqueNodes, node)
		}
	}
	
	// If no duplicates found, return early
	if len(idReplaceMap) == 0 {
		return
	}
	
	// Second pass: update all edges that reference removed nodes
	for i := range graph.Edges {
		// Check if source node was removed
		if replacementID, isRemoved := idReplaceMap[graph.Edges[i].Source]; isRemoved {
			graph.Edges[i].Source = replacementID
		}
		
		// Check if target node was removed
		if replacementID, isRemoved := idReplaceMap[graph.Edges[i].Target]; isRemoved {
			graph.Edges[i].Target = replacementID
		}
	}
	
	// Third pass: remove duplicate edges that may have been created
	uniqueEdges := make([]types.Edge, 0, len(graph.Edges))
	edgeMap := make(map[string]bool)
	
	for _, edge := range graph.Edges {
		edgeKey := edge.Source + "|" + edge.Target + "|" + edge.Label
		if !edgeMap[edgeKey] {
			edgeMap[edgeKey] = true
			uniqueEdges = append(uniqueEdges, edge)
		}
	}
	
	// Update the graph with deduplicated nodes and edges
	graph.Nodes = uniqueNodes
	graph.Edges = uniqueEdges
}