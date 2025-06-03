package utils

import (
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"
)

func ExtractPredicatesWithCase(schema string) []string {
	predicates := make(map[string]bool)
	
	// Look for predicates defined in the schema
	// Typical formats: 
	// - predicate_name: type @directive
	// - has_member: [uid] @reverse
	predicateRegex := regexp.MustCompile(`\b([A-Za-z][A-Za-z0-9_]*)\s*:`)
	matches := predicateRegex.FindAllStringSubmatch(schema, -1)
	
	for _, match := range matches {
		if len(match) >= 2 {
			predName := match[1]
			// Skip some common schema keywords that aren't predicates
			if predName != "type" && predName != "reverse" && predName != "index" && 
			   predName != "upsert" && predName != "lang" && predName != "tokenizer" {
				predicates[predName] = true
			}
		}
	}
	
	// Also look for relationship mentions in comments
	// Format: # predicate: count
	commentRegex := regexp.MustCompile(`#\s*([A-Za-z][A-Za-z0-9_]*)\s*:`)
	commentMatches := commentRegex.FindAllStringSubmatch(schema, -1)
	
	for _, match := range commentMatches {
		if len(match) >= 2 {
			predicates[match[1]] = true
		}
	}
	
	// Convert to slice
	result := make([]string, 0, len(predicates))
	for pred := range predicates {
		result = append(result, pred)
	}
	
	return result
}

func ExtractNodeTypesFromSchema(schema string) []string {
    nodeTypes := make(map[string]bool)
    
    typeDefRegex := regexp.MustCompile(`type\s+([A-Za-z0-9_-]+)`)
    defMatches := typeDefRegex.FindAllStringSubmatch(schema, -1)
    for _, match := range defMatches {
        if len(match) >= 2 {
            nodeTypes[match[1]] = true
        }
    }
    
    commentRegex := regexp.MustCompile(`#\s*([A-Za-z0-9_-]+):\s*\d+`)
    matches := commentRegex.FindAllStringSubmatch(schema, -1)
    for _, match := range matches {
        if len(match) >= 2 {
            nodeTypes[match[1]] = true
        }
    }
    
    result := make([]string, 0, len(nodeTypes))
    for nodeType := range nodeTypes {
        result = append(result, nodeType)
    }
    return result
}

func FilterNodeTypes(nodeTypes []string) []string {
	filteredNodeTypes := make([]string, 0)
	for _, nodeType := range nodeTypes {
		if !strings.HasPrefix(nodeType, "dgraph.") && 
		   !strings.EqualFold(nodeType, "dgraph") && 
		   !strings.HasPrefix(nodeType, "_") {
			filteredNodeTypes = append(filteredNodeTypes, nodeType)
		}
	}
	return filteredNodeTypes
}

func FilterPredicates(predicates []string) []string {
	filteredPredicates := make([]string, 0)
	for _, pred := range predicates {
		if !strings.HasPrefix(pred, "dgraph.") && !strings.HasPrefix(pred, "_") {
			filteredPredicates = append(filteredPredicates, pred)
		}
	}
	return filteredPredicates
}

func SelectFocusNodeType(nodeTypes []string, previousQuery string) string {
	if len(nodeTypes) == 0 {
		return ""
	}
	
	rand.Seed(time.Now().UnixNano())
	
	// Track previously used types
	var usedNodeTypes []string
	if previousQuery != "" {
		for _, nodeType := range nodeTypes {
			if strings.Contains(previousQuery, fmt.Sprintf("func: type(%s)", nodeType)) {
				usedNodeTypes = append(usedNodeTypes, nodeType)
			}
		}
		
		// Try to select from unused node types if possible
		var availableTypes []string
		if len(usedNodeTypes) < len(nodeTypes) {
			for _, nodeType := range nodeTypes {
				isUsed := false
				for _, usedType := range usedNodeTypes {
					if nodeType == usedType {
						isUsed = true
						break
					}
				}
				if !isUsed {
					availableTypes = append(availableTypes, nodeType)
				}
			}
			
			if len(availableTypes) > 0 {
				return availableTypes[rand.Intn(len(availableTypes))]
			}
		}
	}
	
	// Default to a random type
	return nodeTypes[rand.Intn(len(nodeTypes))]
}

