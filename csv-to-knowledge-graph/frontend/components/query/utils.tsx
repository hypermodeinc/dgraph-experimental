"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  Copy,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Database,
  AlertCircle,
} from "lucide-react";
import { useLazyQuery } from "@apollo/client";
import { GENERATE_DGRAPH_QUERIES } from "@/app/queries";
import CodeHighlighter from "@/components/CodeHighlighter";
import { useConnectionStore } from "@/store/connection";

export interface QueryItem {
  id: string;
  name: string;
  rdfData?: string;
  graphData?: any;
}

export interface DgraphQuery {
  id: string;
  name: string;
  description: string;
  query: string;
}

// Shared hook for query functionality
export const useQuery = () => {
  const {
    isConnected,
    schema,
    isFetching,
    fetchSchema,
    fetchNodeTypes,
    hasValidNodeTypes,
    nodeTypes,
  } = useConnectionStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [queries, setQueries] = useState<DgraphQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState<Record<number, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isSchemaRefreshing, setIsSchemaRefreshing] = useState(false);

  const queriesNeeded = 3;
  const [, setPreviousQueries] = useState<string[]>([]);

  const [generateQuery, { loading }] = useLazyQuery(GENERATE_DGRAPH_QUERIES, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.generateDgraphQueries) {
        try {
          const queryJSON = JSON.parse(data.generateDgraphQueries);
          setQueryError(null);

          const queryText = queryJSON.query;
          const descriptionText = queryJSON.description;

          let name = `Query ${queries.length + 1}`;
          // Look for name in comment at the top
          const nameMatch = queryText.match(/^(?:#|\/\/)\s*(.*?)(?:\n|$)/);
          if (nameMatch && nameMatch[1]) {
            name = nameMatch[1].trim();
          }

          // Create query object
          const newQuery: DgraphQuery = {
            id: `query-${Date.now()}-${queries.length}`,
            name,
            description: descriptionText,
            query: queryText,
          };

          // Add to queries array
          setQueries((prev) => [...prev, newQuery]);

          // If this is the first query, select it
          if (queries.length === 0) {
            setSelectedQuery(0);
          }

          // Add to previous queries for next generation
          setPreviousQueries((prev) => [...prev, queryText]);

          // Check if we need to generate more queries
          if (queries.length + 1 < queriesNeeded) {
            // Generate the next query
            generateNextQuery(queryText);
          } else {
            setIsGenerating(false);
          }
        } catch (err) {
          console.error("Error processing query:", err);
          setIsGenerating(false);
          setQueryError(
            "Failed to process query data. The schema may be invalid.",
          );
        }
      }
    },
    onError: (error) => {
      console.error("Error generating query:", error);
      setIsGenerating(false);
      // Handle the specific Apollo error for no valid node types
      if (error.message.includes("no valid node types found in schema")) {
        setQueryError(
          "No valid node types found in the schema. Try importing data first or refreshing the schema.",
        );
      } else {
        setQueryError(error.message || "Failed to generate queries");
      }
    },
  });

  // Handle schema refresh
  const handleSchemaRefresh = useCallback(async () => {
    if (isFetching || isSchemaRefreshing) return;

    setIsSchemaRefreshing(true);
    setQueryError(null);

    try {
      // First refresh the schema
      const schemaResult = await fetchSchema();

      // Then refresh the node types
      if (schemaResult) {
        const nodeTypesResult = await fetchNodeTypes();

        // Clear queries and start fresh after schema refresh if we have valid node types
        if (nodeTypesResult && Object.keys(nodeTypesResult).length > 0) {
          setQueries([]);
          setPreviousQueries([]);
          setSelectedQuery(null);

          // Small delay to ensure schema is properly updated in the store
          setTimeout(() => {
            handleGenerateQueries();
            setIsSchemaRefreshing(false);
          }, 500);
        } else {
          setIsSchemaRefreshing(false);
          setQueryError(
            "Schema refreshed but no node types found. Try importing data first.",
          );
        }
      } else {
        setIsSchemaRefreshing(false);
        setQueryError("Failed to refresh schema. Try reconnecting to Dgraph.");
      }
    } catch (err) {
      console.error("Schema refresh error:", err);
      setIsSchemaRefreshing(false);
      setQueryError("Error refreshing schema: " + (err as Error).message);
    }
  }, [fetchSchema, fetchNodeTypes, isFetching, isSchemaRefreshing]);

  // Auto-generate queries when schema is first available and we have node types
  useEffect(() => {
    // Only generate queries if:
    // - We have a schema
    // - We have valid node types
    // - We're not already generating queries
    // - We're not loading queries
    // - We're not fetching connection data
    // - We don't already have queries
    // - We don't have a query error
    if (
      schema &&
      hasValidNodeTypes &&
      !isGenerating &&
      !loading &&
      !isFetching &&
      !isSchemaRefreshing &&
      queries.length === 0 &&
      !queryError
    ) {
      handleGenerateQueries();
    }
  }, [
    schema,
    hasValidNodeTypes,
    isGenerating,
    loading,
    isFetching,
    isSchemaRefreshing,
    queries.length,
    queryError,
  ]);

  // Function to generate the next query
  const generateNextQuery = (previousQuery: string) => {
    // Create an enhanced schema with node type counts
    const enhancedSchema = `
${schema}

# Node Types with Counts:
${nodeTypes.map((type) => `# ${type.name}: ${type.count} nodes`).join("\n")}
`;

    generateQuery({
      variables: {
        schema: enhancedSchema,
        previousQuery: previousQuery,
      },
    });
  };

  // Handle generating queries
  const handleGenerateQueries = () => {
    if (!schema) {
      setQueryError("No schema available. Try refreshing the schema first.");
      return;
    }

    if (!hasValidNodeTypes) {
      setQueryError(
        "No valid node types found in the schema. Try importing data first or refreshing the schema.",
      );
      return;
    }

    setIsGenerating(true);
    setQueries([]);
    setPreviousQueries([]);
    setQueryError(null);

    // Start the first query generation with an empty previous query
    generateNextQuery("");
  };

  // Handle refreshing queries
  const handleRefreshQueries = () => {
    if (!schema || isGenerating || loading || isSchemaRefreshing) return;

    setIsRefreshing(true);
    setQueryError(null);
    handleGenerateQueries();
    setIsRefreshing(false);
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopySuccess({ ...copySuccess, [index]: true });

    // Reset copy success after 2 seconds
    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [index]: false });
    }, 2000);
  };

  // Generate the Ratel URL with the query
  const getRatelUrl = (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    return `https://ratel.hypermode.com/#query=${encodedQuery}`;
  };

  return {
    isConnected,
    isGenerating,
    queries,
    selectedQuery,
    setSelectedQuery,
    copySuccess,
    isRefreshing,
    queryError,
    isSchemaRefreshing,
    loading,
    isFetching,
    hasValidNodeTypes,
    schema,
    nodeTypes,
    handleSchemaRefresh,
    handleRefreshQueries,
    copyToClipboard,
    getRatelUrl,
  };
};

