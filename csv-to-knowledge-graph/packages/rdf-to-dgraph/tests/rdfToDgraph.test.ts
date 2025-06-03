import { RdfToDgraph } from "../src/rdfToDgraph";

describe("RdfToDgraph", () => {
  test("should construct", async () => {
    const rdfToDgraph = new RdfToDgraph({
      url: "http://some-random:8080",
    });

    const isConnected = await rdfToDgraph.testConnection();

    expect(isConnected).toBe(false);
  });
});