func FormatPredicatesString(predicates []string) string {
	if len(predicates) == 0 {
		return ""
	}
	
	predicatesStr := "Available predicates with their original capitalization:\n"
	for _, pred := range predicates {
		predicatesStr += "- " + pred + "\n"
	}
	
	return predicatesStr
}

func CleanDgraphQuery(content string) string {
	// Remove code block markers if present
	if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```dql")
		content = strings.TrimPrefix(content, "```dgraph")
		content = strings.TrimPrefix(content, "```graphql")
		content = strings.TrimPrefix(content, "```")
		if idx := strings.LastIndex(content, "```"); idx != -1 {
			content = content[:idx]
		}
		content = strings.TrimSpace(content)
	}

	// Remove comments at the top of the query
	lines := strings.Split(content, "\n")
	startIndex := 0
	for i, line := range lines {
		if strings.TrimSpace(line) == "query {" {
			startIndex = i
			break
		}
		if strings.HasPrefix(strings.TrimSpace(line), "query {") {
			startIndex = i
			break
		}
	}
	if startIndex > 0 {
		content = strings.Join(lines[startIndex:], "\n")
	}

	// Fix duplicate query declarations
	queryCount := strings.Count(content, "query {")
	if queryCount > 1 {
		// Replace all but the first occurrence of "query {"
		firstIndex := strings.Index(content, "query {")
		if firstIndex >= 0 {
			prefix := content[:firstIndex+7] // Keep the first "query {"
			suffix := content[firstIndex+7:] // Get everything after the first "query {"
			suffix = strings.ReplaceAll(suffix, "query {", "") // Remove all other "query {"
			content = prefix + suffix
		}
	}
	
	// If there's no "query {", add it
	if !strings.Contains(content, "query {") {
		content = "query {\n" + content
	}
	
	// Ensure the query ends with "}"
	if !strings.HasSuffix(content, "}") {
		content = content + "\n}"
	}
	
	// Find multiple root-level queries and simplify to one
	rootQueriesRegex := regexp.MustCompile(`(\w+)\s*\(\s*func:\s*`)
	matches := rootQueriesRegex.FindAllStringSubmatch(content, -1)
	
	// If we have multiple root queries, keep only the first one
	if len(matches) > 1 {
		// Find all matches and their positions
		allMatches := rootQueriesRegex.FindAllStringIndex(content, -1)
		if len(allMatches) > 1 {
			// Keep only the first query by truncating at the second one
			// and finding a good end point to close the query
			firstStart := allMatches[0][0]
			secondStart := allMatches[1][0]
			
			// Find where to end the first query
			// We'll look for the closing brace of the first query
			// by counting open and close braces
			openBraces := 0
			closePoint := secondStart
			for i := firstStart; i < secondStart; i++ {
				if content[i] == '{' {
					openBraces++
				} else if content[i] == '}' {
					openBraces--
					if openBraces == 0 {
						// Found a balanced closing brace
						closePoint = i + 1
						break
					}
				}
			}
			
			// Get just the first query
			firstQueryOnly := content[:closePoint]
			// Make sure it has a closing brace for the query block
			if !strings.HasSuffix(firstQueryOnly, "}") {
				firstQueryOnly += "\n}"
			}
			
			content = firstQueryOnly
		}
	}
	
	// Fix double colons problem - find and fix patterns like "alias: PREDICATE: Type"
	doubleColonRegex := regexp.MustCompile(`([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*{`)
	content = doubleColonRegex.ReplaceAllString(content, "$1: $2 {")
	
	// Fix common query formatting issues
	// Ensure spaces after colons in aliases
	colonSpaceRegex := regexp.MustCompile(`:\S`)
	content = colonSpaceRegex.ReplaceAllStringFunc(content, func(match string) string {
		return match[:1] + " " + match[1:]
	})
	
	// Check for and fix duplicate name aliases in the same entity
	// This regex finds blocks bounded by curly braces and all the content inside them
	entityBlockRegex := regexp.MustCompile(`{([^{}]*)}`)
	content = entityBlockRegex.ReplaceAllStringFunc(content, func(match string) string {
		// Get the content inside the curly braces
		innerContent := match[1:len(match)-1]
		
		// Look for all aliases of the form "name: something"
		nameAliasRegex := regexp.MustCompile(`name\s*:\s*\S+`)
		nameAliases := nameAliasRegex.FindAllString(innerContent, -1)
		
		// If we have more than one "name:" alias in this block, fix them
		if len(nameAliases) > 1 {
			// Keep the first name alias, rename others to be more specific
			for i := 1; i < len(nameAliases); i++ {
				// Create a unique alias based on what's being aliased
				originalAlias := nameAliases[i]
				splitParts := strings.SplitN(originalAlias, ":", 2)
				if len(splitParts) < 2 {
					continue
				}
				
				fieldName := strings.TrimSpace(splitParts[1])
				newAlias := fieldName + "_name: " + fieldName
				
				// Replace the duplicate alias with the new unique alias
				innerContent = strings.Replace(innerContent, originalAlias, newAlias, 1)
			}
			
			return "{" + innerContent + "}"
		}
		
		return match
	})
	
	return content
}

