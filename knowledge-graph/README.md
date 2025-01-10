# Knowldge Graph related tools

A set of tools and examples to use Dgraph as your knowledge graph.

## Import ontology


```graphql
{
      ontology(func: has(<dgraph-exp.namespace>)) {
        name:<dgraph-exp.namespace>
        <dgraph-exp.Class> {
          name:<http://www.w3.org/2000/01/rdf-schema#label>
         comment:<http://www.w3.org/2000/01/rdf-schema#comment>
         subClassOf:<http://www.w3.org/2000/01/rdf-schema#subClassOf> { 
          uid
          
        }
        dgraph-exp.Property @filter(eq(<dgraph-exp.is_relationship>,true)) {
            name:<http://www.w3.org/2000/01/rdf-schema#label>
            range:<http://www.w3.org/2000/01/rdf-schema#range> {
              name:<http://www.w3.org/2000/01/rdf-schema#label>

        }
        }
        }
      }
    }
```
