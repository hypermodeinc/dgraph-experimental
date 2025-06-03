"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBatchStore } from "@/store/batch";
import {
  useQuery,
  SchemaStatus,
  QueryError,
  LoadingState,
  EmptyState,
  QueryList,
  QueryDetail,
  QueryLayout,
} from "@/components/query/utils";

export default function BatchQueryPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, currentBatch, selectBatch } = useBatchStore();

  // Find the current batch either from store or by batchId
  const batchToUse =
    currentBatch || batches.find((batch) => batch.id === batchId);

  // Use the shared query hook
  const {
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
    nodeTypes,
    handleSchemaRefresh,
    handleRefreshQueries,
    copyToClipboard,
    getRatelUrl,
  } = useQuery(batchToUse || { id: "", name: "" }, true); // true for isBatch

  // Load the current batch when component mounts
  useEffect(() => {
    if (batchId) {
      selectBatch(batchId);
    }
  }, [batchId, selectBatch]);

  // If batch not found, show error message
  if (!batchToUse) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Batch not found...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryLayout currentItem={batchToUse} isBatch={true}>
      {/* Schema Status */}
      <SchemaStatus
        isConnected={isConnected}
        hasValidNodeTypes={hasValidNodeTypes}
        nodeTypes={nodeTypes}
        isFetching={isFetching}
        isSchemaRefreshing={isSchemaRefreshing}
        handleSchemaRefresh={handleSchemaRefresh}
      />

      {/* Query Error display */}
      <QueryError
        queryError={queryError}
        isSchemaRefreshing={isSchemaRefreshing}
        handleSchemaRefresh={handleSchemaRefresh}
      />

      {/* Loading state */}
      <LoadingState
        isGenerating={isGenerating}
        loading={loading}
        isFetching={isFetching}
        isSchemaRefreshing={isSchemaRefreshing}
        queries={queries}
      />

      {/* Empty state - when connected but no queries yet */}
      <EmptyState
        isConnected={isConnected}
        queryError={queryError}
        isGenerating={isGenerating}
        loading={loading}
        isFetching={isFetching}
        isSchemaRefreshing={isSchemaRefreshing}
        queries={queries}
        handleSchemaRefresh={handleSchemaRefresh}
      />

      {/* Queries Section - Only showing when there are queries */}
      {queries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Query List */}
          <div className="md:col-span-1">
            <QueryList
              queries={queries}
              selectedQuery={selectedQuery}
              setSelectedQuery={setSelectedQuery}
              isRefreshing={isRefreshing}
              isGenerating={isGenerating}
              handleRefreshQueries={handleRefreshQueries}
            />
          </div>

          {/* Query Detail */}
          <div className="md:col-span-2">
            <QueryDetail
              queries={queries}
              selectedQuery={selectedQuery}
              copySuccess={copySuccess}
              copyToClipboard={copyToClipboard}
              getRatelUrl={getRatelUrl}
            />
          </div>
        </div>
      )}
    </QueryLayout>
  );
}
