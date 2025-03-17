"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Entity } from "./types";
import  CytoscapeView from "./cytoscape-view";

class Response {
  list: Entity[] = [];
}
const GET_ENTITIES = gql`
  query QueryEntities {
      list:queryEntities {
          id 
          label
          is_a
          description
      }
  }`


export function GraphViewer() {
  const { data, loading, error } = useQuery<Response>(GET_ENTITIES);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  return (
    <div>
      <h2>Graph Viewer</h2>
      <ul>
        {data!.list.map((entity) => (
          <li key={entity.id}>
            {entity.label} 
          </li>
        ))}
      </ul>
      <CytoscapeView data={data} />
    </div>
  );
}
