'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useBatchStore } from '@/store/batch';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function BatchSpreadsheetPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, selectBatch } = useBatchStore();

  const [isLoading, setIsLoading] = useState(true);

  const currentBatch = batches.find((batch) => batch.id === batchId);

  useEffect(() => {
    if (batchId) {
      selectBatch(batchId);
      setIsLoading(false);
    }
  }, [batchId, selectBatch]);

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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Batch Not Found</h3>
          <p className="text-gray-500 mb-4">The batch you're looking for doesn't exist or may have been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#121212] text-white overflow-hidden">
      <div className="border-b border-[#2a2a2a] bg-[#1c1c1c]">
        <div className="px-6 py-4">
          <div className="flex items-center">
            <FileSpreadsheet className="h-5 w-5 text-purple-400 mr-2" />
            <h1 className="text-xl font-medium text-white">Spreadsheet View - {currentBatch.name}</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full" style={{ minHeight: 'calc(100vh - 11rem)' }}>
        {/* This is where we'll render the combined spreadsheet view */}
        {/* For now, we'll just show a placeholder */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="bg-[#222] p-6 rounded-lg max-w-md">
            <FileSpreadsheet className="h-10 w-10 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white text-center mb-2">Multi-File Spreadsheet View</h3>
            <p className="text-gray-400 text-center mb-4">
              This feature is under development. Soon you'll be able to view and manage spreadsheet data from multiple
              CSV files.
            </p>
            <div className="p-4 bg-purple-900/20 border border-purple-800/40 rounded-lg">
              <p className="text-purple-300 text-sm">
                The combined view will let you browse and analyze data across all files in your batch.
              </p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 text-center">
                For now, you can view individual CSV files by clicking on them in the batch view.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
