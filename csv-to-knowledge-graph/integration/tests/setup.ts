import { beforeAll, beforeEach } from "@jest/globals";
import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { open } from "dgraph-js";

export const DGRAPH_HTTP_URL =
  process.env.DGRAPH_HTTP_URL || "dgraph://localhost:8080";
export const DGRAPH_GRPC_URL =
  process.env.DGRAPH_GRPC_URL || "dgraph://localhost:9080";

beforeAll(async () => {
  const rdfClient = new RdfToDgraph({
    url: DGRAPH_HTTP_URL,
  });
  const [client, isConnected] = await Promise.all([
    open(DGRAPH_GRPC_URL),
    rdfClient.testConnection(),
  ]);

  if (!isConnected) {
    throw new Error("Failed to connect to Dgraph");
  }

  if (!client) {
    throw new Error("Failed to create Dgraph client");
  }

  await client.close();
  await new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });

  const schema = await rdfClient.fetchSchema();
  if (!schema) {
    throw new Error("Failed to fetch schema");
  }
});

beforeEach(async () => {
  const rdfClient = new RdfToDgraph({
    url: DGRAPH_HTTP_URL,
  });
  await rdfClient.dropAllData();
  await new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
});
