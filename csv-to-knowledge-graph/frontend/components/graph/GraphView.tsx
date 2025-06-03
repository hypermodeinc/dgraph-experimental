"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useCSVStore } from "@/store/csv";
import { useLazyQuery } from "@apollo/client";
import { GENERATE_GRAPH } from "@/app/queries";
import BaseGraphView from "./BaseGraphView";

export const GraphView: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const { setGraphData: storeGraphData, currentFile } = useCSVStore();

  const [graphData, setGraphData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isProcessingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  // Function to notify other components that graph generation is complete
  const notifyGraphGenerationComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("graph-generation-complete", {
          detail: { fileId },
        }),
      );
    }
  }, [fileId]);

  const handleGraphGenerated = useCallback(
    (data: any) => {
      if (data && data.generateGraph) {
        try {
          const parsedData = JSON.parse(data.generateGraph);
          setGraphData(parsedData);

          if (currentFile) {
            storeGraphData(parsedData);
          }

          setError(null);
          setIsLoading(false);
          isProcessingRef.current = false;

          // Notify that graph generation is complete
          notifyGraphGenerationComplete();
        } catch (err) {
          console.error("Error parsing graph data:", err);
          setError("Failed to parse graph data");
          setIsLoading(false);
          isProcessingRef.current = false;
        }
      }
    },
    [currentFile, storeGraphData, notifyGraphGenerationComplete],
  );

  const handleGraphError = useCallback((error: any) => {
    console.error("GraphQL error:", error);
    setError(error.message || "Failed to generate graph");
    setIsLoading(false);
    isProcessingRef.current = false;
  }, []);

  const [generateGraph, { loading: generatingGraph }] = useLazyQuery(
    GENERATE_GRAPH,
    {
      onCompleted: handleGraphGenerated,
      onError: handleGraphError,
    },
  );

  // Process file when current file changes or on initial load
  useEffect(() => {
    if (!currentFile) {
      setIsLoading(false);
      return;
    }

    // If we have graph data, use it
    if (currentFile.graphData && !graphData) {
      setGraphData(currentFile.graphData);
      setIsLoading(false);
      hasInitializedRef.current = true;

      // Notify that graph data is already available
      notifyGraphGenerationComplete();
    }
    // Otherwise we need to generate it
    else if (
      !currentFile.graphData &&
      !isProcessingRef.current &&
      !hasInitializedRef.current
    ) {
      processFile(currentFile);
      hasInitializedRef.current = true;
    }
  }, [currentFile, graphData, notifyGraphGenerationComplete]);

  // Function to process a file and generate a graph
  const processFile = useCallback(
    (file: any) => {
      if (!file || !file.content) return;

      // Skip if already processing
      if (isProcessingRef.current) return;

      // Mark as processing
      isProcessingRef.current = true;
      setIsLoading(true);

      try {
        // Parse the first line of the CSV to get column names
        const lines = file.content.split("\n");
        if (lines.length > 0) {
          const headerLine = lines[0].trim();
          const columnNames = headerLine
            .split(",")
            .map((col: string) => col.trim().replace(/^"|"$/g, ""));

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
        setError("Failed to extract column names from CSV");
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    },
    [generateGraph],
  );

  const handleRetry = () => {
    if (currentFile) {
      setError(null);
      setIsLoading(true);
      isProcessingRef.current = false;
      processFile(currentFile);
    }
  };

  return (
    <BaseGraphView
      graphData={graphData}
      isLoading={isLoading || generatingGraph}
      error={error}
      continuePath={fileId ? `/csv/${fileId}/import` : undefined}
      continueText="Continue to Import"
      onRetry={handleRetry}
      loadingMessage="Identifying entities and relationships from your CSV structure..."
      emptyStateMessage="Upload a CSV file to visualize it as a knowledge graph."
      itemName={currentFile?.name}
    />
  );
};

export default GraphView;
