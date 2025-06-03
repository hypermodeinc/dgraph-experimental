package utils

import (
	"strings"
)

func CreateReverseLabel(label string) string {
	relationshipPairs := map[string]string{
		"BELONGS_TO": "CONTAINS",
		"WORKS_FOR": "EMPLOYS",
		"PART_OF": "HAS_PART",
		"CHILD_OF": "PARENT_OF",
		"MEMBER_OF": "HAS_MEMBER",
		"REPORTS_TO": "MANAGES",
		"MANAGED_BY": "MANAGES",
		"ASSIGNED_TO": "ASSIGNED",
		"OWNED_BY": "OWNS",
		"CREATED_BY": "CREATED",
		"LOCATED_IN": "CONTAINS",
		"IN": "CONTAINS",
	}
	
	if reverse, exists := relationshipPairs[label]; exists {
		return reverse
	}
	
	for k, v := range relationshipPairs {
		if v == label {
			return k
		}
	}
	
	if strings.HasPrefix(label, "HAS_") {
		return strings.TrimPrefix(label, "HAS_")
	}
	
	return "REVERSE_" + label
}

func RemoveComments(template string) string {
	lines := strings.Split(template, "\n")
	cleaned := make([]string, 0, len(lines))
	
	for _, line := range lines {
		// Remove comments
		if idx := strings.Index(line, "#"); idx != -1 {
			line = line[:idx]
		}
		
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		cleaned = append(cleaned, line)
	}
	
	return strings.Join(cleaned, "\n")
}

func CleanRDFTemplate(template string) string {
	lines := strings.Split(template, "\n")
	cleaned := make([]string, 0, len(lines))
	
	for _, line := range lines {
	  line = strings.TrimSpace(line)
	  if line == "" || strings.HasPrefix(line, "#") {
		continue
	  }
	  
	  if !strings.HasSuffix(line, " .") {
		if strings.HasSuffix(line, ".") {
		  line = line[:len(line)-1] + " ."
		} else {
		  line = line + " ."
		}
	  }
	  
	  cleaned = append(cleaned, line)
	}
	
	return strings.Join(cleaned, "\n")
}