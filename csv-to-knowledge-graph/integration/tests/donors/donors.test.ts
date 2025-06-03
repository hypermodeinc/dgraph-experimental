import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { open } from "dgraph-js";
import { CsvToRdf } from "@hypermode/csvkit-csv-to-rdf";
import fs from "fs";
import path from "path";
import { DGRAPH_GRPC_URL, DGRAPH_HTTP_URL } from "../setup";

describe("Donors Integration Tests", () => {
  let rdfClient: RdfToDgraph;

  const templatePath = path.join(__dirname, "./donors.template");
  const csvPath = path.join(__dirname, "./donors.csv");

  beforeAll(async () => {
    rdfClient = new RdfToDgraph({
      url: DGRAPH_HTTP_URL,
    });
  });

  test("should import the donors dataset", async () => {
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
          donors(func: type(Donor)) {
            xid
          }
        }
      `;

    const client = await open(DGRAPH_GRPC_URL);

    const tx = client.newTxn();

    const response = await tx.query(query);

    const data = response.getJson();

    await tx.commit();

    // 190 donors in the dataset
    expect(data.donors).toHaveLength(190);

    // grab the first doner
    const donor = data.donors.find(
      (d) => d.xid === "006b1d8366b7cbd32db380790cd6eec5",
    );
    expect(donor).toBeDefined();
  });
});
