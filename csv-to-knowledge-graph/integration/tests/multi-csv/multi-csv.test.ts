import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { createBatchRdfProcessor } from "@hypermode/csvkit-csv-to-rdf";
import fs from "fs";
import path from "path";
import { DGRAPH_GRPC_URL, DGRAPH_HTTP_URL } from "../setup";
import { open } from "dgraph-js";

describe("Multi CSV Integration Tests", () => {
  let rdfClient: RdfToDgraph;

  const templatePath = path.join(__dirname, "./multi-csv.template");
  const donationsCsvPath = path.join(
    __dirname,
    "../",
    "donations",
    "./donations.csv",
  );
  const donorsCsvPath = path.join(__dirname, "../", "donors", "./donors.csv");
  const schoolsCsvPath = path.join(
    __dirname,
    "../",
    "schools",
    "./schools.csv",
  );
  const projectsCsvPath = path.join(
    __dirname,
    "../",
    "projects",
    "./projects.csv",
  );

  beforeAll(async () => {
    rdfClient = new RdfToDgraph({
      url: DGRAPH_HTTP_URL,
    });
  });

  test("should import all the csv files", async () => {
    const template = await fs.promises.readFile(templatePath, "utf-8");

    const donationsCsvString = await fs.promises.readFile(
      donationsCsvPath,
      "utf-8",
    );
    const donorsCsvString = await fs.promises.readFile(donorsCsvPath, "utf-8");
    const schoolsCsvString = await fs.promises.readFile(
      schoolsCsvPath,
      "utf-8",
    );
    const projectsCsvString = await fs.promises.readFile(
      projectsCsvPath,
      "utf-8",
    );

    const batchRdfProcessor = createBatchRdfProcessor();

    const rdfString = await batchRdfProcessor.processBatchToRDF(
      [
        { id: "donations", name: "donations.csv", content: donationsCsvString },
        { id: "donors", name: "donors.csv", content: donorsCsvString },
        { id: "schools", name: "schools.csv", content: schoolsCsvString },
        { id: "projects", name: "projects.csv", content: projectsCsvString },
      ],
      template,
      {
        normalizeHeaders: true,
      },
    );

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
                uid
                ID
                name: Name
                city: City
                county: County
                projects: CONTAINS {
                    uid
                    ID
                    project_title: Title
                }
            }
        }
      `;

    const client = await open(DGRAPH_GRPC_URL);

    const tx = client?.newTxn();

    const response = await tx.query(query);

    const data = response.getJson();

    await tx.commit();

    // 11 schools in the dataset
    expect(data.schools).toHaveLength(11);

    // grab the first school
    const school = data.schools.find(
      (d) => d.ID === "00064eac8b3d1f6dea8a07559922ed58",
    );
    expect(school).toBeDefined();

    expect(school).toEqual({
      uid: expect.any(String),
      ID: "00064eac8b3d1f6dea8a07559922ed58",
      name: expect.any(String),
      city: expect.any(String),
      county: expect.any(String),
      projects: {
        uid: expect.any(String),
        ID: "9c5433997d0bf0736ccd87fb32bb026e",
        project_title: expect.any(String),
      },
    });
  });
});
