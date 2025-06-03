import { parseDgraphUrl } from "./dgraphUrl";
import {
  connectionLogger,
  importLogger,
  schemaLogger,
  mutationLogger,
  debugLogger,
} from "./debug";

export interface DgraphCredentials {
  url?: string;
  apiKey?: string;
  bearerToken?: string;
  authHeader?: string;
  dropAll?: boolean;
}

export interface DgraphResponse<T = any> {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Client for interacting with Dgraph HTTP API in browser environments
 * This handles both HTTP URLs and dgraph:// connection strings
 */
export class DgraphClient {
  private connectionUrl: string;
  private headers: Record<string, string>;
  private dropAll: boolean;
  private isHypermodeInstance: boolean;

  constructor(connectionString: string | DgraphCredentials) {
    connectionLogger.info("Initializing DgraphClient");
    this.headers = {
      "Content-Type": "application/json",
    };
    this.isHypermodeInstance = false;

    // Handle different types of input
    if (typeof connectionString === "string") {
      // Parse the connection string
      connectionLogger.info("Parsing connection string: %s", connectionString);
      const { url, headers } = parseDgraphUrl(connectionString);
      this.connectionUrl = url;
      this.headers = { ...this.headers, ...headers };
      this.dropAll = false;

      // Check if this is a Hypermode instance
      if (url.includes("hypermode.host")) {
        connectionLogger.info("Detected Hypermode instance");
        this.isHypermodeInstance = true;
      }
    } else {
      connectionLogger.info("Using connection credentials object");
      if (connectionString.url) {
        if (connectionString.url.startsWith("dgraph://")) {
          connectionLogger.info(
            "Parsing dgraph:// URL: %s",
            connectionString.url,
          );
          const { url, headers } = parseDgraphUrl(connectionString.url);
          this.connectionUrl = url;
          this.headers = { ...this.headers, ...headers };

          if (url.includes("hypermode.host")) {
            connectionLogger.info("Detected Hypermode instance");
            this.isHypermodeInstance = true;
          }
        } else {
          connectionLogger.info(
            "Using direct HTTP URL: %s",
            connectionString.url,
          );
          this.connectionUrl = connectionString.url;

          if (this.connectionUrl.includes("hypermode.host")) {
            connectionLogger.info("Detected Hypermode instance");
            this.isHypermodeInstance = true;
          }
        }
      } else {
        connectionLogger.info(
          "No URL provided, using default: http://localhost:8080",
        );
        this.connectionUrl = "http://localhost:8080";
      }

      if (connectionString.apiKey) {
        connectionLogger.info("Using API key authentication");
        this.headers["X-Auth-Token"] = connectionString.apiKey;
      }
      if (connectionString.bearerToken) {
        connectionLogger.info("Using Bearer token authentication");
        this.headers["Authorization"] =
          `Bearer ${connectionString.bearerToken}`;
      }
      if (connectionString.authHeader) {
        // Extract the header name and value
        connectionLogger.info("Using custom auth header");
        const [name, value] = connectionString.authHeader.split(" ", 2);
        this.headers["Authorization"] = `${name} ${value}`;
      }

      this.dropAll = !!connectionString.dropAll;
      if (this.dropAll) {
        connectionLogger.info("Drop all flag is enabled");
      }
    }

    connectionLogger.info(
      "DgraphClient initialized with URL: %s",
      this.connectionUrl,
    );
    debugLogger.info("Headers configured: %o", Object.keys(this.headers));
  }

