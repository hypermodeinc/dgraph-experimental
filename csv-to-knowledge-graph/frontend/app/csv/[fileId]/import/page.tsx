"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useCSVStore } from "@/store/csv";
import {
  useImport,
  ImportHeader,
  DataSummary,
  ConnectionWarning,
  ImportProgress,
  ImportResults,
  ImportItem,
  AdvancedOptions,
  RdfPreview,
} from "@/components/import/utils";
import { Database, Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function CSVImportPage() {
  const router = useRouter();
  const { fileId } = useParams<{ fileId: string }>();
  const { csvFiles, setRdfTemplate, setRdfData } = useCSVStore();
  const currentFile = csvFiles.find((file) => file.id === fileId);

  // Define handlers before passing to hook
  const handleBack = () => {
    router.back();
  };

  const handleNextToQueries = () => {
    if (fileId) {
      router.push(`/csv/${fileId}/query`);
    }
  };

  // Handlers for saving generated data
  const handleSaveRdfTemplate = (template: string) => {
    setRdfTemplate(template);
  };

  const handleSaveRdfData = (data: string) => {
    setRdfData(data);
  };

  // Use the shared import hook with the current file
  const {
    isImporting,
    importProgress,
    importStatus,
    importResult,
    importPhase,
    isConnected,
    downloadSuccess,
    handleImportToDgraph,
    downloadContent,
    navigateToQuery,
    isGeneratingTemplate,
    isGeneratingData,
    generateTemplateOnly,
    generateDataOnly,
    showAdvancedOptions,
    toggleAdvancedOptions,
    showRdfPreview,
    toggleRdfPreview,
    getPreviewContent,
    copyToClipboard,
  } = useImport(
    currentFile as ImportItem,
    false,
    handleSaveRdfTemplate,
    handleSaveRdfData,
  );

  // If file not found or doesn't have content yet, redirect back or show appropriate message
  if (!currentFile) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading CSV data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-[#121212] text-white overflow-hidden"
      style={{ minHeight: "calc(100vh - 11rem)" }}
    >
      <div className="flex-1 overflow-auto">
        <div className="h-full px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <ImportHeader
              title="Import to Dgraph"
              description="Import your CSV data into Dgraph to create a queryable knowledge graph"
              onBack={handleBack}
              onNextToQueries={handleNextToQueries}
              itemName={currentFile.name}
            />

            {/* Data Summary */}
            <DataSummary currentItem={currentFile} isBatch={false} />

            {/* Connection warning */}
            {!isConnected && <ConnectionWarning />}

            {/* Main Import Section - Primary focus */}
            <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] p-6 mb-8">
              <h2 className="text-lg font-medium text-white mb-4">
                Import to Dgraph
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Click the Import button to process your CSV data and import it
                into Dgraph in one step. This will automatically generate the
                necessary RDF template and data.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleImportToDgraph}
                  disabled={isImporting || !isConnected}
                  className={`inline-flex items-center px-6 py-3 rounded-md text-base font-medium ${
                    isImporting || !isConnected
                      ? "bg-purple-900/50 text-purple-300/70 cursor-not-allowed"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  } shadow-lg transition-all duration-200`}
                  title={
                    !isConnected
                      ? "You need to connect to Dgraph first using the sidebar"
                      : "Import data to Dgraph"
                  }
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5 mr-2" />
                      Import to Dgraph
                    </>
                  )}
                </button>

                {currentFile?.rdfData && (
                  <button
                    onClick={handleNextToQueries}
                    className="inline-flex items-center px-4 py-2 bg-[#333] text-gray-300 border border-[#444] rounded-md hover:bg-[#444]"
                  >
                    Skip to Queries
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Warning message */}
              {!isConnected && (
                <div className="mt-4 px-3 py-2 bg-yellow-900/20 border border-yellow-800/40 rounded-md text-sm text-yellow-300 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  You need to connect to Dgraph first using the sidebar
                </div>
              )}
            </div>

            {/* Advanced Options Section */}
            <AdvancedOptions
              showAdvancedOptions={showAdvancedOptions}
              toggleAdvancedOptions={toggleAdvancedOptions}
              currentItem={currentFile}
              downloadContent={downloadContent}
              downloadSuccess={downloadSuccess}
              onGenerateTemplate={generateTemplateOnly}
              onGenerateData={generateDataOnly}
              isGeneratingTemplate={isGeneratingTemplate}
              isGeneratingData={isGeneratingData}
            />

            {/* RDF Data Preview */}
            {currentFile?.rdfData && (
              <RdfPreview
                currentItem={currentFile}
                showRdfPreview={showRdfPreview}
                toggleRdfPreview={toggleRdfPreview}
                getPreviewContent={getPreviewContent}
                copyToClipboard={copyToClipboard}
              />
            )}

            {/* Import Progress */}
            <ImportProgress
              isImporting={isImporting}
              importStatus={importStatus}
              importProgress={importProgress}
              importPhase={importPhase}
            />

            {/* Import Results */}
            <ImportResults
              importResult={importResult}
              onNextToQueries={navigateToQuery}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
