"use client";

import React, { useEffect, useState } from "react";
import { TableProperties, Network, Import, Loader, Code } from "lucide-react";
import { useCSVStore } from "@/store/csv";
import { useLazyQuery } from "@apollo/client";
import { GENERATE_GRAPH } from "@/app/queries";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function CSVLayout({ children }: { children: React.ReactNode }) {
  const { fileId } = useParams<{ fileId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { csvFiles, setGraphData } = useCSVStore();

  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [graphGenerationComplete, setGraphGenerationComplete] = useState(false);
  const [graphGenerationError, setGraphGenerationError] = useState<
    string | null
  >(null);

  const currentFile = csvFiles.find((file) => file.id === fileId);

  // GraphQL query for generating graph
  const [generateGraph] = useLazyQuery(GENERATE_GRAPH, {
    onCompleted: (data) => {
      if (data && data.generateGraph) {
        try {
          const parsedData = JSON.parse(data.generateGraph);
          if (currentFile) {
            setGraphData(parsedData);
          }
          setGraphGenerationComplete(true);
          setIsGeneratingGraph(false);

          // Broadcast a custom event that the graph is ready
          // This helps other components know the state has changed
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("graph-generation-complete", {
                detail: { fileId },
              }),
            );
          }
        } catch (err) {
          console.error("Error parsing graph data:", err);
          setIsGeneratingGraph(false);
          setGraphGenerationError("Failed to parse graph data");
        }
      }
    },
    onError: (error) => {
      console.error("GraphQL error:", error);
      setIsGeneratingGraph(false);
      setGraphGenerationError("Error generating graph: " + error.message);
    },
  });

  // Initialize graph generation when the component mounts
  useEffect(() => {
    // Only trigger if we have a file but no graph data yet
    if (
      currentFile &&
      !currentFile.graphData &&
      !isGeneratingGraph &&
      !graphGenerationComplete
    ) {
      initializeGraphGeneration();
    }
    // If we already have graph data, mark generation as complete
    else if (currentFile && currentFile.graphData) {
      setGraphGenerationComplete(true);

      // Broadcast event for graph being ready on initial load
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("graph-generation-complete", {
            detail: { fileId },
          }),
        );
      }
    }
  }, [currentFile]);

  // Redirect to home if file not found
  useEffect(() => {
    if (!currentFile && csvFiles.length > 0) {
      router.push("/");
    }
  }, [currentFile, csvFiles, router]);

  // Function to process a file and generate a graph
  const initializeGraphGeneration = () => {
    if (!currentFile || !currentFile.content) return;

    // Avoid duplicate graph generation
    if (isGeneratingGraph || currentFile.graphData) return;

    setIsGeneratingGraph(true);
    setGraphGenerationError(null);

    try {
      // Parse the first line of the CSV to get column names
      const lines = currentFile.content.split("\n");
      if (lines.length > 0) {
        const headerLine = lines[0].trim();
        const columnNames = headerLine
          .split(",")
          .map((col) => col.trim().replace(/^"|"$/g, ""));

        // Generate graph if we have column names
        if (columnNames.length > 0) {
          // Now generate the graph
          generateGraph({
            variables: {
              columnNames,
            },
          });
        }
      }
    } catch (err) {
      console.error("Error extracting column names:", err);
      setIsGeneratingGraph(false);
      setGraphGenerationError("Failed to extract column names from CSV");
    }
  };

  const isActive = (path: string) => pathname.includes(path);

  const isGraphView = pathname.includes("/graph");
  const isImportView = pathname.includes("/import");
  const isSpecialView = isGraphView || isImportView;

  if (!currentFile) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] w-full h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-white truncate max-w-md">
            {currentFile.name}
          </h2>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/csv/${fileId}/spreadsheet`}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              isActive("/spreadsheet")
                ? "bg-purple-900/20 text-purple-300 border border-purple-800/50"
                : "text-gray-300 hover:bg-[#333]"
            }`}
          >
            <TableProperties className="h-4 w-4 mr-1.5" />
            <span className="min-w-[70px]">Table View</span>
          </Link>
          <Link
            href={`/csv/${fileId}/graph`}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              isActive("/graph")
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
            href={`/csv/${fileId}/import`}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              isActive("/import")
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
            href={`/csv/${fileId}/query`}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              isActive("/query")
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
              {!graphGenerationComplete && !isActive("/query") && (
                <span className="ml-1 text-xs text-gray-400 inline-block">
                  (Waiting...)
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>

      <div className={`${isSpecialView ? "flex-1 h-full" : "p-6"}`}>
        {children}
      </div>

      {/* Graph generation status banner - only show when processing */}
      {isGeneratingGraph && !isGraphView && (
        <div className="px-6 py-3 bg-[#222] border-t border-[#2a2a2a] text-sm text-gray-300 flex items-center">
          <Loader className="h-4 w-4 mr-2 animate-spin text-purple-400" />
          Generating knowledge graph from CSV structure...
          <span
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
            onClick={() => router.push(`/csv/${fileId}/graph`)}
          >
            View progress →
          </span>
        </div>
      )}

      {/* Error message if graph generation failed */}
      {graphGenerationError && !isGraphView && (
        <div className="px-6 py-3 bg-red-900/20 border-t border-red-800/40 text-sm text-red-300 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {graphGenerationError}
          <button
            className="ml-auto text-xs bg-red-800/40 px-2 py-1 rounded hover:bg-red-700/40"
            onClick={initializeGraphGeneration}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