  /**
   * Test connection to Dgraph
   */
  async testConnection(): Promise<boolean> {
    connectionLogger.info(
      "Testing connection to Dgraph: %s",
      this.connectionUrl,
    );
    try {
      // For Hypermode hosted Dgraph instances, we need to use a different endpoint
      if (this.isHypermodeInstance) {
        connectionLogger.info("Testing Hypermode instance connection");
        // Try the admin endpoint first
        let response = await this.makeRequest<any>("/admin", {
          method: "GET",
        });

        if (!response.ok) {
          connectionLogger.info(
            "Admin endpoint failed, trying health endpoint",
          );
          // Try the health endpoint
          response = await this.makeRequest<any>("/health", {
            method: "GET",
          });
        }

        if (!response.ok) {
          connectionLogger.info("Health endpoint failed, trying root endpoint");
          // Try the root endpoint
          response = await this.makeRequest<any>("", {
            method: "GET",
          });
        }

        connectionLogger.info(
          "Connection test %s",
          response.ok ? "successful" : "failed",
        );
        return response.ok;
      } else {
        connectionLogger.info("Testing standard Dgraph connection");
        // For standard Dgraph, try the state endpoint
        let response = await this.makeRequest<any>("/state", {
          method: "GET",
        });

        // If that fails, try other endpoints
        if (!response.ok) {
          connectionLogger.info("State endpoint failed, trying root endpoint");
          response = await this.makeRequest<any>("", {
            method: "GET",
          });
        }

        if (!response.ok) {
          connectionLogger.info("Root endpoint failed, trying health endpoint");
          response = await this.makeRequest<any>("/health", {
            method: "GET",
          });
        }

        if (!response.ok) {
          connectionLogger.info(
            "Health endpoint failed, trying admin endpoint",
          );
          response = await this.makeRequest<any>("/admin", {
            method: "GET",
          });
        }

        connectionLogger.info(
          "Connection test %s",
          response.ok ? "successful" : "failed",
        );
        return response.ok;
      }
    } catch (error) {
      connectionLogger.error("Connection test failed with error: %o", error);
      return false;
    }
  }

  /**
   * Drop all data from Dgraph
   */
  async dropAllData(): Promise<boolean> {
    mutationLogger.info("Dropping all data from Dgraph");
    try {
      const response = await this.makeRequest<any>("/alter", {
        method: "POST",
        body: JSON.stringify({ drop_all: true }),
      });

      if (response.ok) {
        mutationLogger.info("Successfully dropped all data");
      } else {
        mutationLogger.error("Failed to drop all data: %s", response.error);
      }

      return response.ok;
    } catch (error) {
      mutationLogger.error("Error dropping data: %o", error);
      throw error;
    }
  }

