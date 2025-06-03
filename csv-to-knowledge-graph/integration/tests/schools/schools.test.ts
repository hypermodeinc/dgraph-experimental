import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { open } from "dgraph-js";
import { CsvToRdf } from "@hypermode/csvkit-csv-to-rdf";
import fs from "fs";
import path from "path";
import { DGRAPH_GRPC_URL, DGRAPH_HTTP_URL } from "../setup";

// TODO geospatial
describe("Schools Integration Tests", () => {
  let rdfClient: RdfToDgraph;

  const templatePath = path.join(__dirname, "./schools.template");
  const csvPath = path.join(__dirname, "./schools.csv");

  beforeAll(async () => {
    rdfClient = new RdfToDgraph({
      url: DGRAPH_HTTP_URL,
    });
  });

  test("should import the schools dataset", async () => {
    const template = await fs.promises.readFile(templatePath, "utf-8");
    const csvString = await fs.promises.readFile(csvPath, "utf-8");

    const csvToRdf = new CsvToRdf({ template, normalizeHeaders: true });

    const rdfString = await csvToRdf.processCSVString(csvString);

    const importResult = await rdfClient.importRdf(rdfString);

    expect(importResult).toEqual({
      success: true,
      message: expect.any(String),
      stats: {
        triplesProcessed: expect.any(Number),
        nodesCreated: expect.any(Number),
        edgesCreated: expect.any(Number),
        relationshipsDetected: expect.any(Number),
      },
    });

    const query = /* GraphQL */ `
        query {
          schools(func: type(School)) {
            xid
          }
        }
      `;

    const client = await open(DGRAPH_GRPC_URL);

    const tx = client.newTxn();

    const response = await tx.query(query);

    const data = response.getJson();

    await tx.commit();

    // 10 schools in the dataset
    expect(data.schools).toHaveLength(10);

    // grab the first school
    const school = data.schools.find(
      (d) => d.xid === "00064eac8b3d1f6dea8a07559922ed58",
    );
    expect(school).toBeDefined();
  });
});
