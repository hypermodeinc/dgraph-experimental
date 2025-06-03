import { gql } from '@apollo/client';

export const GENERATE_GRAPH = gql`
  query GenerateGraph($columnNames: [String!]!) {
    generateGraph(columnNames: $columnNames)
  }
`;

export const GENERATE_RDF_TEMPLATE = gql`
  query GenerateRDFTemplate($graphJson: String!) {
    generateRDFTemplate(graphJson: $graphJson)
  }
`;

export const GENERATE_DGRAPH_QUERIES = gql`
  query GenerateDgraphQueries($schema: String!, $previousQuery: String!) {
    generateDgraphQueries(schema: $schema, previousQuery: $previousQuery)
  }
`;

export const GENERATE_BATCH_GRAPH = gql`
  query GenerateBatchGraph($columnNamesMatrix: [[String!]!]!) {
    generateBatchGraph(columnNamesMatrix: $columnNamesMatrix)
  }
`;

export const GENERATE_BATCH_RDF_TEMPLATE = gql`
  query GenerateBatchRDFTemplate($graphJson: String!, $fileColumnNamesMatrix: [[String!]!]!) {
    generateBatchRDFTemplate(graphJson: $graphJson, fileColumnNamesMatrix: $fileColumnNamesMatrix)
  }
`;
