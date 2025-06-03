"use client";

import React, { useEffect, useState } from "react";
import {
  Folder,
  Network,
  Import,
  Loader,
  AlertCircle,
  CheckCircle,
  Code,
} from "lucide-react";
import { useBatchStore } from "@/store/batch";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useLazyQuery } from "@apollo/client";
import { GENERATE_BATCH_GRAPH } from "@/app/queries";

export default function BatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { batchId } = useParams<{ batchId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { batches, setBatchGraphData } = useBatchStore();

  // Additional state for batch graph processing
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [graphGenerationComplete, setGraphGenerationComplete] = useState(false);
  const [graphGenerationError, setGraphGenerationError] = useState<
    string | null
  >(null);

  const currentBatch = batches.find((batch) => batch.id === batchId);

  // GraphQL query for generating batch graph
  const [generateBatchGraph] = useLazyQuery(GENERATE_BATCH_GRAPH, {
    onCompleted: (data) => {
      if (data && data.generateBatchGraph) {
        try {
          const parsedData = JSON.parse(data.generateBatchGraph);

          // Update the batch store with graph data
          if (currentBatch) {
            setBatchGraphData(parsedData);
          }

          setGraphGenerationComplete(true);
          setIsGeneratingGraph(false);
          setGraphGenerationError(null);

          // Dispatch completion event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("graph-generation-complete", {
                detail: { batchId },
              }),
            );
          }
        } catch (err) {
          console.error("Error parsing batch graph data:", err);
          setGraphGenerationError("Failed to parse batch graph data");
          setIsGeneratingGraph(false);
        }
      }
    },
    onError: (error) => {
      console.error("GraphQL error:", error);
      setGraphGenerationError(
        error.message || "Failed to generate batch graph",
      );
      setIsGeneratingGraph(false);
    },
  });

  // Initialize batch graph generation when the component mounts
  useEffect(() => {
    // Only trigger if we have a batch with files but no graph data yet
    if (
      currentBatch &&
      currentBatch.files.length > 0 &&
      !currentBatch.graphData &&
      !isGeneratingGraph &&
      !graphGenerationComplete
    ) {
      initializeBatchGraphGeneration();
    }
    // If we already have graph data, mark generation as complete
    else if (currentBatch && currentBatch.graphData) {
      setGraphGenerationComplete(true);

      // Dispatch event that graph is already complete
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("graph-generation-complete", {
            detail: { batchId },
          }),
        );
      }
    }
  }, [currentBatch]);

  // Function to generate a batch graph
  const initializeBatchGraphGeneration = () => {
    if (!currentBatch || currentBatch.files.length === 0) return;

    // Avoid duplicate graph generation
    if (isGeneratingGraph || currentBatch.graphData) return;

    setIsGeneratingGraph(true);
    setGraphGenerationError(null);

    // Dispatch event that graph generation is starting
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("graph-generation-start", {
          detail: { batchId },
        }),
      );
    }

    try {
      // Extract column names from all CSV files
      const columnNamesMatrix = currentBatch.files.map((file) => {
        if (!file.content) return [];

        // Parse the first line of the CSV to get column names
        const lines = file.content.split("\n");
        if (lines.length > 0) {
          const headerLine = lines[0].trim();
          return headerLine
            .split(",")
            .map((col) => col.trim().replace(/^"|"$/g, ""));
        }
        return [];
      });

      // Filter out empty arrays
      const validColumnNamesMatrix = columnNamesMatrix.filter(
        (cols) => cols.length > 0,
      );

      if (validColumnNamesMatrix.length > 0) {
        // Now generate the batch graph
        generateBatchGraph({
          variables: {
            columnNamesMatrix: validColumnNamesMatrix,
          },
        });
      } else {
        setGraphGenerationError("No valid CSV headers found in batch files");
        setIsGeneratingGraph(false);
        // Dispatch error event
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("graph-generation-error", {
              detail: {
                batchId,
                error: "No valid CSV headers found in batch files",
              },
            }),
          );
        }
      }
    } catch (err) {
      console.error("Error extracting column names:", err);
      setGraphGenerationError("Failed to extract column names from CSV files");
      setIsGeneratingGraph(false);
      // Dispatch error event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("graph-generation-error", {
            detail: {
              batchId,
              error: "Failed to extract column names from CSV files",
            },
          }),
        );
      }
    }
  };

  // Updated isActive function to properly highlight the Batch View tab
  const isActive = (path: string) => {
    // For the batch view (root path)
    if (path === "batch") {
      // If we're at the root batch path (not graph or import subpaths)
      return pathname === `/batch/${batchId}`;
    }

    // For other tabs (graph, import)
    return pathname.includes(`/${path}`);
  };

  const isGraphView = pathname.includes("/graph");
  const isImportView = pathname.includes("/import");
  const isQueryView = pathname.includes("/query");
  const isSpecialView = isGraphView || isImportView || isQueryView;

  // Retry graph generation function
  const handleRetryGraphGeneration = () => {
    setGraphGenerationError(null);
    initializeBatchGraphGeneration();
  };

  // Show loading state if no batch found yet
  if (!currentBatch) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] w-full h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center">
            <Folder className="h-5 w-5 text-purple-400 mr-2" />
            <h2 className="text-lg font-medium text-white truncate max-w-md">
              {currentBatch.name}
            </h2>
          </div>
          {currentBatch.files.length > 0 && (
            <span className="ml-3 text-xs text-gray-400">
              {currentBatch.files.length} file
              {currentBatch.files.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {/* Navigation tabs */}
          <div className="flex space-x-2">
            <Link
              href={`/batch/${batchId}`}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                isActive("batch")
                  ? "bg-purple-900/20 text-purple-300 border border-purple-800/50"
                  : "text-gray-300 hover:bg-[#333]"
              }`}
            >
              <Folder className="h-4 w-4 mr-1.5" />
              <span className="min-w-[70px]">Batch View</span>
            </Link>
            <Link
              href={`/batch/${batchId}/graph`}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                isActive("graph")
                  ? "bg-purple-900/20 text-purple-300 border border-purple-800/50"
                  : "text-gray-300 hover:bg-[#333]"
              }`}
            >
              {isGeneratingGraph && !isGraphView ? (
                <Loader className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Network className="h-4 w-4 mr-1.5" />
              )}
              <span className="min-w-[70px]">
                Graph View
                {isGeneratingGraph && !isGraphView && (
                  <span className="ml-1 text-xs text-gray-400 inline-block">
                    (Generating...)
                  </span>
                )}
              </span>
            </Link>
            <Link
              href={`/batch/${batchId}/import`}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                isActive("import")
                  ? "bg-purple-900/20 text-purple-300 border border-purple-800/50"
                  : !graphGenerationComplete
                    ? "text-gray-500 cursor-not-allowed opacity-60"
                    : "text-gray-300 hover:bg-[#333]"
              }`}
              onClick={(e) => {
                if (!graphGenerationComplete) {
                  e.preventDefault();
                }
              }}
              title={
                !graphGenerationComplete
                  ? "Graph generation must complete before import"
                  : "Import to Dgraph"
              }
            >
              <Import className="h-4 w-4 mr-1.5" />
              <span className="min-w-[70px]">
                Import
                {!graphGenerationComplete && !isImportView && (
                  <span className="ml-1 text-xs text-gray-400 inline-block">
                    (Waiting...)
                  </span>
                )}
              </span>
            </Link>
            {/* Add Query tab */}
            <Link
              href={`/batch/${batchId}/query`}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                isActive("query")
                  ? "bg-purple-900/20 text-purple-300 border border-purple-800/50"
                  : !graphGenerationComplete
                    ? "text-gray-500 cursor-not-allowed opacity-60"
                    : "text-gray-300 hover:bg-[#333]"
              }`}
              onClick={(e) => {
                if (!graphGenerationComplete) {
                  e.preventDefault();
                }
              }}
              title={
                !graphGenerationComplete
                  ? "Graph generation must complete before queries"
                  : "Explore with Queries"
              }
            >
              <Code className="h-4 w-4 mr-1.5" />
              <span className="min-w-[70px]">
                Query
                {!graphGenerationComplete && !isQueryView && (
                  <span className="ml-1 text-xs text-gray-400 inline-block">
                    (Waiting...)
                  </span>
                )}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Graph generation error notification */}
      {graphGenerationError && !isGraphView && (
        <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-800/40 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">
              Graph Generation Error
            </p>
            <p className="text-xs text-red-300/80 mt-1">
              {graphGenerationError}
            </p>
            <div className="flex mt-2 space-x-3">
              <button
                onClick={handleRetryGraphGeneration}
                className="inline-flex items-center text-xs bg-red-800/40 px-2 py-1 rounded hover:bg-red-700/40 text-red-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
              <Link
                href={`/batch/${batchId}/graph`}
                className="inline-flex items-center text-xs text-red-300 hover:text-red-200"
              >
                View Details
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`${isSpecialView ? "flex-1 h-full" : "p-6"}`}>
        {children}
      </div>

      {/* Graph generation status banner - only show when processing */}
      {isGeneratingGraph && !isGraphView && (
        <div className="px-6 py-3 bg-[#222] border-t border-[#2a2a2a] text-sm text-gray-300 flex items-center">
          <Loader className="h-4 w-4 mr-2 animate-spin text-purple-400" />
          Generating unified knowledge graph from {
            currentBatch.files.length
          }{" "}
          CSV files...
          <span
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
            onClick={() => router.push(`/batch/${batchId}/graph`)}
          >
            View progress →
          </span>
        </div>
      )}

      {/* Graph generation success banner - only show when complete and not on graph view */}
      {graphGenerationComplete &&
        !isGraphView &&
        !isImportView &&
        !isQueryView && (
          <div className="px-6 py-3 bg-[#222] border-t border-[#2a2a2a] text-sm text-green-300 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
            Knowledge graph generated successfully.
            <Link
              href={`/batch/${batchId}/import`}
              className="ml-auto text-xs text-purple-400 hover:text-purple-300 flex items-center"
            >
              Continue to Import
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
    </div>
  );
}
