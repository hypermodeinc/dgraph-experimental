# Hypermode KGkit python package

WORK IN PROGRESS - NOT TO BE USED


## Package structure
KGkit/
│
├── KGkit/
│   ├── __init__.py
│   ├── sdk.py
│  
│
├── tests/
│   ├── __init__.py
│   ├── test_sdk.py
│   
│
├── setup.py
├── README.md
└── requirements.txt

### Tests
```sh
python -m unittest discover tests
```

### Install
To install the package locally in "editable" mode, run the following command in the root directory (where setup.py is located):

```
pip install -e .
```
## Features
### KG from Tabular data
Use naming convention
prefixed column : `Project.Name` -> entity is `Project`
CSV without any prefixed column -> use `Thing`
at least one prefixed column -> use first prefix for the the entity. columns order maters: 
'Project.Name','School.ID' -> the main entity is the first seen Project and School.ID is used as a relationship to a School entity.

non-prefixed columns are use as properties of the main entity.

Geoloc:
- detect/handle LAT LONG or latitude longitude columns

### KG from text or pdf

## Backlog
- KG from Tabular data
    - detect/handle datetime column
    - Return the number of Entities created
    - add embeddings capability
    - detect/handle columns containing array of strings
- KG from text
    - how to handle chuncks and context propagation
    - review queue
    
## Open points
GraphQL Schema 
- generation for tabular data: Should we do that?
- consistency between the 2 use cases (tabular and unstructured)

Deploying GraphQL Schema in python in not possible using pydgraph and grpcTarget
-> must use HTTP request on HTTP endpoint!

generate the schema with directive for deployment !
https://stackoverflow.com/questions/76035774/unable-to-print-a-custom-directive-in-a-generated-schema

So the solution is using printSchemaWithDirectives from graphql-tools. This function also takes in an argument for pathToDirectivesInExtensions. Which means in the fields of the input we need to add extensions. The path used in the extension (i.e demoDirectives) is the same path to pass in the printSchemaWithDirectives function. The demoDirectives Object can have any number of directives. And their arguments defined as such

import { printSchemaWithDirectives, addTypes, makeDirectiveNode, GetDocumentNodeFromSchemaOptions } from '@graphql-tools/utils';
import * as graphql from 'graphql';

main()
export async function main() {
  const customDirective = new graphql.GraphQLDirective({ name: 'myDirective', locations: [graphql.DirectiveLocation.INPUT_FIELD_DEFINITION, graphql.DirectiveLocation.FIELD_DEFINITION], args: { constraint: { type: graphql.GraphQLString, description: 'An example argument for myDirective', }, errorCode: { type: graphql.GraphQLString, description: 'Another example argument for myDirective', }, }, isRepeatable: false, });
  let outputSchema =  new graphql.GraphQLSchema({ directives:[customDirective]})
  let customInput: graphql.GraphQLInputObjectType = new graphql.GraphQLInputObjectType({ name: 'customInput', fields: () => ({ myField: { type: graphql.GraphQLInt, extensions: { demoDirectives:{myDirective: {constraint:"abc"}} }}, }) })
  outputSchema = addTypes(outputSchema, [customInput])
  console.log(printSchemaWithDirectives(outputSchema,{pathToDirectivesInExtensions:['demoDirectives']}))
}