import { DgraphClient, DgraphCredentials } from "./dgraphClient";

export interface ImportOptions {
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    triplesProcessed: number;
    nodesCreated: number;
    edgesCreated: number;
    relationshipsDetected: number;
  };
}

export class RdfToDgraph {
  private client: DgraphClient;
  private isImporting: boolean = false;

  constructor(credentials: string | DgraphCredentials = {}) {
    this.client = new DgraphClient(credentials);
  }

  /**
   * Test connection to Dgraph
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Drop all data from Dgraph
   */
  async dropAllData(): Promise<boolean> {
    return this.client.dropAllData();
  }

  /**
   * Fetch schema from Dgraph
   */
  async fetchSchema(): Promise<string> {
    return this.client.fetchSchema();
  }

  /**
   * Get node types with counts from Dgraph
   */
  async getNodeTypesWithCounts(): Promise<Record<string, number>> {
    return this.client.getNodeTypesWithCounts();
  }

  /**
   * Import RDF data to Dgraph
   */
  async importRdf(
    rdfData: string,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    if (this.isImporting) {
      throw new Error("Import already in progress");
    }

    this.isImporting = true;

    try {
      return await this.client.importRdf(rdfData, options);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Set up XID schema
   */
  async setupXidSchema(): Promise<void> {
    const schema = "xid: string @index(exact) @upsert .";

    try {
      const headers = { "Content-Type": "application/rdf" };
      await this.client.makeRequest("/alter", {
        method: "POST",
        headers,
        body: schema,
      });
    } catch (error) {
      console.error("Failed to setup xid schema:", error);
      throw error;
    }
  }

  /**
   * Disconnect (no-op in HTTP client)
   */
  async disconnect(): Promise<void> {
    // HTTP connections don't need to be explicitly closed
    return Promise.resolve();
  }

  /**
   * Fetch and log schema
   */
  async fetchAndLogSchema(): Promise<void> {
    try {
      const schema = await this.fetchSchema();
      if (schema) {
        console.log("Current Dgraph Schema:", schema);
      }
    } catch (error) {
      console.error("Error fetching schema:", error);
    }
  }
}

/**
 * Helper function to import RDF data to Dgraph
 */
export async function importRdfToDgraph(
  rdfData: string,
  connectionStringOrCredentials: string | DgraphCredentials,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const rdfToDgraph = new RdfToDgraph(connectionStringOrCredentials);

  const isConnected = await rdfToDgraph.testConnection();
  if (!isConnected) {
    throw new Error("Failed to connect to Dgraph");
  }

  try {
    await rdfToDgraph.setupXidSchema();
  } catch (error) {
    console.warn(
      "Failed to setup xid schema. Import may still succeed:",
      error,
    );
  }

  const result = await rdfToDgraph.importRdf(rdfData, options);
  await rdfToDgraph.disconnect();

  return result;
}
