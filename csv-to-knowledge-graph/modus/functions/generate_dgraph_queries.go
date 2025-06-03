package functions

import (
	"encoding/json"
	"fmt"
	"modus/utils"
	"strings"

	"github.com/hypermodeinc/modus/sdk/go/pkg/models"
	"github.com/hypermodeinc/modus/sdk/go/pkg/models/openai"
)

func GenerateDgraphQueries(schema string, previousQuery string) (string, error) {
	model, err := models.GetModel[openai.ChatModel]("text-generator")
	if err != nil {
		return "", err
	}

	schema = strings.TrimSpace(schema)
	nodeTypes := utils.ExtractNodeTypesFromSchema(schema)
	nodeTypes = utils.FilterNodeTypes(nodeTypes)
	
	if len(nodeTypes) == 0 {
		return "", fmt.Errorf("no valid node types found in schema")
	}
	
	focusNodeType := utils.SelectFocusNodeType(nodeTypes, previousQuery)
	nodeTypesStr := strings.Join(nodeTypes, ", ")
	
	predicates := utils.ExtractPredicatesWithCase(schema)
	predicates = utils.FilterPredicates(predicates)
	predicatesStr := utils.FormatPredicatesString(predicates)

	promptText := fmt.Sprintf(`
Generate a single Dgraph Query Language (DQL) query based on this schema:

%s

Available node types (excluding internal dgraph types): %s

Focus on creating a query for node type: %s

%s

CRITICAL RULES:
1. PRESERVE EXACT capitalization of predicates and relationships
   - If schema shows "HAS_PRODUCT", use exactly "HAS_PRODUCT", not "has_product"
   - If schema shows "placed_by", use exactly "placed_by", not "PLACED_BY"
2. NO explanatory comments at the top of the query
3. ONE alias per relationship - do not repeat or chain colons:
   - CORRECT: genres: HAS_GENRE 
   - INCORRECT: genres: HAS_GENRE: Genre
4. ONE root query only - using func: type(%s)
5. NEVER use the same alias 'name' more than once in the same entity!
   - Each field needs a UNIQUE alias
   - INCORRECT: name: field1, name: field2 (duplicate 'name' alias)
   - CORRECT: primary_name: field1, secondary_name: field2 (unique aliases)
6. NEVER query internal Dgraph types starting with "dgraph." or "_"

DIRECTION RULES:
1. For FORWARD direction: alias: predicate { ... }
2. For REVERSE direction: alias: ~predicate { ... }
3. Example: items: HAS_ITEM { ... }

FORMAT REQUIREMENTS:
1. Start with "query {" ONCE
2. Use appropriate aliases for ALL fields - NEVER repeat the same alias in an entity
3. Use uid as the first field for ALL entities
4. Request 3-4 fields per entity, always including uid
5. Focus on node type %s as the root
6. Include 2-3 key relationships
7. NEVER query internal Dgraph system types

EXAMPLE OF CORRECT QUERY:
query {
  movies(func: type(Movie)) {
    uid
    title: original_title
    release_year: release_date
    runtime
    genres: HAS_GENRE {
      uid
      name: genre_name
    }
    actors: HAS_CAST {
      uid
      actor_name: name
      character
    }
  }
}

Return ONLY the query with NO explanation.
`, schema, nodeTypesStr, focusNodeType, predicatesStr, focusNodeType, focusNodeType)

	instruction := `
You are an expert in Dgraph Query Language (DQL). Create a simple, focused query with these rules:

1. Include EXACTLY ONE root query using the node type specified in the prompt
2. ALL entities must have:
   - uid field first
   - Appropriate unique aliases for each field - NEVER repeat 'name'
   - 3-4 total fields per entity

3. ALL relationships need ONE simple alias WITHOUT chained colons:
   - CORRECT: genres: HAS_GENRE { ... }
   - INCORRECT: genres: HAS_GENRE: Genre { ... }
   - NEVER use multi-colon patterns like "alias: predicate: Type"

4. For RELATIONSHIP DIRECTIONS:
   - Forward: alias: predicate { ... }
   - Reverse: alias: ~predicate { ... }

5. CRITICAL: NEVER duplicate aliases within the same entity!
   - Each field must have a UNIQUE alias
   - BAD: name: field1, name: field2 (duplicates 'name')
   - GOOD: title: field1, description: field2 (unique aliases)

6. NEVER query or reference internal Dgraph system types:
   - NEVER query types starting with "dgraph." or "_"
   - ONLY use custom application types like Movie, Person, Product, etc.

7. PRESERVE EXACT CAPITALIZATION of predicates and relationships
   - If schema shows "HAS_PRODUCT", use exactly "HAS_PRODUCT", not "has_product" 
   - If schema shows "placed_by", use exactly "placed_by", not "PLACED_BY"

8. NO comments at the beginning of the query
9. NO multiple root queries
10. NEVER include Type names after predicates
11. Focus on the node type specifically requested in the prompt

EXAMPLE (CORRECT with unique aliases):
query {
  movies(func: type(Movie)) {
    uid
    title: original_title      # Unique alias: title
    year: release_date         # Unique alias: year
    length: runtime            # Unique alias: length
    genres: HAS_GENRE {
      uid
      genre_name: name         # Unique alias in this entity
    }
  }
}

EXAMPLE (INCORRECT with duplicate aliases - DO NOT DO THIS):
query {
  movies(func: type(Movie)) {
    uid
    name: title               # WRONG: name alias used multiple times
    name: director            # WRONG: name alias used multiple times
    genres: HAS_GENRE {
      uid
      name: genre_name
    }
  }
}

Return ONLY the query, nothing else.
`

	input, err := model.CreateInput(
		openai.NewSystemMessage(instruction),
		openai.NewUserMessage(promptText),
	)
	if err != nil {
		return "", err
	}

	input.Temperature = 0.5

	output, err := model.Invoke(input)
	if err != nil {
		return "", err
	}

	content := strings.TrimSpace(output.Choices[0].Message.Content)
	
	content = utils.CleanDgraphQuery(content)
	
	content = utils.FixInternalTypeReferences(content, nodeTypes)
	content = utils.FixInternalPredicateReferences(content, predicates)
	
	description := utils.GenerateQueryDescription(focusNodeType)
	
	responseObj := map[string]string{
		"query": content,
		"description": description,
	}
	
	responseJSON, err := json.Marshal(responseObj)
	if err != nil {
		return content, nil
	}
	
	return string(responseJSON), nil
}