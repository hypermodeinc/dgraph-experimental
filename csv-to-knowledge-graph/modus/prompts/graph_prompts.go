package prompts

const TupleOutputFormat = `
Return your output in the following simple tuple-based format:

NODES:
node-id-1, Node Label 1, Type1
node-id-2, Node Label 2, Type2
...

NODE_PROPS:
node-id-1, propertyName1, PropertyType
node-id-1, propertyName2, PropertyType
...

EDGES:
node-id-1, node-id-2, RELATIONSHIP_LABEL, direction
node-id-2, node-id-3, ANOTHER_RELATIONSHIP, direction
...

EDGE_PROPS:
node-id-1, node-id-2, RELATIONSHIP_LABEL, propertyName, PropertyType
...

For the direction field in EDGES, use one of these values:
- "outgoing": The relationship points from the first node to the second
- "incoming": The relationship points from the second node to the first
- "bidirectional": The relationship goes both ways

For each property, include a data type as the value:
- For properties with "id", "ID", "code": use "ID"
- For properties with "date", "time", "created", "updated": use "Date"
- For properties with "count", "number", "quantity", "amount", "price", "cost": use "Integer" or "Float"
- For properties with "is", "has", "can" prefixes: use "Boolean"
- For properties that seem like names, descriptions, or text fields: use "String"
- For email properties: use "Email"
- For URL or link properties: use "URL"
`

const GraphGenerationPromptTemplate = `
Based on the following CSV column names, generate a knowledge graph structure:

Columns: %s

Analyze these column names and identify potential entities and relationships.
Create a graph with nodes and edges that would best represent this data.
` + TupleOutputFormat + `
Make sure to create a coherent graph that represents logical relationships between entities derived from these column names.
`

const BatchGraphGenerationPromptTemplate = `
Based on the following CSV column names from multiple files, generate a unified knowledge graph structure:

%s

Analyze these columns across all files and identify potential entities, relationships, and cross-file connections.
Create a graph with nodes and edges that would best represent this data, treating all files as part of an integrated dataset.
` + TupleOutputFormat + `
Make sure to create a coherent graph that represents logical relationships between entities derived from these column names.
When appropriate, create CROSS_FILE relationships that connect entities between different CSV files.
`

const CommonGraphGenerationRules = `
Follow these rules:
1. Identify potential entities from the column names
2. Create logical relationships between entities
3. Return response in the tuple-based format exactly as requested
4. Each node should have a unique ID, label, and type
5. Each edge should have a source node ID, target node ID, label, AND DIRECTION
6. Include relevant properties for nodes and edges based on column names
7. Keep the structure intuitive and aligned with knowledge graph best practices
8. DO NOT include any explanatory text - ONLY the tuple format
9. NEVER REPEAT THE SAME NODE NAME - ensure each node has a unique label
10. Create distinct, meaningful labels for each node
11. For each property, provide a data type (String, Integer, Date, etc.)
12. Use very simple ID patterns like 'person-1', 'movie-1', etc.
13. CRITICAL: ALL RELATIONSHIP/EDGE LABELS MUST BE IN UPPERCASE WITH UNDERSCORES (e.g., "ACTED_IN", "BELONGS_TO")
     - This applies ONLY to edge/relationship labels, not to node properties or other fields
     - Examples: "CREATED_BY", "WORKS_FOR", "HAS_ITEM", "BELONGS_TO"
14. Make sure all IDs referenced in relationships already exist in the nodes section
15. Avoid NODES, NODE_PROPS, EDGES, EDGE_PROPS in your actual data - these are only section headers
16. ALWAYS set the "direction" field for each edge to one of: "outgoing", "incoming", or "bidirectional"
17. Edge directions are crucial for proper graph processing
18. After generating the graph structure, VERIFY that ALL relationship/edge labels are in UPPERCASE_WITH_UNDERSCORES format
`

const GraphGenerationInstruction = `
You are an expert at creating knowledge graph models from tabular data structures. 
Your task is to analyze CSV column names and produce a valid graph structure with
nodes (entities) and edges (relationships).
` + CommonGraphGenerationRules

const BatchGraphGenerationInstruction = `
You are an expert at creating unified knowledge graph models from multiple tabular data structures. 
Your task is to analyze CSV column names from multiple files and produce a valid graph structure with
nodes (entities) and edges (relationships) that connects and integrates all the data sources.
` + CommonGraphGenerationRules + `
19. MOST IMPORTANT: For entities that appear in multiple files, create INTEGRATED relationships between them.
    For example, if file1 has "Customer_ID" and file2 has "Customer_ID", create a single Customer entity
    and connect it to entities from both files.
`