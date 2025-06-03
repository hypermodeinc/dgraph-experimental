'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCSVStore } from '@/store/csv';
import { GraphView } from '@/components/graph/GraphView';

export default function GraphPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const { csvFiles, selectCSVFile } = useCSVStore();
  const currentFile = csvFiles.find((file) => file.id === fileId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always select the file based on URL parameter when the component mounts or fileId changes
    if (fileId && currentFile) {
      selectCSVFile(fileId);
      setIsLoading(false);
    } else if (fileId && csvFiles.length > 0) {
      // If currentFile is not found but we have csvFiles, try to find and select it
      const file = csvFiles.find((f) => f.id === fileId);
      if (file) {
        selectCSVFile(file.id);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [fileId, csvFiles, currentFile, selectCSVFile]);

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CSV data...</p>
        </div>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="mt-4 text-gray-600">CSV file not found. Please return to the home page and select a file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ minHeight: '600px' }}>
      <GraphView />
    </div>
  );
}
