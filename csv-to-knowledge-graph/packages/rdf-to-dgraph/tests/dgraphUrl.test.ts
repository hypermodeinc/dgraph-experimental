// tests/dgraphUrl.test.ts
import {
  parseDgraphConnectionString,
  connectionOptionsToDgraphCredentials,
} from "../src/dgraphUrl";

describe("Dgraph URL Parser", () => {
  test("should parse standard HTTP URL", () => {
    const url = "http://localhost:8080";
    const options = parseDgraphConnectionString(url);

    expect(options.url).toBe(url);
  });

  test("should parse basic dgraph connection string", () => {
    const connectionString = "dgraph://localhost:9080";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.url).toBe("http://localhost:9080");
    expect(options.sslMode).toBe("disable");
  });

  test("should parse connection string with auth", () => {
    const connectionString = "dgraph://user:password@localhost:9080";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.username).toBe("user");
    expect(options.password).toBe("password");
    expect(options.url).toBe("http://localhost:9080");
  });

  test("should parse connection string with API key", () => {
    const connectionString = "dgraph://localhost:9080?apikey=test-api-key";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.apiKey).toBe("test-api-key");
    expect(options.url).toBe("http://localhost:9080");
  });

  test("should parse connection string with bearer token", () => {
    const connectionString = "dgraph://localhost:9080?bearertoken=test-token";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.bearerToken).toBe("test-token");
    expect(options.url).toBe("http://localhost:9080");
  });

  test("should parse connection string with SSL mode", () => {
    const connectionString = "dgraph://localhost:9080?sslmode=require";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.sslMode).toBe("require");
    expect(options.url).toBe("http://localhost:9080");
  });

  test("should parse connection string with multiple params", () => {
    const connectionString =
      "dgraph://user:pass@localhost:9080?apikey=test-key&sslmode=verify-ca&dropAll=true";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe("localhost");
    expect(options.port).toBe(9080);
    expect(options.username).toBe("user");
    expect(options.password).toBe("pass");
    expect(options.apiKey).toBe("test-key");
    expect(options.sslMode).toBe("verify-ca");
    expect(options.dropAll).toBe(true);
    expect(options.url).toBe("http://localhost:9080");
  });

  test("should convert connection options to credentials", () => {
    const options = {
      url: "http://localhost:9080",
      username: "user",
      password: "pass",
      apiKey: "test-key",
      dropAll: true,
    };

    const credentials = connectionOptionsToDgraphCredentials(options);

    expect(credentials.url).toBe("http://localhost:9080");
    expect(credentials.apiKey).toBe("test-key");
    expect(credentials.dropAll).toBe(true);
  });

  test("should use bearer token in credentials if present", () => {
    const options = {
      url: "http://localhost:9080",
      bearerToken: "test-token",
    };

    const credentials = connectionOptionsToDgraphCredentials(options);

    expect(credentials.url).toBe("http://localhost:9080");
    expect(credentials.bearerToken).toBe("test-token");
    expect(credentials.apiKey).toBeUndefined();
  });

  test("should use basic auth in credentials if no token is present", () => {
    const options = {
      url: "http://localhost:9080",
      username: "user",
      password: "pass",
    };

    const credentials = connectionOptionsToDgraphCredentials(options);

    expect(credentials.url).toBe("http://localhost:9080");
    expect(credentials.authHeader).toBe("Basic dXNlcjpwYXNz"); // Base64 of "user:pass"
    expect(credentials.apiKey).toBeUndefined();
    expect(credentials.bearerToken).toBeUndefined();
  });

  test("should handle cloud instance connection string", () => {
    const connectionString =
      "dgraph://roger:supersecret@throbbing-field-510005.grpc.us-west-2.aws.cloud.dgraph.io:443?apikey=YmFi...wNmU=";
    const options = parseDgraphConnectionString(connectionString);

    expect(options.host).toBe(
      "throbbing-field-510005.grpc.us-west-2.aws.cloud.dgraph.io",
    );
    expect(options.port).toBe(443);
    expect(options.username).toBe("roger");
    expect(options.password).toBe("supersecret");
    expect(options.apiKey).toBe("YmFi...wNmU=");
    // Since cloud instances use HTTP, we should get an HTTP URL
    expect(options.url).toBe(
      "http://throbbing-field-510005.grpc.us-west-2.aws.cloud.dgraph.io:443/dgraph",
    );
  });
});