// Reusable components for the query page

export const SchemaStatus = ({
  isConnected,
  hasValidNodeTypes,
  nodeTypes,
  isFetching,
  isSchemaRefreshing,
  handleSchemaRefresh,
}: {
  isConnected: boolean;
  hasValidNodeTypes: boolean;
  nodeTypes: any[];
  isFetching: boolean;
  isSchemaRefreshing: boolean;
  handleSchemaRefresh: () => void;
}) => {
  return (
    <div className="mb-6 bg-[#1c1c1c] rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="px-4 py-3 flex justify-between items-center bg-[#222]">
        <h3 className="text-sm font-medium text-white">Schema Status</h3>
        <div>
          <button
            onClick={handleSchemaRefresh}
            disabled={isFetching || isSchemaRefreshing}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-white 
              ${isFetching || isSchemaRefreshing ? "bg-purple-700/50 cursor-not-allowed" : "bg-purple-700 hover:bg-purple-600"} rounded-md`}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${isSchemaRefreshing ? "animate-spin" : ""}`}
            />
            Refresh Schema
          </button>
        </div>
      </div>
      <div className="p-4">
        {/* Simple connection status message */}
        {!isConnected ? (
          <div className="flex items-center text-yellow-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Connect to Dgraph using the sidebar to generate queries.</p>
          </div>
        ) : !hasValidNodeTypes ? (
          <div className="flex items-center text-yellow-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>
              No node types found in schema. Try importing data or refreshing
              the schema.
            </p>
          </div>
        ) : (
          <div className="flex items-center text-green-400">
            <CheckCircle className="h-5 w-5 mr-2" />
            <p>
              Schema loaded with {nodeTypes.length} node types. Ready to
              generate queries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const QueryError = ({
  queryError,
  isSchemaRefreshing,
  handleSchemaRefresh,
}: {
  queryError: string | null;
  isSchemaRefreshing: boolean;
  handleSchemaRefresh: () => void;
}) => {
  if (!queryError) return null;

  return (
    <div className="mb-6 p-4 bg-red-900/20 border-l-4 border-red-600 text-red-300">
      <p className="flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
        {queryError}
      </p>
      <div className="mt-2">
        <button
          onClick={handleSchemaRefresh}
          disabled={isSchemaRefreshing}
          className="text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 text-sm rounded-md inline-flex items-center"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${isSchemaRefreshing ? "animate-spin" : ""}`}
          />
          Refresh Schema
        </button>
      </div>
    </div>
  );
};

export const LoadingState = ({
  isGenerating,
  loading,
  isFetching,
  isSchemaRefreshing,
  queries,
}: {
  isGenerating: boolean;
  loading: boolean;
  isFetching: boolean;
  isSchemaRefreshing: boolean;
  queries: DgraphQuery[];
}) => {
  if (!(isGenerating || loading || isFetching || isSchemaRefreshing))
    return null;

  return (
    <div className="mb-6 p-6 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mr-3"></div>
      <p className="text-gray-300">
        {isSchemaRefreshing
          ? "Refreshing schema from Dgraph..."
          : isFetching
            ? "Fetching schema from Dgraph..."
            : isGenerating
              ? `Generating query ${queries.length + 1} of 3...`
              : "Generating query based on your schema..."}
      </p>
    </div>
  );
};

export const EmptyState = ({
  isConnected,
  queryError,
  isGenerating,
  loading,
  isFetching,
  isSchemaRefreshing,
  queries,
  handleSchemaRefresh,
}: {
  isConnected: boolean;
  queryError: string | null;
  isGenerating: boolean;
  loading: boolean;
  isFetching: boolean;
  isSchemaRefreshing: boolean;
  queries: DgraphQuery[];
  handleSchemaRefresh: () => void;
}) => {
  if (
    !isConnected ||
    queryError ||
    isGenerating ||
    loading ||
    isFetching ||
    isSchemaRefreshing ||
    queries.length > 0
  )
    return null;

  return (
    <div className="mb-6 p-8 flex flex-col items-center justify-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg">
      <Database className="h-12 w-12 text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">
        No Queries Available
      </h3>
      <p className="text-gray-400 text-center max-w-md mb-4">
        To generate queries, make sure you've imported some data into Dgraph and
        refresh the schema.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={handleSchemaRefresh}
          disabled={isSchemaRefreshing}
          className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Schema
        </button>
      </div>
    </div>
  );
};

export const QueryList = ({
  queries,
  selectedQuery,
  setSelectedQuery,
  isRefreshing,
  isGenerating,
  handleRefreshQueries,
}: {
  queries: DgraphQuery[];
  selectedQuery: number | null;
  setSelectedQuery: (index: number) => void;
  isRefreshing: boolean;
  isGenerating: boolean;
  handleRefreshQueries: () => void;
}) => {
  if (queries.length === 0) return null;

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#222] flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">DQL Queries</h3>
        <button
          onClick={handleRefreshQueries}
          disabled={isRefreshing || isGenerating}
          className="text-sm text-purple-400 hover:text-purple-300 flex items-center"
          title="Generate new queries"
        >
          <RefreshCw
            className={`w-4 h-4 mr-1 ${isRefreshing || isGenerating ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
      <div className="divide-y divide-[#2a2a2a]">
        {queries.map((query, index) => (
          <button
            key={query.id}
            onClick={() => setSelectedQuery(index)}
            className={`w-full text-left px-4 py-3 hover:bg-[#222] transition ${
              selectedQuery === index
                ? "bg-purple-900/10 border-l-2 border-purple-500"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-white">
                  {query.name}
                </div>
                <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {query.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const QueryDetail = ({
  queries,
  selectedQuery,
  copySuccess,
  copyToClipboard,
  getRatelUrl,
}: {
  queries: DgraphQuery[];
  selectedQuery: number | null;
  copySuccess: Record<number, boolean>;
  copyToClipboard: (text: string, index: number) => void;
  getRatelUrl: (query: string) => string;
}) => {
  if (selectedQuery === null || !queries[selectedQuery]) return null;

  const query = queries[selectedQuery];

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#222]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">{query.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => copyToClipboard(query.query, selectedQuery)}
              className="p-2 text-gray-400 hover:text-purple-400"
              title="Copy query"
            >
              {copySuccess[selectedQuery] ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            <a
              href={getRatelUrl(query.query)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-purple-400"
              title="Open in Ratel"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-400">{query.description}</p>
      </div>
      <div className="px-6 py-4 bg-[#222]">
        <CodeHighlighter
          code={query.query}
          language="graphql"
          maxHeight="60vh"
        />
      </div>
      <div className="px-6 py-4 bg-[#222] flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Run this query in Dgraph to explore your data
        </div>
        <a
          href={getRatelUrl(query.query)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
        >
          Open in Ratel
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export const QueryLayout = ({
  currentItem,
  isBatch,
  children,
}: {
  currentItem: QueryItem;
  isBatch: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ minHeight: "calc(100vh - 11rem)" }}
    >
      <div className="flex-1 overflow-auto">
        <div className="h-full px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">
                Explore with Dgraph Queries
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Run DQL queries against your Dgraph database to explore your
                data
              </p>
            </div>

            {/* Optional Item Information for Batches */}
            {isBatch && (
              <div className="mb-6 bg-[#1c1c1c] rounded-lg overflow-hidden border border-[#2a2a2a]">
                <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#222]">
                  <h3 className="text-sm font-medium text-white">
                    Batch Information
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#222] p-3 rounded border border-[#333]">
                      <div className="text-sm font-medium text-gray-300">
                        Name
                      </div>
                      <div className="text-sm text-gray-400">
                        {currentItem.name}
                      </div>
                    </div>
                    <div className="bg-[#222] p-3 rounded border border-[#333]">
                      <div className="text-sm font-medium text-gray-300">
                        RDF Format
                      </div>
                      <div className="text-sm text-gray-400">Turtle (.ttl)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
