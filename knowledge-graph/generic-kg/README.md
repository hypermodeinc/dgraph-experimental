# Generic Knowledge Graph

 
Generic KG experiment explores the creation of a knowledge graph based on generic concepts in contrast to domain specific KG.

The goal is to create a graph of information containing 
- main entities like Persons, Products, Places
- things we know about those entities, like Fact, Characteristics, ...
- relationships between main entities such as AgentiveEvent: "A Person did an action on an entity" E.g discover, created etc ...

We want to create this structured knowlegde (graph) from un-structure data, text documents.

## Design
The Generic KG is based on a KG Schema with
- main classes : All classes that could 


## Testing

### Dgraph queries

```graphql
{
      class(func: has(<rdfs:isDefinedBy>)) {
        uid
        name:<rdfs:label>
        <rdfs:comment>
        namespace:<rdfs:isDefinedBy> { uid }

      }
      data(func:has(is_a)) {
        name:<rdfs:label>
        <rdfs:comment>
        is_a { <rdfs:label> }

      }
      fact(func:eq(entity.type,"Fact")) {
         name:<rdfs:label>
        <rdfs:comment>
        type:entity.type
        source { <rdfs:label> }

      }
      characteristic(func:eq(entity.type,"Characteristic")) {
         name:<rdfs:label>
        <rdfs:comment>
        type:entity.type
        source { <rdfs:label> }

      }

    }
```
