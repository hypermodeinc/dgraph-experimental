'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CSVFileData } from './csv';

export interface BatchData {
  id: string;
  name: string;
  description?: string;
  files: CSVFileData[];
  timestamp: number;
  // Additional batch-specific fields
  graphData?: any;
  rdfData?: string;
  rdfTemplate?: string;
}

interface BatchStoreContextType {
  batches: BatchData[];
  currentBatch: BatchData | null;
  selectBatch: (id: string) => void;
  clearCurrentBatch: () => void;
  addBatch: (name: string, files: CSVFileData[], description?: string) => BatchData;
  addFileToBatch: (batchId: string, file: CSVFileData) => void;
  removeFileFromBatch: (batchId: string, fileId: string) => void;
  removeBatch: (id: string) => void;
  clearAllBatches: () => void;
  isLoading: boolean;
  // Graph data storage
  setBatchGraphData: (graphData: any) => void;
  // RDF data storage
  setBatchRdfData: (rdfData: string) => void;
  // RDF template storage
  setBatchRdfTemplate: (rdfTemplate: string) => void;
}

const BatchStoreContext = createContext<BatchStoreContextType | undefined>(undefined);

export function BatchStoreProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [currentBatch, setCurrentBatch] = useState<BatchData | null>(null);
  const [isLoading] = useState<boolean>(false);

  const initRef = useRef(false);
  const processedBatchesRef = useRef(new Set<string>());

  useEffect(() => {
    if (initRef.current) return;

    const storedBatches = localStorage.getItem('batches');
    if (storedBatches) {
      try {
        const parsedBatches = JSON.parse(storedBatches);
        setBatches(parsedBatches);
      } catch (error) {
        console.error('Failed to parse batches from localStorage:', error);
        localStorage.removeItem('batches');
      }
    }

    initRef.current = true;
  }, []);

  // Update localStorage whenever batches changes
  useEffect(() => {
    if (!initRef.current) return;
    localStorage.setItem('batches', JSON.stringify(batches));
  }, [batches]);

  // Add a new batch
  const addBatch = useCallback((name: string, files: CSVFileData[], description?: string): BatchData => {
    // Generate a unique ID
    const id = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create new batch data object
    const newBatch: BatchData = {
      id,
      name,
      description,
      files,
      timestamp: Date.now(),
      graphData: null,
      rdfData: undefined,
      rdfTemplate: undefined,
    };

    // Update state with the new batch
    setBatches((prevBatches) => {
      // Remove any existing batch with the same name to avoid duplicates
      const filteredBatches = prevBatches.filter((b) => b.name !== name);
      return [newBatch, ...filteredBatches].slice(0, 10); // Limit to 10 most recent batches
    });

    setCurrentBatch(newBatch);
    return newBatch;
  }, []);

  // Add a file to an existing batch
  const addFileToBatch = useCallback(
    (batchId: string, file: CSVFileData) => {
      setBatches((prevBatches) =>
        prevBatches.map((batch) => {
          if (batch.id === batchId) {
            // Check if file already exists in the batch
            const fileExists = batch.files.some((f) => f.id === file.id);
            if (!fileExists) {
              return {
                ...batch,
                files: [...batch.files, file],
              };
            }
          }
          return batch;
        }),
      );

      // Also update currentBatch state if it's the active batch
      if (currentBatch && currentBatch.id === batchId) {
        setCurrentBatch((prev) => {
          if (prev) {
            const fileExists = prev.files.some((f) => f.id === file.id);
            if (!fileExists) {
              return {
                ...prev,
                files: [...prev.files, file],
              };
            }
          }
          return prev;
        });
      }
    },
    [currentBatch],
  );

  // Remove a file from a batch
  const removeFileFromBatch = useCallback(
    (batchId: string, fileId: string) => {
      setBatches((prevBatches) =>
        prevBatches.map((batch) => {
          if (batch.id === batchId) {
            return {
              ...batch,
              files: batch.files.filter((file) => file.id !== fileId),
            };
          }
          return batch;
        }),
      );

      // Also update currentBatch state if it's the active batch
      if (currentBatch && currentBatch.id === batchId) {
        setCurrentBatch((prev) => {
          if (prev) {
            return {
              ...prev,
              files: prev.files.filter((file) => file.id !== fileId),
            };
          }
          return prev;
        });
      }
    },
    [currentBatch],
  );

  const selectBatch = useCallback(
    (id: string) => {
      const batch = batches.find((b) => b.id === id);
      if (batch) {
        setCurrentBatch(batch);
      }
    },
    [batches],
  );

  // Update graph data for the current batch
  const setBatchGraphData = useCallback(
    (graphData: any) => {
      if (currentBatch) {
        // Update the current batch with the new graph data
        setBatches((prevBatches) =>
          prevBatches.map((batch) => {
            if (batch.id === currentBatch.id) {
              return { ...batch, graphData };
            }
            return batch;
          }),
        );

        // Also update currentBatch state
        setCurrentBatch((prev) => {
          if (prev && prev.id === currentBatch.id) {
            return { ...prev, graphData };
          }
          return prev;
        });
      }
    },
    [currentBatch],
  );

  // Update RDF data for the current batch
  const setBatchRdfData = useCallback(
    (rdfData: string) => {
      if (currentBatch) {
        // Update the current batch with the new RDF data
        setBatches((prevBatches) =>
          prevBatches.map((batch) => {
            if (batch.id === currentBatch.id) {
              return { ...batch, rdfData };
            }
            return batch;
          }),
        );

        // Also update currentBatch state
        setCurrentBatch((prev) => {
          if (prev && prev.id === currentBatch.id) {
            return { ...prev, rdfData };
          }
          return prev;
        });
      }
    },
    [currentBatch],
  );

  // Update RDF template for the current batch
  const setBatchRdfTemplate = useCallback(
    (rdfTemplate: string) => {
      if (currentBatch) {
        // Update the current batch with the new RDF template
        setBatches((prevBatches) =>
          prevBatches.map((batch) => {
            if (batch.id === currentBatch.id) {
              return { ...batch, rdfTemplate };
            }
            return batch;
          }),
        );

        // Also update currentBatch state
        setCurrentBatch((prev) => {
          if (prev && prev.id === currentBatch.id) {
            return { ...prev, rdfTemplate };
          }
          return prev;
        });
      }
    },
    [currentBatch],
  );

  const clearCurrentBatch = useCallback(() => {
    setCurrentBatch(null);
  }, []);

  const removeBatch = useCallback(
    (id: string) => {
      setBatches((prevBatches) => prevBatches.filter((b) => b.id !== id));

      processedBatchesRef.current.delete(id);

      if (currentBatch && currentBatch.id === id) {
        setCurrentBatch(null);
      }
    },
    [batches, currentBatch],
  );

  const clearAllBatches = useCallback(() => {
    setBatches([]);
    setCurrentBatch(null);
    localStorage.removeItem('batches');
    processedBatchesRef.current.clear(); // Clear processed batches tracking
  }, []);

  const value = {
    batches,
    currentBatch,
    addBatch,
    selectBatch,
    clearCurrentBatch,
    removeBatch,
    clearAllBatches,
    isLoading,
    addFileToBatch,
    removeFileFromBatch,
    // Graph data storage
    setBatchGraphData,
    // RDF data storage
    setBatchRdfData,
    setBatchRdfTemplate,
  };

  return <BatchStoreContext.Provider value={value}>{children}</BatchStoreContext.Provider>;
}

// Custom hook to use the batch store
export function useBatchStore() {
  const context = useContext(BatchStoreContext);
  if (context === undefined) {
    throw new Error('useBatchStore must be used within a BatchStoreProvider');
  }
  return context;
}