func FixInternalTypeReferences(content string, nodeTypes []string) string {
	if strings.Contains(content, "func: type(dgraph)") || 
	   strings.Contains(content, "func: type(dgraph.") || 
	   strings.Contains(content, "func: type(_") {
		// If we're querying an internal type, try to substitute with a valid user type
		if len(nodeTypes) > 0 {
			rand.Seed(time.Now().UnixNano())
			replacementType := nodeTypes[rand.Intn(len(nodeTypes))]
			
			// Replace the internal type with a valid user type
			internalTypeRegex := regexp.MustCompile(`func: type\((dgraph|dgraph\.[^)]*|_[^)]*)\)`)
			content = internalTypeRegex.ReplaceAllString(content, fmt.Sprintf("func: type(%s)", replacementType))
		}
	}
	
	return content
}

func FixInternalPredicateReferences(content string, predicates []string) string {
	internalPredRegex := regexp.MustCompile(`\b(dgraph\.[^{\s]*|_[^{\s]*)\s*{`)
	content = internalPredRegex.ReplaceAllStringFunc(content, func(match string) string {
		// If we have user predicates, try to substitute with one
		if len(predicates) > 0 {
			rand.Seed(time.Now().UnixNano())
			replacement := predicates[rand.Intn(len(predicates))]
			
			// Create a new predicate reference
			return fmt.Sprintf("%ss: %s {", strings.ToLower(replacement), replacement)
		}
		
		// If no predicates, just use a generic replacement
		return "related_items: related_to {"
	})
	
	return content
}

func GenerateQueryDescription(focusNodeType string) string {
	rand.Seed(time.Now().UnixNano())
	
	descriptionTemplates := []string{
		"Shows %s and their connections to other entities",
		"Examines %s details with related entities",
		"Visualizes %s with their relationships",
		"Displays %s with linked data",
		"Maps %s and their associated entities",
		"Explores %s relationships in the graph",
		"Reveals %s connections and properties",
		"Presents %s with interconnected entities",
		"Analyzes %s and related data points",
		"Illustrates %s with their connections",
		"Retrieves %s with connected entities",
		"Shows the network of %s and related objects",
		"Demonstrates how %s connect to other data",
		"Outlines %s and their relationships",
		"Queries %s with their relevant associations",
	}
	
	templateIndex := rand.Intn(len(descriptionTemplates))
	description := fmt.Sprintf(descriptionTemplates[templateIndex], focusNodeType)
	
	return description
}