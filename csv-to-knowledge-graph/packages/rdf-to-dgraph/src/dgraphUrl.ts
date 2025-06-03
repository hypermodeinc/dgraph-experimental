import { DgraphCredentials, DgraphConnectionOptions } from "./types";
import { connectionLogger } from "./debug";

/**
 * Parse a Dgraph connection string into connection options
 * Format: dgraph://{username:password@}host:port?args
 *
 * @param connectionString - The Dgraph connection string
 * @returns Parsed connection options
 */
export function parseDgraphConnectionString(
  connectionString: string,
): DgraphConnectionOptions {
  connectionLogger.info(
    "Parsing Dgraph connection string: %s",
    connectionString,
  );

  const options: DgraphConnectionOptions = {
    protocol: "http",
    host: "localhost",
    port: 8080,
    username: undefined,
    password: undefined,
    apiKey: undefined,
    bearerToken: undefined,
    sslMode: "disable",
    dropAll: false,
  };

  if (!connectionString.startsWith("dgraph://")) {
    options.url = connectionString;
    connectionLogger.info("Using direct HTTP URL: %s", connectionString);
    return options;
  }

  try {
    // Extract port using regex before URL parsing to ensure it's not lost
    const portMatch = connectionString.match(/:(\d+)(?=\?|$)/);
    if (portMatch) {
      options.port = parseInt(portMatch[1], 10);
      connectionLogger.info(
        "Port extracted from connection string: %s",
        options.port,
      );
    }

    const urlString = connectionString.replace(/^dgraph:\/\//, "http://");
    const url = new URL(urlString);

    if (url.username && url.password) {
      options.username = decodeURIComponent(url.username);
      options.password = decodeURIComponent(url.password);
      connectionLogger.info(
        "Auth credentials found for user: %s",
        options.username,
      );
    }

    options.host = url.hostname;

    // Use the port we extracted with regex, not url.port which might be lost

    // Remove any URL search parameters that are only for configuration
    const configParams = ["sslmode", "dropAll"];

    for (const [key, value] of url.searchParams.entries()) {
      switch (key) {
        case "apikey":
          options.apiKey = value;
          connectionLogger.info("API key found in connection string");
          break;
        case "bearertoken":
          options.bearerToken = value;
          connectionLogger.info("Bearer token found in connection string");
          break;
        case "sslmode":
          if (["disable", "require", "verify-ca"].includes(value)) {
            options.sslMode = value as "disable" | "require" | "verify-ca";
            connectionLogger.info("SSL mode set to: %s", value);
          } else {
            connectionLogger.warning(
              "Invalid SSL mode: %s, using default: disable",
              value,
            );
          }
          break;
        case "dropAll":
          options.dropAll = value === "true";
          connectionLogger.info("Drop all flag set to: %s", options.dropAll);
          break;
        default:
          connectionLogger.warning(
            "Unknown parameter in connection string: %s=%s",
            key,
            value,
          );
      }
    }

    // Remove configuration parameters from the url object
    configParams.forEach((param) => url.searchParams.delete(param));

    const protocol = options.sslMode === "disable" ? "http" : "https";

    // For localhost, always use HTTP and don't append /dgraph
    const isLocalhost = options.host === "localhost";
    const localProtocol = isLocalhost ? "http" : protocol;
    const pathSuffix = isLocalhost ? "" : "/dgraph";
    connectionLogger.info(
      "Host is %s, using %s protocol and %s appending /dgraph path",
      options.host,
      localProtocol,
      isLocalhost ? "not" : "",
    );

    // Construct URL with port and path (only append /dgraph if not localhost)
    // Filter out configuration parameters
    const customParams = Array.from(url.searchParams.entries()).filter(
      ([key]) => !["apikey", "bearertoken", "sslmode", "dropAll"].includes(key),
    );

    let urlWithParams = `${localProtocol}://${options.host}:${options.port}${pathSuffix}`;

    // Add any remaining custom parameters
    if (customParams.length > 0) {
      const queryString = customParams
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&");
      urlWithParams += `?${queryString}`;
    }

    options.url = urlWithParams;
    connectionLogger.info(
      "Constructed URL %s: %s",
      pathSuffix ? "with /dgraph path" : "without /dgraph path",
      options.url,
    );

    return options;
  } catch (error) {
    connectionLogger.error("Error parsing Dgraph connection string: %o", error);
    throw new Error(`Invalid Dgraph connection string: ${connectionString}`);
  }
}

/**
 * Convert DgraphConnectionOptions to DgraphCredentials
 *
 * @param options - The connection options
 * @returns DgraphCredentials object
 */
export function connectionOptionsToDgraphCredentials(
  options: DgraphConnectionOptions,
): DgraphCredentials {
  const credentials: DgraphCredentials = {
    url: options.url,
    dropAll: options.dropAll,
  };

  if (options.apiKey) {
    credentials.apiKey = options.apiKey;
  } else if (options.bearerToken) {
    credentials.bearerToken = options.bearerToken;
  } else if (options.username && options.password) {
    const basicAuth = Buffer.from(
      `${options.username}:${options.password}`,
    ).toString("base64");
    credentials.authHeader = `Basic ${basicAuth}`;
  }

  return credentials;
}

/**
 * Parse a dgraph:// connection string and convert it to an HTTP URL
 * @param connectionString The dgraph:// connection string
 * @returns An object with HTTP URL and auth information
 */
export function parseDgraphUrl(connectionString: string): {
  url: string;
  headers: Record<string, string>;
} {
  if (
    connectionString.startsWith("http://") ||
    connectionString.startsWith("https://")
  ) {
    return {
      url: connectionString,
      headers: {},
    };
  }

  if (!connectionString.startsWith("dgraph://")) {
    throw new Error(
      "Invalid connection string format. Must start with http://, https://, or dgraph://",
    );
  }

  try {
    // Extract port using regex to ensure we don't lose it during URL parsing
    let port = null;
    const portMatch = connectionString.match(/:(\d+)(?=\?|$)/);
    if (portMatch) {
      port = portMatch[1];
    }

    const urlString = connectionString.replace(/^dgraph:\/\//, "https://");
    const url = new URL(urlString);
    const headers: Record<string, string> = {};

    // Remove configuration parameters from search params
    url.searchParams.delete("sslmode");
    url.searchParams.delete("dropAll");

    const bearerToken = url.searchParams.get("bearertoken");
    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;
      url.searchParams.delete("bearertoken");
    }

    const apiKey = url.searchParams.get("apikey");
    if (apiKey) {
      headers["X-Auth-Token"] = apiKey;
      url.searchParams.delete("apikey");
    }

    if (url.username && url.password) {
      const basicAuth = btoa(`${url.username}:${url.password}`);
      headers["Authorization"] = `Basic ${basicAuth}`;
      url.username = "";
      url.password = "";
    }

    // Manually construct the URL to ensure port is preserved
    const hostname = url.hostname;
    const portStr = port ? `:${port}` : "";
    const search = url.search;

    // For localhost, always use HTTP and don't append /dgraph
    const isLocalhost = hostname === "localhost";
    const protocol = isLocalhost ? "http" : "https";
    const pathSuffix = isLocalhost ? "" : "/dgraph";

    const finalUrl = `${protocol}://${hostname}${portStr}${pathSuffix}${search}`;

    return {
      url: finalUrl,
      headers,
    };
  } catch (error) {
    const e = error as unknown as Error;
    throw new Error(
      `Invalid Dgraph connection string: ${connectionString} - ${e.message}`,
    );
  }
}
