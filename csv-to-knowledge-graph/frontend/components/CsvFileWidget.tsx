"use client";

import React, { useState } from "react";
import { Upload, FileText, X, ArrowRight, Plus } from "lucide-react";
import { useBatchStore } from "@/store/batch";
import { useRouter } from "next/navigation";

type CSVFileWidgetProps = {
  file: File | null;
  setFile: (file: File | null) => void;
  isLoading: boolean;
  processFile: (file: File) => Promise<any>;
  isDragging: boolean;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadError: string | null;
};

const CSVFileWidget: React.FC<CSVFileWidgetProps> = ({
  file,
  setFile,
  isLoading,
  processFile,
  isDragging,
  handleDragOver,
  handleDragLeave,
  uploadError,
}) => {
  const router = useRouter();
  const { addBatch } = useBatchStore();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      const allCSVs = fileList.every((file) =>
        file.name.toLowerCase().endsWith(".csv"),
      );

      if (!allCSVs) {
        alert("All files must be CSV files.");
        return;
      }

      const newFiles = [...selectedFiles, ...fileList];
      setSelectedFiles(newFiles);
      setIsBatchMode(newFiles.length > 1);

      if (newFiles.length === 1) {
        setFile(newFiles[0]);
      }
    }
  };

  const handleMultipleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);

      const allCSVs = fileList.every((file) =>
        file.name.toLowerCase().endsWith(".csv"),
      );

      if (!allCSVs) {
        alert("All files must be CSV files.");
        return;
      }

      const newFiles = [...selectedFiles, ...fileList];
      setSelectedFiles(newFiles);
      setIsBatchMode(newFiles.length > 1);

      if (newFiles.length === 1) {
        setFile(newFiles[0]);
      }
    }
  };

  // Add another file to the selection
  const handleAddMoreFiles = () => {
    // Trigger the file input click
    const fileInput = document.getElementById("file-upload-more");
    if (fileInput) {
      fileInput.click();
    }
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    setIsBatchMode(newFiles.length > 1);

    // If there's only one file left, update the single file mode
    if (newFiles.length === 1) {
      setFile(newFiles[0]);
    } else if (newFiles.length === 0) {
      setFile(null);
    }
  };

  const handleCreateBatch = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one CSV file.");
      return;
    }

    if (isBatchMode && !batchName.trim()) {
      alert("Please enter a batch name.");
      return;
    }

    try {
      // Process each file individually first
      const processedFiles = [];
      for (const file of selectedFiles) {
        const fileData = await processFile(file);
        if (fileData) {
          processedFiles.push(fileData);
        }
      }

      if (processedFiles.length === 0) {
        alert("Failed to process any files.");
        return;
      }

      // If in batch mode (multiple files), create a batch
      if (isBatchMode) {
        const batch = addBatch(batchName, processedFiles, batchDescription);

        // Reset form
        setSelectedFiles([]);
        setBatchName("");
        setBatchDescription("");
        setIsBatchMode(false);
        setFile(null);

        // Navigate to the batch
        router.push(`/batch/${batch.id}`);
      } else if (processedFiles.length === 1) {
        // If single file, just navigate to the file view
        router.push(`/csv/${processedFiles[0].id}/spreadsheet`);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      alert("An error occurred while processing the files.");
    }
  };

  // If there are files already selected, add them to our state
  React.useEffect(() => {
    if (file && selectedFiles.length === 0) {
      setSelectedFiles([file]);
    }
  }, [file]);

  return (
    <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Upload Files</h2>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-400 rounded">
          <p>{uploadError}</p>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-6 relative ${
          isDragging
            ? "border-purple-500 bg-purple-900/10 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
            : "border-[#333] hover:bg-[#222] hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(147,51,234,0.1)]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleMultipleFileDrop}
      >
        {/* Purple glow effect when dragging */}
        {isDragging && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              boxShadow: "0 0 25px rgba(147, 51, 234, 0.5)",
              zIndex: -1,
            }}
          ></div>
        )}

        <div className="mx-auto flex flex-col items-center">
          {selectedFiles.length === 0 ? (
            <>
              <Upload className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="mb-2 text-lg font-medium text-white">
                Drag and drop CSV files here
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Upload one or more CSV files (MAX. 10MB per file)
              </p>
              <input
                type="file"
                id="file-upload"
                accept=".csv"
                className="hidden"
                multiple
                onChange={handleMultipleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-purple-700 text-white text-sm font-medium rounded-md hover:bg-purple-600 cursor-pointer shadow-[0_0_10px_rgba(147,51,234,0.3)] hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]"
              >
                Select CSV files
              </label>
            </>
          ) : (
            <div className="w-full">
              <div className="flex flex-col space-y-6">
                {/* Selected files list */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-medium text-white">
                      {selectedFiles.length > 1
                        ? `${selectedFiles.length} Files Selected`
                        : "File Selected"}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setFile(null);
                        setIsBatchMode(false);
                        setBatchName("");
                        setBatchDescription("");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Always use 2-column grid layout */}
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="border border-[#333] rounded-lg bg-[#222] flex items-center p-2.5"
                      >
                        <div className="w-6 h-6 min-w-6 bg-[#333] rounded-lg flex items-center justify-center mr-2">
                          <FileText className="h-3 w-3 text-purple-400" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-medium text-white text-sm truncate">
                            {file.name}
                          </h4>
                          <p className="text-xs text-gray-400">
                            {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => removeSelectedFile(index)}
                          className="p-1 rounded-full hover:bg-[#333] ml-1"
                        >
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    ))}

                    {/* Add more files option - always at the end */}
                    <div
                      className="border border-[#333] border-dashed rounded-lg bg-[#222] flex items-center p-2.5 hover:bg-[#282828] cursor-pointer"
                      onClick={handleAddMoreFiles}
                    >
                      <div className="w-6 h-6 min-w-6 bg-[#333] rounded-lg flex items-center justify-center mr-2">
                        <Plus className="h-3 w-3 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm truncate">
                          Add another CSV file
                        </h4>
                        <p className="text-xs text-gray-400">Create a batch</p>
                      </div>
                      <input
                        type="file"
                        id="file-upload-more"
                        accept=".csv"
                        className="hidden"
                        multiple
                        onChange={handleMultipleFileChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Batch options - only show if multiple files are selected */}
                {isBatchMode && (
                  <div className="border border-[#333] rounded-lg p-4 bg-[#222]">
                    <h3 className="text-md font-medium text-white mb-3">
                      Batch Options
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Batch Name
                        </label>
                        <input
                          type="text"
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#333] border border-[#444] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Enter batch name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          value={batchDescription}
                          onChange={(e) => setBatchDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-[#333] border border-[#444] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          placeholder="Enter batch description"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Process button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleCreateBatch}
                    disabled={isLoading || (isBatchMode && !batchName.trim())}
                    className="inline-flex items-center px-4 py-2 bg-purple-700 text-white text-sm font-medium rounded-md hover:bg-purple-600 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(147,51,234,0.3)] hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Processing...
                      </>
                    ) : isBatchMode ? (
                      <>
                        Create Batch
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Process CSV
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVFileWidget;