  /**
   * Fetch schema from Dgraph
   */
  async fetchSchema(): Promise<string> {
    schemaLogger.info("Fetching schema from Dgraph");
    try {
      // The query content
      const queryContent = "schema {}";

      // Different handling for Hypermode instances vs standard Dgraph
      let headers;
      let body;

      if (
        this.isHypermodeInstance ||
        this.connectionUrl.startsWith("dgraph://")
      ) {
        // For Hypermode instances or dgraph:// URLs, wrap the query in a JSON object
        schemaLogger.info("Using JSON format for Hypermode/dgraph:// instance");
        headers = { ...this.headers, "Content-Type": "application/json" };
        body = JSON.stringify({ query: queryContent });
      } else {
        // For standard Dgraph instances, send the GraphQL query directly
        schemaLogger.info(
          "Using GraphQL+- format for standard Dgraph instance",
        );
        headers = { ...this.headers, "Content-Type": "application/graphql+-" };
        body = queryContent;
      }

      const response = await this.makeRequest<any>("/query", {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        schemaLogger.error(
          "Failed to fetch schema: %s",
          response.error || "Unknown error",
        );
        throw new Error(
          `Failed to fetch schema: ${response.error || "Unknown error"}`,
        );
      }

      if (typeof response.data === "string") {
        schemaLogger.info(
          "Received schema as string, length: %d",
          response.data.length,
        );
        return response.data;
      }

      // Format the schema data into a string
      let schemaStr = "";
      if (response.data?.data?.schema) {
        schemaLogger.info(
          "Processing schema predicates, count: %d",
          response.data.data.schema.length,
        );
        schemaStr += "Schema Predicates:\n";
        response.data.data.schema.forEach((item: any) => {
          if (item.predicate) {
            let indexInfo = "";
            if (item.index === true) {
              indexInfo = " @index";
            } else if (Array.isArray(item.tokenizer)) {
              indexInfo = ` @index(${item.tokenizer.join(", ")})`;
            }

            if (item.upsert) {
              indexInfo += " @upsert";
            }

            const listInfo = item.list ? " [list]" : "";
            schemaStr += `${item.predicate}: ${item.type}${listInfo}${indexInfo}\n`;
          }
        });

        if (
          response.data.data.types &&
          Array.isArray(response.data.data.types)
        ) {
          schemaLogger.info(
            "Processing schema types, count: %d",
            response.data.data.types.length,
          );
          schemaStr += "\nSchema Types:\n";

          response.data.data.types.forEach((type: any) => {
            schemaStr += `type ${type.name} {\n`;
            if (type.fields && Array.isArray(type.fields)) {
              type.fields.forEach((field: any) => {
                schemaStr += `  ${field.name}\n`;
              });
            }
            schemaStr += "}\n\n";
          });
        }
      } else {
        schemaLogger.error("Schema structure is different than expected");
        return "Schema structure is different than expected.";
      }

      schemaLogger.info(
        "Successfully processed schema, length: %d",
        schemaStr.length,
      );
      return schemaStr;
    } catch (error) {
      schemaLogger.error("Error fetching schema: %o", error);
      return "";
    }
  }

  /**
   * Get node types with counts
   */
  async getNodeTypesWithCounts(): Promise<Record<string, number>> {
    schemaLogger.info("Fetching node types with counts");
    try {
      const query = `
      {
        types(func: has(dgraph.type)) @groupby(pred: dgraph.type) {
          count: count(uid)
        }
      }`;

      // Different handling for Hypermode instances vs standard Dgraph
      let headers;
      let body;

      if (
        this.isHypermodeInstance ||
        this.connectionUrl.startsWith("dgraph://")
      ) {
        schemaLogger.info("Using JSON format for Hypermode/dgraph:// instance");
        // For Hypermode instances or dgraph:// URLs, wrap the query in a JSON object
        headers = { ...this.headers, "Content-Type": "application/json" };
        body = JSON.stringify({ query });
      } else {
        schemaLogger.info(
          "Using GraphQL+- format for standard Dgraph instance",
        );
        // For standard Dgraph instances, send the GraphQL query directly
        headers = { ...this.headers, "Content-Type": "application/graphql+-" };
        body = query;
      }

      const response = await this.makeRequest<any>("/query", {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        schemaLogger.error(
          "Failed to fetch node types: %s",
          response.error || "Unknown error",
        );
        throw new Error(
          `Failed to fetch node types: ${response.error || "Unknown error"}`,
        );
      }

      const typesWithCounts: Record<string, number> = {};

      if (response.data?.data?.types?.[0]?.["@groupby"]) {
        const groupBy = response.data.data.types[0]["@groupby"];
        schemaLogger.info(
          "Processing type counts, found %d type groups",
          groupBy.length,
        );

        groupBy.forEach((item: any) => {
          // Skip internal dgraph types
          if (item.pred && !item.pred.startsWith("dgraph.")) {
            typesWithCounts[item.pred] = item.count;
            schemaLogger.info(
              "Type %s has %d instances",
              item.pred,
              item.count,
            );
          }
        });
      } else {
        schemaLogger.error("No type groupings found in response");
      }

      schemaLogger.info(
        "Found %d node types",
        Object.keys(typesWithCounts).length,
      );
      return typesWithCounts;
    } catch (error) {
      schemaLogger.error("Error fetching node types: %o", error);
      return {};
    }
  }

  /**
   * Import RDF data into Dgraph
   */
  async importRdf(
    rdfData: string,
    options: {
      onProgress?: (progress: number) => void;
      onStatusChange?: (status: string) => void;
    } = {},
  ): Promise<any> {
    importLogger.info(
      "Starting RDF import, data length: %d bytes",
      rdfData.length,
    );
    try {
      // Handle dropping data if needed
      if (this.dropAll) {
        importLogger.info("Drop all flag is set, dropping existing data");
        options.onStatusChange?.("Dropping all existing data and schema...");
        await this.dropAllData();
        options.onStatusChange?.("Waiting for drop operation to complete...");
        options.onProgress?.(20);
        // Wait for drop to complete
        importLogger.info("Waiting for drop operation to settle...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Parse the RDF data to extract triples
      importLogger.info("Processing RDF triples...");
      options.onStatusChange?.("Processing RDF triples...");
      options.onProgress?.(this.dropAll ? 40 : 30);

      // Process RDF data into a set of mutations
      importLogger.info("Processing RDF data into mutations");
      const mutations = this.processRdfToMutations(rdfData);
      importLogger.info(
        "Processed %d triples into %d entities with %d relationships",
        mutations.triples.length,
        Object.keys(mutations.entities).length,
        mutations.relationships.length,
      );

      // Set up schema
      importLogger.info(
        "Setting up schema with %d relationship predicates",
        mutations.relationshipPredicates.size,
      );
      options.onStatusChange?.("Setting up schema with relationship types...");
      await this.setupSchema(mutations.relationshipPredicates);
      options.onProgress?.(50);

      // Update progress
      options.onProgress?.(60);
      options.onStatusChange?.(
        `Importing ${mutations.triples.length} triples to Dgraph...`,
      );

      // Send mutation to Dgraph
      importLogger.info(
        "Sending mutation with %d entities",
        mutations.entities.length,
      );
      const mutationHeaders = {
        ...this.headers,
        "Content-Type": "application/json",
      };
      const response = await this.makeRequest<any>("/mutate?commitNow=true", {
        method: "POST",
        headers: mutationHeaders,
        body: JSON.stringify({ set: mutations.entities }),
      });

      if (!response.ok) {
        importLogger.error(
          "Mutation failed with status: %d, error: %s",
          response.status,
          response.error,
        );
        throw new Error(`Mutation failed with status: ${response.status}`);
      }

      // Update progress after successful mutation
      options.onProgress?.(100);
      options.onStatusChange?.("Import completed successfully");
      importLogger.info("Import completed successfully");

      return {
        success: true,
        message: `Successfully imported ${mutations.triples.length} triples${this.dropAll ? " after dropping all existing data" : ""}`,
        stats: {
          triplesProcessed: mutations.triples.length,
          nodesCreated: Object.keys(mutations.entities).length,
          edgesCreated: mutations.relationships.length,
          relationshipsDetected: mutations.relationshipPredicates.size,
        },
      };
    } catch (error) {
      importLogger.error("Import error: %o", error);
      return {
        success: false,
        message: `Import failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process RDF data into mutations for Dgraph
   */
  private processRdfToMutations(rdfData: string): {
    triples: string[];
    entities: any[];
    relationships: Array<{ from: string; to: string; predicate: string }>;
    relationshipPredicates: Set<string>;
  } {
    debugLogger.info("Processing RDF data into mutations");
    // Parse RDF triples
    const relationshipPredicates = new Set<string>();

    const triples = rdfData
      .split(/\s*\.\s*\n/)
      .map((triple) => triple.trim())
      .filter((triple) => triple && !triple.startsWith("#"))
      .map((triple) => {
        // Ensure proper formatting of the triple
        if (!triple.endsWith(".")) {
          triple += " .";
        }

        // Detect relationship predicates (predicates that have URI objects, not literals)
        const uriObjectMatch = triple.match(
          /<([^>]+)>\s+<([^>]+)>\s+<([^>]+)>\s*\./,
        );
        if (uriObjectMatch) {
          // The second group is the predicate
          relationshipPredicates.add(uriObjectMatch[2]);
        }

        return triple;
      });

    debugLogger.info("Parsed %d triples from RDF data", triples.length);
    debugLogger.info(
      "Detected %d relationship predicates",
      relationshipPredicates.size,
    );

    // Create a map to track all entities
    const entities: Record<string, any> = {};
    const relationships: Array<{
      from: string;
      to: string;
      predicate: string;
    }> = [];

    // First pass - extract all entities and relationships
    debugLogger.info("First pass: extracting entities and relationships");
    for (const triple of triples) {
      // Match triple pattern
      // eslint-disable-next-line no-useless-escape
      const match = triple.match(
        /<([^>]+)>\s+<([^>]+)>\s+(?:"([^"]*)"|\<([^>]+)\>)\s*\./,
      );
      if (!match) continue;

      const subject = match[1];
      const predicate = match[2];
      const literalObject = match[3]; // For string values
      const uriObject = match[4]; // For references to other entities

      // Initialize entity if not exists
      if (!entities[subject]) {
        entities[subject] = {
          uid: subject,
        };
      }

      // Handle literal values (strings, etc.)
      if (literalObject !== undefined) {
        entities[subject][predicate] = literalObject;
      }
      // Store relationships for second pass
      else if (uriObject !== undefined) {
        relationships.push({
          from: subject,
          to: uriObject,
          predicate: predicate,
        });

        // Create the referenced entity if it doesn't exist
        if (!entities[uriObject]) {
          entities[uriObject] = {
            uid: uriObject,
          };
        }
      }
    }

    debugLogger.info(
      "First pass complete: found %d entities and %d relationships",
      Object.keys(entities).length,
      relationships.length,
    );

    // Second pass - add relationships to entities
    debugLogger.info("Second pass: adding relationships to entities");
    for (const rel of relationships) {
      if (!entities[rel.from][rel.predicate]) {
        entities[rel.from][rel.predicate] = { uid: rel.to };
      } else if (Array.isArray(entities[rel.from][rel.predicate])) {
        entities[rel.from][rel.predicate].push({ uid: rel.to });
      } else {
        entities[rel.from][rel.predicate] = [
          entities[rel.from][rel.predicate],
          { uid: rel.to },
        ];
      }
    }

    // Convert entity map to array for mutation
    const entitiesArray = Object.values(entities);
    debugLogger.info(
      "Processing complete: %d entities for mutation",
      entitiesArray.length,
    );

    return {
      triples,
      entities: entitiesArray,
      relationships,
      relationshipPredicates,
    };
  }

  /**
   * Set up schema in Dgraph
   */
  private async setupSchema(
    relationshipPredicates: Set<string>,
  ): Promise<void> {
    schemaLogger.info(
      "Setting up schema with %d relationship predicates",
      relationshipPredicates.size,
    );
    if (relationshipPredicates.size === 0) {
      schemaLogger.info("No relationship predicates to set up, skipping");
      return;
    }

    // Build the schema string with @reverse for all detected relationship predicates
    let schemaStr = "";
    relationshipPredicates.forEach((predicate) => {
      schemaStr += `${predicate}: uid @reverse .\n`;
      schemaLogger.info("Adding schema for predicate: %s", predicate);
    });

    // Always add xid schema
    schemaStr += "xid: string @index(exact) @upsert .\n";
    schemaLogger.info("Added xid schema definition");

    try {
      schemaLogger.info(
        "Sending schema alter request, schema length: %d bytes",
        schemaStr.length,
      );
      const headers = { ...this.headers, "Content-Type": "application/rdf" };
      const response = await this.makeRequest<any>("/alter", {
        method: "POST",
        headers,
        body: schemaStr,
      });

      if (!response.ok) {
        schemaLogger.error("Failed to setup schema: %s", response.error);
      } else {
        schemaLogger.info("Schema setup successful");
      }
    } catch (error) {
      schemaLogger.error("Error setting up schema: %o", error);
    }
  }

  /**
   * Make a request to the Dgraph API
   */
  async makeRequest<T>(
    endpoint: string,
    options: {
      method: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<DgraphResponse<T>> {
    debugLogger.info(
      "Making request to endpoint: %s, method: %s",
      endpoint,
      options.method,
    );
    try {
      const baseUrl = this.connectionUrl.endsWith("/")
        ? this.connectionUrl.slice(0, -1)
        : this.connectionUrl;

      const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = baseUrl + (endpoint ? path : "");

      debugLogger.info("Request URL: %s", url);
      if (options.body) {
        debugLogger.info("Request body length: %d bytes", options.body.length);
      }

      const response = await fetch(url, {
        method: options.method,
        headers: options.headers || this.headers,
        body: options.body,
        mode: "cors",
        credentials: "omit", // Don't send cookies to avoid CORS issues
      });

      debugLogger.info(
        "Response received, status: %d, ok: %s",
        response.status,
        response.ok,
      );

      let data: any;
      let error: string | undefined;

      // Parse the response based on content type
      const contentType = response.headers.get("content-type");
      debugLogger.info("Response content-type: %s", contentType);

      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
          debugLogger.info("Parsed JSON response successfully");
        } catch (e) {
          error = `Error parsing JSON response: ${e}`;
          debugLogger.error(error);
        }
      } else {
        // For text responses
        try {
          const text = await response.text();
          debugLogger.info(
            "Received text response, length: %d bytes",
            text.length,
          );

          if (text && text.trim()) {
            try {
              // Try to parse as JSON first
              data = JSON.parse(text);
              debugLogger.info("Successfully parsed text as JSON");
            } catch {
              // If not JSON, use as plain text
              data = text;
              debugLogger.info("Using response as plain text");
            }
          }
        } catch (e) {
          error = `Error parsing response: ${e}`;
          debugLogger.error(error);
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        data,
        error: response.ok ? undefined : error || response.statusText,
      };
    } catch (error) {
      debugLogger.error("Network error during request: %o", error);
      return {
        status: 0,
        ok: false,
        error: `Network error: ${error}`,
      };
    }
  }
}
