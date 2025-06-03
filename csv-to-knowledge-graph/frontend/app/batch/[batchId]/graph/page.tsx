'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useBatchStore } from '@/store/batch';
import { useLazyQuery } from '@apollo/client';
import { GENERATE_BATCH_GRAPH } from '@/app/queries';
import BaseGraphView from '@/components/graph/BaseGraphView';

export default function BatchGraphView() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, setBatchGraphData } = useBatchStore();
  const currentBatch = batches.find((batch) => batch.id === batchId);

  const [graphData, setGraphData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processStatus, setProcessStatus] = useState<string>('Analyzing batch files...');

  const isProcessingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const [generateBatchGraph] = useLazyQuery(GENERATE_BATCH_GRAPH, {
    onCompleted: (data) => {
      if (data && data.generateBatchGraph) {
        try {
          const parsedData = JSON.parse(data.generateBatchGraph);

          // Update both the batch store and local state
          if (currentBatch) {
            setBatchGraphData(parsedData);
          }

          setGraphData(parsedData);
          setError(null);
          isProcessingRef.current = false;
          setIsLoading(false);
          setProcessStatus('Knowledge graph generated successfully');

          // Dispatch completion event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('graph-generation-complete', {
                detail: { batchId },
              }),
            );
          }
        } catch (err) {
          console.error('Error parsing graph data:', err);
          setError('Failed to parse batch graph data');
          isProcessingRef.current = false;
          setIsLoading(false);

          // Dispatch error event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('graph-generation-error', {
                detail: { batchId, error: 'Failed to parse batch graph data' },
              }),
            );
          }
        }
      }
    },
    onError: (error) => {
      console.error('GraphQL error:', error);
      setError(error.message || 'Failed to generate batch graph');
      isProcessingRef.current = false;
      setIsLoading(false);

      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('graph-generation-error', {
            detail: { batchId, error: error.message || 'Failed to generate batch graph' },
          }),
        );
      }
    },
  });

  // Handle initialization and batch processing
  useEffect(() => {
    // Skip if already initialized or if no batch
    if (hasInitializedRef.current || !currentBatch) {
      setIsLoading(false);
      return;
    }

    // Skip if no files in batch
    if (currentBatch.files.length === 0) {
      hasInitializedRef.current = true;
      setIsLoading(false);
      return;
    }

    // If we already have graph data in the batch, use it
    if (currentBatch.graphData) {
      setGraphData(currentBatch.graphData);
      hasInitializedRef.current = true;
      setIsLoading(false);

      // Dispatch completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('graph-generation-complete', {
            detail: { batchId },
          }),
        );
      }
      return;
    }

    // If there's no graph data and we're not already processing, start processing
    if (!currentBatch.graphData && !isProcessingRef.current) {
      processBatch(currentBatch);
      hasInitializedRef.current = true;

      // Dispatch start event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('graph-generation-start', {
            detail: { batchId },
          }),
        );
      }
    }
  }, [currentBatch, batchId]);

  // Function to process a batch and generate a graph
  const processBatch = (batch: any) => {
    if (!batch || batch.files.length === 0) {
      setIsLoading(false);
      return;
    }

    // Skip if already processing
    if (isProcessingRef.current) return;

    // Mark as processing
    isProcessingRef.current = true;
    setIsLoading(true);
    setProcessStatus('Analyzing batch files...');

    // Dispatch start event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('graph-generation-start', {
          detail: { batchId },
        }),
      );
    }

    try {
      // Extract column names from all CSV files
      const columnNamesMatrix = batch.files.map((file: any) => {
        if (!file.content) return [];

        // Parse the first line of the CSV to get column names
        const lines = file.content.split('\n');
        if (lines.length > 0) {
          const headerLine = lines[0].trim();
          return headerLine.split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));
        }
        return [];
      });

      // Filter out empty arrays
      const validColumnNamesMatrix = columnNamesMatrix.filter((cols: string[]) => cols.length > 0);

      if (validColumnNamesMatrix.length > 0) {
        setProcessStatus('Generating unified knowledge graph...');

        // Now generate the batch graph
        generateBatchGraph({
          variables: {
            columnNamesMatrix: validColumnNamesMatrix,
          },
        });
      } else {
        setError('No valid CSV headers found in batch files');
        isProcessingRef.current = false;
        setIsLoading(false);

        // Dispatch error event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('graph-generation-error', {
              detail: { batchId, error: 'No valid CSV headers found in batch files' },
            }),
          );
        }
      }
    } catch (err) {
      console.error('Error extracting column names:', err);
      setError('Failed to extract column names from CSV files');
      isProcessingRef.current = false;
      setIsLoading(false);

      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('graph-generation-error', {
            detail: { batchId, error: 'Failed to extract column names from CSV files' },
          }),
        );
      }
    }
  };

  // Retry graph generation
  const handleRetry = () => {
    if (currentBatch) {
      setError(null);
      setIsLoading(true);
      isProcessingRef.current = false;
      processBatch(currentBatch);
    }
  };

  return (
    <BaseGraphView
      graphData={graphData}
      isLoading={isLoading}
      error={error}
      continuePath={batchId ? `/batch/${batchId}/import` : undefined}
      continueText="Continue to Import"
      onRetry={handleRetry}
      loadingMessage={processStatus}
      emptyStateMessage={
        !currentBatch
          ? 'This batch could not be found or has been deleted.'
          : currentBatch.files.length === 0
            ? 'Add some CSV files to this batch to generate a unified knowledge graph.'
            : 'Generating unified knowledge graph...'
      }
      isBatch={true}
      itemName={currentBatch?.name}
    />
  );
}
