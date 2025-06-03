import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { open } from "dgraph-js";
import { CsvToRdf } from "@hypermode/csvkit-csv-to-rdf";
import fs from "fs";
import path from "path";
import { DGRAPH_GRPC_URL, DGRAPH_HTTP_URL } from "../setup";

describe("Donations Integration Tests", () => {
  let rdfClient: RdfToDgraph;

  const templatePath = path.join(__dirname, "./donations.template");
  const csvPath = path.join(__dirname, "./donations.csv");

  beforeAll(async () => {
    rdfClient = new RdfToDgraph({
      url: DGRAPH_HTTP_URL,
    });
  });

  test("should import the donations dataset", async () => {
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
          donations(func: type(Donation)) {
            xid
            amount: amount
          }
        }
      `;

    const client = await open(DGRAPH_GRPC_URL);

    const tx = client.newTxn();

    const response = await tx.query(query);

    const data = response.getJson();

    await tx.commit();

    // 224 donations in the dataset
    expect(data.donations).toHaveLength(224);

    // grab the first donation
    const donation = data.donations.find(
      (d) => d.xid === "9b1e2d804779eb82ec7cce9d704c9a48",
    );
    expect(donation).toBeDefined();
  });
});
