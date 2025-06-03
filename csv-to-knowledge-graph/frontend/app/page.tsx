'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCSVStore } from '@/store/csv';
import CSVFileWidget from '@/components/CsvFileWidget';
import ConnectionBanner from '@/components/ConnectionBanner';
import GraphBackground from '@/components/GraphBackground';
import { FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { csvFiles, addCSVFile, isLoading } = useCSVStore();
  const initRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, setConnectionStatus] = useState(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleConnectionChange = (isConnected: boolean) => {
    setConnectionStatus(isConnected);
  };

  const processFile = async (fileToProcess: File) => {
    if (!fileToProcess) {
      setUploadError('No file selected');
      return null;
    }

    try {
      // Make sure the file is a CSV
      if (!fileToProcess.name.toLowerCase().endsWith('.csv')) {
        setUploadError('Please upload a CSV file.');
        return null;
      }

      const fileData = await addCSVFile(fileToProcess);
      setFile(null); // Clear the file input after processing

      // Check that we have a valid file data object with an ID
      if (fileData && fileData.id) {
        return fileData;
      } else {
        throw new Error('Invalid file data returned');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError('Failed to process file. Please try again with a different CSV file.');
      return null;
    }
  };

  return (
    <>
      {/* Fixed graph background - imported as a separate component */}
      <GraphBackground />

      {/* Main content */}
      <div className="py-6 flex flex-col justify-center max-w-5xl mx-auto relative">
        {/* Main layout with two columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Left column - Getting Started (smaller) */}
          <div className="md:col-span-1">
            {/* Connection Banner */}
            <ConnectionBanner onConnectionChange={handleConnectionChange} />

            {/* Getting Started - Compact */}
            <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] mb-6 p-4">
              <h2 className="text-lg font-bold text-white mb-3">Getting Started</h2>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border-l-2 border-purple-500 bg-[#282828]">
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-600 text-white font-medium text-xs">
                      1
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-sm text-white">Upload CSV files</h3>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border-l-2 border-[#333] bg-[#222]">
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#333] text-gray-300 font-medium text-xs">
                      2
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-sm text-white">Review entities</h3>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border-l-2 border-[#333] bg-[#222]">
                  <div className="flex items-start">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#333] text-gray-300 font-medium text-xs">
                      3
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-sm text-white">Import to Dgraph</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent files section - Compact */}
            {csvFiles.length > 0 && (
              <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-white">Recent Files</h2>
                  <span className="text-xs bg-[#333] px-2 py-0.5 rounded-full text-gray-300">{csvFiles.length}</span>
                </div>

                <div className="space-y-2">
                  {csvFiles.slice(0, 3).map((fileData) => (
                    <Link key={fileData.id} href={`/csv/${fileData.id}/spreadsheet`} className="block">
                      <div className="p-2 border border-[#2a2a2a] rounded-lg bg-[#222] hover:bg-[#282828] cursor-pointer group">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-[#333] mr-2">
                            <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-medium text-sm text-white truncate">{fileData.name}</h3>
                            <p className="text-xs text-gray-500">{new Date(fileData.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Upload CSV (larger) */}
          <div className="md:col-span-2">
            <CSVFileWidget
              file={file}
              setFile={setFile}
              isLoading={isLoading}
              processFile={processFile}
              isDragging={isDragging}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleFileChange={handleFileChange}
              uploadError={uploadError}
            />
          </div>
        </div>
      </div>
    </>
  );
}
