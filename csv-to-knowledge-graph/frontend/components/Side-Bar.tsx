import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Trash2,
  Folder,
  Settings,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useCSVStore } from "@/store/csv";
import { useBatchStore } from "@/store/batch";
import { useConnectionStore } from "@/store/connection";
import DgraphConnection from "@/components/import/DgraphConnection";

export default function SideBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { csvFiles, removeCSVFile } = useCSVStore();
  const { batches, removeBatch, clearCurrentBatch } = useBatchStore();

  // Use the connection store for all connection related functionality
  const {
    dgraphUrl,
    dgraphApiKey,
    setDgraphUrl,
    setDgraphApiKey,
    isConnected,
    isFetching,
    nodeTypes,
    fetchNodeTypes,
    fetchSchema,
    isInitialized,
    lastConnectionTime,
    schema,
    connectionError,
  } = useConnectionStore();

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  // Keep track of polling independently
  const [isPolling, setIsPolling] = useState(false);

  // Connection status is represented as a traffic light indicator
  const connectionStatus = useMemo(() => {
    if (isFetching) return "loading";
    if (connectionError) return "error";
    if (isConnected) return "connected";
    return "disconnected";
  }, [isConnected, isFetching, connectionError]);

  // Connection status color
  const connectionStatusColor = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-400";
      case "disconnected":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      case "loading":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  }, [connectionStatus]);

  // Format the last connection time
  const formattedLastConnectionTime = useMemo(() => {
    if (!lastConnectionTime) return null;

    try {
      // Get the date
      const date = new Date(lastConnectionTime);

      // Format it user-friendly
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch (error) {
      console.error("Error formatting last connection time:", error);
      return null;
    }
  }, [lastConnectionTime]);

  const isBatchActive = (batchId: string) =>
    pathname.includes(`/batch/${batchId}`);

  // Start polling when connected
  useEffect(() => {
    if (isConnected && !isPolling) {
      // Set up polling every 60 seconds (increased to reduce requests)
      const pollInterval = setInterval(() => {
        if (isConnected && !isFetching) {
          fetchNodeTypes();
        }
      }, 60000);

      setIsPolling(true);

      // Clean up on unmount
      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }

    // No cleanup needed when not polling
  }, [isConnected, isFetching]); // Removed fetchNodeTypes to prevent re-subscribing

  const handleDeleteBatch = (e: React.MouseEvent, batch: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (
      window.confirm(`Are you sure you want to delete "${batch.name}" batch?`)
    ) {
      if (batch.files.length > 0) {
        const deleteFiles = window.confirm(
          `Do you also want to delete all ${batch.files.length} files associated with this batch?`,
        );

        if (deleteFiles) {
          // Delete all associated files
          batch.files.forEach((file: any) => {
            removeCSVFile(file.id);
          });
        }
      }

      removeBatch(batch.id);
      clearCurrentBatch();

      if (isBatchActive(batch.id)) {
        router.push("/");
      }
    }
  };

  const handleUrlChange = (url: string) => {
    // Use connection store for state management
    setDgraphUrl(url);
  };

  const handleApiKeyChange = (apiKey: string) => {
    // Use connection store for state management
    setDgraphApiKey(apiKey);
  };

  const handleConnectionChange = (connected: boolean) => {
    // Connection status is handled by the connection store now
    if (connected) {
      // Show success message
      setConnectionSuccess(true);
    }
  };

  // Manual refresh both schema and node types
  const handleRefreshConnection = useCallback(() => {
    if (!isFetching) {
      fetchSchema().then(() => fetchNodeTypes());
    }
  }, [fetchSchema, fetchNodeTypes, isFetching]);

  // Connection modal toggle
  const toggleConnectionModal = () => {
    setShowConnectionModal(!showConnectionModal);
  };

  // If not initialized yet, show a loading indicator
  if (!isInitialized) {
    return (
      <div className="bg-[#1c1c1c] text-white flex flex-col w-[20rem] border-r border-[#2a2a2a] relative">
        <div className="flex justify-center items-center h-full">
          <Loader className="h-8 w-8 text-purple-500 animate-spin" />
          <span className="ml-2 text-gray-300">Loading connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1c1c1c] text-white flex flex-col w-[20rem] border-r border-[#2a2a2a] relative">
      {/* Project selector */}
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center">
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className="w-8 h-8 rounded flex items-center justify-center bg-purple-600 text-white">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium truncate">
              csv-to-knowledge-graph
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        {/* Connection status */}
        <div
          className="mb-6 p-3 rounded-md bg-[#222] border border-[#333] cursor-pointer hover:bg-[#282828]"
          onClick={toggleConnectionModal}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <img
                src="/dgraph-logomark.svg"
                alt="Dgraph Logo"
                className="h-5 w-5 mr-2"
              />
              <span className="text-sm font-medium">Dgraph Connection</span>
            </div>
            <Settings className="h-4 w-4 text-gray-500 hover:text-gray-300" />
          </div>

          <div className="flex items-center mt-1">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "disconnected"
                    ? "bg-yellow-500"
                    : connectionStatus === "error"
                      ? "bg-red-500"
                      : "bg-gray-500 animate-pulse"
              }`}
            />

            {isFetching ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-purple-500 mr-1"></div>
                <span className="text-sm text-gray-400">Connecting...</span>
              </div>
            ) : (
              <span className={`text-sm ${connectionStatusColor}`}>
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "disconnected"
                    ? "Not Connected"
                    : connectionStatus === "error"
                      ? "Connection Error"
                      : "Checking..."}
              </span>
            )}

            {connectionError && (
              <span
                className="ml-2 text-xs text-red-400 truncate max-w-36"
                title={connectionError}
              >
                {connectionError}
              </span>
            )}
          </div>

          {isConnected && formattedLastConnectionTime && (
            <div className="text-xs text-gray-500 mt-1">
              Last connected: {formattedLastConnectionTime}
            </div>
          )}

          {isConnected && dgraphUrl && (
            <div
              className="text-xs text-gray-500 mt-1 truncate"
              title={dgraphUrl}
            >
              URL: {dgraphUrl}
            </div>
          )}
        </div>

        {/* Schema node types section - only shown when connected */}
        {isConnected && (
          <div className="mb-6">
            <div className="px-2 mb-3 text-gray-400 text-xs uppercase tracking-wider font-medium flex justify-between items-center">
              <span>GRAPH SCHEMA</span>
              <button
                onClick={handleRefreshConnection}
                className="text-xs flex items-center text-gray-500 hover:text-purple-400"
                disabled={isFetching}
                title="Refresh schema"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <div className="p-3 bg-[#222] rounded-lg border border-[#333] mb-2">
              {isFetching ? (
                <div className="py-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500 mr-2"></div>
                  <span className="text-sm text-gray-400">
                    Loading schema...
                  </span>
                </div>
              ) : nodeTypes.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {nodeTypes.slice(0, 6).map((type) => (
                      <div
                        key={type.name}
                        className="px-2 py-1 bg-purple-900/20 border border-purple-800/40 rounded-full text-xs truncate max-w-full"
                        title={`${type.name}: ${type.count} nodes`}
                      >
                        <span className="font-medium text-purple-300">
                          {type.name}
                        </span>
                        <span className="ml-1 text-purple-400">
                          ({type.count})
                        </span>
                      </div>
                    ))}
                  </div>
                  {nodeTypes.length > 6 && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      +{nodeTypes.length - 6} more types
                    </div>
                  )}
                </>
              ) : schema ? (
                <div className="py-2 text-center text-sm text-gray-400">
                  Schema available but no node types found
                </div>
              ) : (
                <div className="py-2 text-center text-sm text-gray-400">
                  No schema data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div className="mb-6">
          <div className="px-2 mb-3 text-gray-400 text-xs uppercase tracking-wider font-medium flex justify-between items-center">
            <span>CSV FILES</span>
            {csvFiles.length > 0 && (
              <span className="text-xs bg-[#333] px-2 py-0.5 rounded-full">
                {csvFiles.length}
              </span>
            )}
          </div>

          {csvFiles.length > 0 ? (
            <div className="space-y-2">
              {csvFiles.map((file) => (
                <Link
                  href={`/csv/${file.id}/spreadsheet`}
                  key={file.id}
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-[#282828] ${
                    pathname.includes(`/csv/${file.id}`)
                      ? "bg-[#282828] border-l-2 border-purple-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center overflow-hidden">
                    <FileSpreadsheet className="h-4 w-4 text-gray-400 min-w-4" />
                    <span className="ml-2 text-sm text-gray-300 truncate">
                      {file.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(`Delete "${file.name}"?`)) {
                        removeCSVFile(file.id);
                      }
                    }}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-center py-3 text-gray-500">
              No CSV files uploaded yet
            </div>
          )}
        </div>

        {/* Batches Section */}
        <div>
          <div className="px-2 mb-3 text-gray-400 text-xs uppercase tracking-wider font-medium flex justify-between items-center">
            <span>BATCHES</span>
            {batches.length > 0 && (
              <span className="text-xs bg-[#333] px-2 py-0.5 rounded-full">
                {batches.length}
              </span>
            )}
          </div>

          {batches.length > 0 ? (
            <div className="space-y-2">
              {batches.map((batch) => (
                <Link
                  href={`/batch/${batch.id}`}
                  key={batch.id}
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-[#282828] ${
                    isBatchActive(batch.id)
                      ? "bg-[#282828] border-l-2 border-purple-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center overflow-hidden">
                    <Folder className="h-4 w-4 text-gray-400 min-w-4" />
                    <div className="ml-2 overflow-hidden">
                      <span className="text-sm text-gray-300 truncate block">
                        {batch.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate block">
                        {batch.files.length} files
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBatch(e, batch)}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-center py-3 text-gray-500">
              No batches created yet
            </div>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1c] rounded-lg shadow-lg border border-[#2a2a2a] max-w-2xl w-full mx-4 p-6">
            <h2 className="text-xl font-medium text-white mb-4">
              Dgraph Connection Settings
            </h2>
            <DgraphConnection
              initialUrl={dgraphUrl}
              initialApiKey={dgraphApiKey}
              onUrlChange={handleUrlChange}
              onApiKeyChange={handleApiKeyChange}
              onConnectionChange={handleConnectionChange}
              className="mb-4"
            />
            <div className="flex justify-end mt-6">
              <div className="flex space-x-3">
                {connectionSuccess && (
                  <div className="flex items-center bg-green-900/20 text-green-400 px-4 py-2 rounded-md border border-green-800/40">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Connection successful!
                  </div>
                )}
                {connectionError && (
                  <div className="flex items-center bg-red-900/20 text-red-400 px-4 py-2 rounded-md border border-red-800/40">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {connectionError}
                  </div>
                )}
                <button
                  onClick={toggleConnectionModal}
                  className="px-4 py-2 bg-[#333] text-gray-300 border border-[#444] rounded-md hover:bg-[#444]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center">
        <a
          href="https://hypermode.com"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <img src="/hypermode-white.svg" alt="Hypermode" className="h-6" />
        </a>
      </div>
    </div>
  );
}
