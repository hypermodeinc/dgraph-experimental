package functions

import (
	"encoding/json"
	"fmt"
	"strings"

	_ "github.com/hypermodeinc/modus/sdk/go"
	"github.com/hypermodeinc/modus/sdk/go/pkg/models"
	"github.com/hypermodeinc/modus/sdk/go/pkg/models/openai"

	"modus/types"
	"modus/utils"
)

func GenerateRDFTemplate(graphJson string) (string, error) {
	var graph types.Graph
	if err := json.Unmarshal([]byte(graphJson), &graph); err != nil {
		return "", fmt.Errorf("error parsing graph JSON: %v", err)
	}

	utils.EnsureConsistentDirections(&graph)

	model, err := models.GetModel[openai.ChatModel]("text-generator")
	if err != nil {
		return "", err
	}

	tupleGraphStr := utils.GraphToTupleString(graph)
	
	nodeTypes := utils.ExtractNodeTypes(graph)
	nodeTypeInfo := ""
	
	for _, nodeType := range nodeTypes {
		nodeTypeInfo += fmt.Sprintf("- %s: %d instances\n", nodeType.Name, nodeType.Count)
		if len(nodeType.Properties) > 0 {
			nodeTypeInfo += "  Properties: " + strings.Join(nodeType.Properties, ", ") + "\n"
		}
	}

	promptText := fmt.Sprintf(`
Based on the following CSV headers and knowledge graph schema, generate an RDF template.

CSV Column Headers: %s

Knowledge Graph Schema:
%s

Node Type Information:
%s

Return ONLY the RDF template with these rules:
- Use TRIPLE format: <subject> <predicate> <object> .
- Use [ColumnName] for CSV column placeholders
- Create unique identifiers: <_:EntityType_[ID.Column]> for entities
- Every entity needs: <_:EntityType_ID> <dgraph.type> "EntityType" .
- Include all relationships between entities
- CRITICAL: For edge directions:
  - For outgoing edges: <source> <predicate> <target> .
  - For incoming edges: DON'T use "~" prefix in the predicate name. Instead, create a new appropriately named predicate.
    For example, instead of using "~BELONGS_TO", use a new predicate like "HAS_MEMBER" or "CONTAINS".
  - For bidirectional edges, create both directions with different predicates
- Do not include any additional text, explanations, or comments
- IMPORTANT: All predicates must be valid (no hyphens, no spaces, no special characters, alphanumeric characters and underscores only)
`, strings.Join(graph.CSVHeaders, ", "), tupleGraphStr, nodeTypeInfo)

	instruction := `
You are generating an RDF template for converting CSV data to RDF triples for Dgraph.
Return ONLY the RDF template in N-Triples format.

CRITICAL RULES:
1. Use N-Triples format (no prefixes, all URIs in full form)
2. Each triple must end with a period on its own line
3. Use double quotes for all literal values
4. Escape special characters in literals (quotes, newlines, etc.)
5. Predicates can only contain letters, numbers, and underscores
6. Replace all hyphens in predicates with underscores
7. Format: <subject> <predicate> "object" .
8. Example: <_:entity_1> <product_name> "Bradford-Yu" .
9. Preserve capitalization of CSV headers in regular property predicates
10. Ensure all nodes have at least one predicate

11. CRITICALLY IMPORTANT: NEVER use tilde (~) in predicate names - Dgraph does not accept this character
12. For reverse relationships, create a new predicate with an appropriate name:
    - Instead of: <A> <~works_for> <B> 
    - Use: <A> <EMPLOYS> <B>
    - Common reverse predicate pairs:
      * BELONGS_TO ↔ CONTAINS
      * WORKS_FOR ↔ EMPLOYS
      * PART_OF ↔ HAS_PART
      * CHILD_OF ↔ PARENT_OF
      * MEMBER_OF ↔ HAS_MEMBER
13. Add @reverse in your comments for relationship predicates that should have it
14. ALL RELATIONSHIP PREDICATES (that connect two entities) MUST BE IN UPPERCASE WITH UNDERSCORES
    - This applies ONLY to predicates between entities (connecting two nodes)
    - Regular attribute predicates that contain literal values should maintain their original case
    - Example of relationship predicate: <_:Person_[ID]> <WORKS_FOR> <_:Company_[CompanyID]> .
    - Example of attribute predicate: <_:Person_[ID]> <firstName> "John" .
15. After generating the RDF template, VERIFY that all relationship predicates are in UPPERCASE_WITH_UNDERSCORES format
16. If you find any relationship predicate between nodes that is not in uppercase, convert it to uppercase before returning

FORMAT EXAMPLE:
<_:Person_[ID]> <dgraph.type> "Person" .
<_:Person_[ID]> <firstName> "[FirstName]" .
<_:Person_[ID]> <lastName> "[LastName]" .
<_:Company_[CompanyID]> <dgraph.type> "Company" .
<_:Company_[CompanyID]> <companyName> "[CompanyName]" .
<_:Person_[ID]> <WORKS_FOR> <_:Company_[CompanyID]> .  # Person -> Company (relationship in UPPERCASE)
<_:Company_[CompanyID]> <EMPLOYS> <_:Person_[ID]> .  # Company -> Person (relationship in UPPERCASE)
`
	input, err := model.CreateInput(
		openai.NewSystemMessage(instruction),
		openai.NewUserMessage(promptText),
	)
	if err != nil {
		return "", err
	}

	input.Temperature = 0.2

	output, err := model.Invoke(input)
	if err != nil {
		return "", err
	}

	content := strings.TrimSpace(output.Choices[0].Message.Content)
	
	content = utils.RemoveComments(content)
	
	content = utils.CleanRDFTemplate(content)
	
	return content, nil
}

