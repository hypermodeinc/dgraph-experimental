import dotenv from "dotenv";
dotenv.config();

import { RdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import { open } from "dgraph-js";
import { CsvToRdf } from "@hypermode/csvkit-csv-to-rdf";
import fs from "fs";
import path from "path";
import { DGRAPH_GRPC_URL, DGRAPH_HTTP_URL } from "../setup";

describe("Movies Integration Tests", () => {
  let rdfClient: RdfToDgraph;

  const templatePath = path.join(__dirname, "./movies.template");
  const csvPath = path.join(__dirname, "./movies.csv");

  beforeAll(async () => {
    rdfClient = new RdfToDgraph({
      url: DGRAPH_HTTP_URL,
    });
  });

  test("should import the movies dataset", async () => {
    const template = await fs.promises.readFile(templatePath, "utf-8");
    const csvString = await fs.promises.readFile(csvPath, "utf-8");

    const csvToRdf = new CsvToRdf({ template });

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
          movies(func: type(Movie)) {
            uid
            title: original_title
            summary: overview
            release_year: release_date
            genres: HAS_GENRE {
              uid
              genre_name: name
            }
            keywords: HAS_KEYWORD {
              uid
              keyword_name: name
            }
          }
        }
      `;

    const client = await open(DGRAPH_GRPC_URL);

    const tx = client.newTxn();

    const response = await tx.query(query);

    const data = response.getJson();

    await tx.commit();

    // 51 movies in the dataset
    expect(data.movies).toHaveLength(51);

    // Get a hardcoded movie
    const jurassicWorld = data.movies.find(
      (movie) => movie.title === "Jurassic World",
    );
    expect(jurassicWorld).toBeDefined();

    expect(jurassicWorld).toMatchObject({
      title: "Jurassic World",
      release_year: "2015-06-09",
      genres: {
        // TODO: Better list handling
        genre_name: "Action Adventure Science Fiction Thriller",
      },
    });
  });
});
