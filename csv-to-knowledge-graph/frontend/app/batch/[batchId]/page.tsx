'use client';

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, ExternalLink, Loader } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useBatchStore } from '@/store/batch';

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { selectBatch, currentBatch } = useBatchStore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Track if the graph is being generated or is complete
  const [graphProcessing, setGraphProcessing] = useState<boolean>(false);

  // Check if graph data is already available
  const isGraphDataAvailable = currentBatch?.graphData !== null && currentBatch?.graphData !== undefined;

  useEffect(() => {
    if (batchId) {
      setIsLoading(true);
      selectBatch(batchId);
      setIsLoading(false);
    }
  }, [batchId, selectBatch]);

  // Listen for the graph-generation-complete event
  useEffect(() => {
    // Initially set processing state based on graph data existence
    setGraphProcessing(!isGraphDataAvailable);

    // Handler for the custom event
    const handleGraphComplete = (event: CustomEvent) => {
      // Only respond if this is about our current batch
      if (event.detail && event.detail.batchId === batchId) {
        // Use a small delay to avoid visual glitches
        setTimeout(() => {
          setGraphProcessing(false);
        }, 300);
      }
    };

    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('graph-generation-complete', handleGraphComplete as EventListener);

      // Also listen for the start of graph generation
      window.addEventListener('graph-generation-start', ((event: CustomEvent) => {
        if (event.detail && event.detail.batchId === batchId) {
          setGraphProcessing(true);
        }
      }) as EventListener);
    }

    // Clean up function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('graph-generation-complete', handleGraphComplete as EventListener);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        window.removeEventListener('graph-generation-start', ((_event: CustomEvent) => {}) as EventListener);
      }
    };
  }, [batchId, isGraphDataAvailable]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading batch...</p>
        </div>
      </div>
    );
  }

  if (!currentBatch) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading batch...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 14rem)' }}>
      {/* Batch info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{currentBatch.name}</h1>
        {currentBatch.description && <p className="text-gray-400">{currentBatch.description}</p>}
        <div className="text-sm text-gray-500 mt-2">
          Created {new Date(currentBatch.timestamp).toLocaleDateString()} • {currentBatch.files.length} files
        </div>
      </div>

      {/* Files list */}
      <h2 className="text-xl font-bold mb-4 flex items-center">
        Files in this Batch
        {graphProcessing && (
          <span className="ml-3 text-sm text-purple-400 flex items-center bg-purple-900/20 px-3 py-1 rounded border border-purple-800/40">
            <Loader className="h-3 w-3 text-purple-400 animate-spin mr-2" />
            Generating Graph...
          </span>
        )}
      </h2>

      <div className="space-y-4">
        {currentBatch.files.length > 0 ? (
          currentBatch.files.map((file) => (
            <div
              key={file.id}
              className={`bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-4 ${graphProcessing ? 'batch-file-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded flex items-center justify-center bg-[#333] mr-3">
                    {graphProcessing ? (
                      <Loader className="h-5 w-5 text-purple-400 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-medium ${graphProcessing ? 'batch-text-pulse' : 'text-white'}`}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-gray-500">{new Date(file.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    href={`/csv/${file.id}/spreadsheet`}
                    className="px-3 py-1 bg-[#333] text-gray-300 text-sm rounded hover:bg-[#444] flex items-center"
                  >
                    Table View
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                  <Link
                    href={`/csv/${file.id}/graph`}
                    className="px-3 py-1 bg-[#333] text-gray-300 text-sm rounded hover:bg-[#444] flex items-center"
                  >
                    Graph View
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                  <Link
                    href={`/csv/${file.id}/import`}
                    className={`px-3 py-1 ${graphProcessing ? 'bg-[#333] text-gray-500 cursor-not-allowed' : 'bg-[#333] text-gray-300 hover:bg-[#444]'} text-sm rounded flex items-center`}
                    onClick={(e) => {
                      if (graphProcessing) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Import
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg">
            <p className="text-gray-400">No files in this batch yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Add files from the home page to create a combined knowledge graph.
            </p>
          </div>
        )}
      </div>

      {/* Animation styles */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes filePulse {
          0% {
            border-color: #2a2a2a;
          }
          50% {
            border-color: #9333ea;
          }
          100% {
            border-color: #2a2a2a;
          }
        }

        @keyframes textPulse {
          0% {
            color: #ffffff;
          }
          50% {
            color: #9333ea;
          }
          100% {
            color: #ffffff;
          }
        }

        .batch-file-pulse {
          animation-name: filePulse;
          animation-duration: 2.5s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }

        .batch-text-pulse {
          animation-name: textPulse;
          animation-duration: 2.5s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
