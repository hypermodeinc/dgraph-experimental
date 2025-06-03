"use client";

import React, { useState, useCallback } from "react";
import {
  ArrowUpRight,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { importRdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import {
  createCsvToRdf,
  processBatchToRDF,
} from "@hypermode/csvkit-csv-to-rdf";
import { useConnectionStore } from "@/store/connection";
import { useLazyQuery } from "@apollo/client";
import {
  GENERATE_RDF_TEMPLATE,
  GENERATE_BATCH_RDF_TEMPLATE,
} from "@/app/queries";
import CodeHighlighter from "@/components/CodeHighlighter";

export interface ImportItem {
  id: string;
  name: string;
  content?: string;
  files?: any[];
  rdfData?: string;
  rdfTemplate?: string;
  graphData?: any;
  timestamp?: number;
}

export interface ImportStepProps {
  currentItem: ImportItem;
  onBack: () => void;
  onNextToQueries: () => void;
  isBatch?: boolean;
  onSaveRdfTemplate?: (template: string) => void;
  onSaveRdfData?: (data: string) => void;
  navigateToQuery?: () => void;
}

export const useImport = (
  currentItem: ImportItem,
  isBatch: boolean = false,
  onSaveRdfTemplate?: (template: string) => void,
  onSaveRdfData?: (data: string) => void,
) => {
  // Use the connection store for all connection related data
  const { dgraphUrl, dgraphApiKey, isConnected } = useConnectionStore();

  // Import process states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [importPhase, setImportPhase] = useState<
    "template" | "rdf" | "import" | "complete" | null
  >(null);

  // Advanced options states
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showRdfPreview, setShowRdfPreview] = useState(false);

  // Updated to use record for different success states
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({
    data: false,
    template: false,
  });

  const [downloadSuccess, setDownloadSuccess] = useState<
    Record<string, boolean>
  >({
    data: false,
    template: false,
  });

  const [isGeneratingTemplate, setIsGeneratingTemplate] =
    useState<boolean>(false);
  const [isGeneratingData, setIsGeneratingData] = useState<boolean>(false);

  // Setup GraphQL queries for template generation
  const [generateSingleRDFTemplate] = useLazyQuery(GENERATE_RDF_TEMPLATE, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.generateRDFTemplate) {
        // Handled by the template generation function
      }
    },
    onError: (error) => {
      console.error("Error in RDF template generation query:", error);
    },
  });

  const [generateBatchRDFTemplate] = useLazyQuery(GENERATE_BATCH_RDF_TEMPLATE, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.generateBatchRDFTemplate) {
        // Handled by the template generation function
      }
    },
    onError: (error) => {
      console.error("Error in batch RDF template generation query:", error);
    },
  });

  const generateRdfTemplate = async (): Promise<string> => {
    setImportPhase("template");
    setImportStatus("Preparing RDF template...");
    setImportProgress(10);

    try {
      // For this unified import flow, we'll check if we already have a template
      if (currentItem.rdfTemplate) {
        setImportProgress(30);
        return currentItem.rdfTemplate;
      }

      // If we don't have a template but have graphData, we should generate one
      if (currentItem.graphData) {
        setImportStatus("Generating RDF template from graph data...");

        // Create the appropriate variables for the API call
        const graphDataStr =
          typeof currentItem.graphData === "string"
            ? currentItem.graphData
            : JSON.stringify(currentItem.graphData);

        setImportProgress(20);

        let template = "";

        if (isBatch) {
          // For batch imports, we need to extract column names from all files
          if (!currentItem.files || currentItem.files.length === 0) {
            throw new Error("No files found in batch for template generation.");
          }

          // Extract column names matrix from all files in the batch
          const columnNamesMatrix = currentItem.files.map((file) => {
            if (!file.content) return [];

            // Parse the first line of the CSV to get column names
            const lines = file.content.split("\n");
            if (lines.length > 0) {
              const headerLine = lines[0].trim();
              return headerLine
                .split(",")
                .map((col: string) => col.trim().replace(/^"|"$/g, ""));
            }
            return [];
          });

          // Filter out empty arrays
          const validColumnNamesMatrix = columnNamesMatrix.filter(
            (cols) => cols.length > 0,
          );

          // Call the batch template generation API
          try {
            const result = await generateBatchRDFTemplate({
              variables: {
                graphJson: graphDataStr,
                fileColumnNamesMatrix: validColumnNamesMatrix,
              },
            });

            if (result.data?.generateBatchRDFTemplate) {
              template = result.data.generateBatchRDFTemplate;
            } else {
              throw new Error(
                "No template returned from batch template generation.",
              );
            }
          } catch (error) {
            console.error("Error in batch template generation:", error);
            throw error;
          }
        } else {
          // For single file generation
          try {
            const result = await generateSingleRDFTemplate({
              variables: {
                graphJson: graphDataStr,
              },
            });

            if (result.data?.generateRDFTemplate) {
              template = result.data.generateRDFTemplate;
            } else {
              throw new Error("No template returned from template generation.");
            }
          } catch (error) {
            console.error("Error in single file template generation:", error);
            throw error;
          }
        }

        setImportProgress(30);
        return template;
      } else {
        // No graph data, so we need to inform the user
        throw new Error(
          "No graph data available. Please visit the Graph view first to generate graph data.",
        );
      }
    } catch (error) {
      console.error("Template generation error:", error);
      throw error;
    }
  };

  const generateRdfData = async (template: string): Promise<string> => {
    setImportPhase("rdf");
    setImportStatus("Converting data to RDF format...");
    setImportProgress(40);

    try {
      // For this unified flow, we'll check if we already have RDF data
      if (currentItem.rdfData) {
        setImportProgress(60);
        return currentItem.rdfData;
      }

      // Check if we have a template to work with
      if (!template) {
        throw new Error("No RDF template available to generate RDF data.");
      }

      // Generate RDF data using your existing packages
      if (isBatch) {
        if (!currentItem.files || currentItem.files.length === 0) {
          throw new Error("No files found in batch for RDF generation.");
        }

        setImportStatus(
          `Converting ${currentItem.files.length} files to RDF format...`,
        );

        // Use processBatchToRDF from the imported package
        try {
          const rdfData = await processBatchToRDF(currentItem.files, template, {
            onProgress: (progress) => {
              setImportProgress(40 + Math.floor(progress * 0.2));
            },
            onStatusChange: (status) => {
              setImportStatus(status);
            },
          });

          setImportProgress(60);
          return rdfData;
        } catch (error) {
          console.error("Error in batch RDF generation:", error);
          throw error;
        }
      } else {
        // For single file imports
        if (!currentItem.content) {
          throw new Error("No CSV content found for RDF generation.");
        }

        setImportStatus("Converting CSV to RDF format...");

        // Use createCsvToRdf from the imported package
        try {
          const converter = createCsvToRdf(template, {
            onProgress: (progress) => {
              setImportProgress(40 + Math.floor(progress * 0.2));
            },
          });

          const rdfData = await converter.processCSVString(currentItem.content);
          setImportProgress(60);
          return rdfData;
        } catch (error) {
          console.error("Error in CSV to RDF conversion:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("RDF generation error:", error);
      throw error;
    }
  };

  const importRdfToDatabase = async (rdfData: string): Promise<any> => {
    setImportPhase("import");
    setImportStatus("Importing data to Dgraph...");
    setImportProgress(70);

    try {
      // Create the import options
      const options = {
        onProgress: (progress: any) => {
          // Map the progress to our 70-100% range
          setImportProgress(70 + progress * 0.3);
        },
        onStatusChange: (status: any) => setImportStatus(status),
      };

      // For dgraph:// URLs, apiKey is included in the URL
      // For HTTP URLs, we need to pass credentials directly
      const result = await importRdfToDgraph(
        rdfData,
        dgraphUrl.startsWith("dgraph://")
          ? dgraphUrl
          : { url: dgraphUrl, apiKey: dgraphApiKey },
        options,
      );

      setImportPhase("complete");
      setImportProgress(100);
      return result;
    } catch (error) {
      const e = error as Error;
      setImportProgress(100);
      throw e;
    }
  };

  const handleImportToDgraph = async () => {
    if (!currentItem) return;

    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);
      setImportStatus(`Starting ${isBatch ? "batch " : ""}import process...`);

      // Step 1: Generate or get RDF template
      let template;
      try {
        template = await generateRdfTemplate();
        if (!template) {
          throw new Error(
            "No RDF template available. Please generate an RDF template first.",
          );
        }

        // Save the generated template if it's new
        if (template !== currentItem.rdfTemplate && onSaveRdfTemplate) {
          onSaveRdfTemplate(template);
        }
      } catch (error) {
        console.error("Template generation error:", error);
        throw new Error(
          `Template generation failed: ${(error as Error).message}`,
        );
      }

      // Step 2: Generate or get RDF data
      let rdfData;
      try {
        rdfData = await generateRdfData(template);
        if (!rdfData) {
          throw new Error(
            "Failed to generate RDF data - no content was produced",
          );
        }

        // Save the generated RDF data if it's new
        if (rdfData !== currentItem.rdfData && onSaveRdfData) {
          onSaveRdfData(rdfData);
        }
      } catch (error) {
        console.error("RDF data generation error:", error);
        throw new Error(
          `RDF data generation failed: ${(error as Error).message}`,
        );
      }

      // Step 3: Import RDF data to Dgraph
      try {
        const result = await importRdfToDatabase(rdfData);
        setImportResult(result);
      } catch (error) {
        console.error("Dgraph import error:", error);
        throw new Error(`Dgraph import failed: ${(error as Error).message}`);
      }
    } catch (error) {
      console.error("Import process failed:", error);
      const e = error as Error;
      setImportStatus(`Import failed: ${e.message}`);
      setImportResult({
        success: false,
        message: e.message || "Import failed with unknown error",
        stats: null,
      });
    } finally {
      setImportProgress(100);
      setIsImporting(false);
      setImportPhase("complete");
    }
  };

  const getRdfTripleCount = (rdfData?: string) => {
    if (!rdfData) return 0;
    return rdfData
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#")).length;
  };

  const getPreviewContent = (content: string, maxLines: number = 20) => {
    if (!content) return "";
    const lines = content.split("\n");
    return (
      lines.slice(0, maxLines).join("\n") +
      (lines.length > maxLines ? "\n..." : "")
    );
  };

  // Updated copyToClipboard with type parameter for tracking different success states
  const copyToClipboard = (content: string, type: string = "data") => {
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
      setCopySuccess({ ...copySuccess, [type]: true });
      setTimeout(() => setCopySuccess({ ...copySuccess, [type]: false }), 2000);
    });
  };

  // Updated downloadContent with type parameter for tracking different success states
  const downloadContent = (
    content: string,
    filename: string,
    type: string = "text/turtle",
    successType: string = "data",
  ) => {
    if (!content) return;

    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setDownloadSuccess({ ...downloadSuccess, [successType]: true });
    setTimeout(
      () => setDownloadSuccess({ ...downloadSuccess, [successType]: false }),
      2000,
    );
  };

  const toggleRdfPreview = () => {
    setShowRdfPreview(!showRdfPreview);
  };

  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  // Navigate to query page
  const navigateToQuery = useCallback(() => {
    if (!currentItem) return;

    // Navigate to the appropriate query page based on whether this is a batch or single file
    if (isBatch) {
      window.location.href = `/batch/${currentItem.id}/query`;
    } else {
      window.location.href = `/csv/${currentItem.id}/query`;
    }
  }, [currentItem, isBatch]);

  const generateTemplateOnly = async (): Promise<void> => {
    if (!currentItem) return;

    setIsGeneratingTemplate(true);
    try {
      const template = await generateRdfTemplate();
      if (template && onSaveRdfTemplate) {
        onSaveRdfTemplate(template);
      }
    } catch (error) {
      console.error("Template generation error:", error);
      // You might want to add notification here
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const generateDataOnly = async (): Promise<void> => {
    if (!currentItem || !currentItem.rdfTemplate) return;

    setIsGeneratingData(true);
    try {
      const rdfData = await generateRdfData(currentItem.rdfTemplate);
      if (rdfData && onSaveRdfData) {
        onSaveRdfData(rdfData);
      }
    } catch (error) {
      console.error("RDF data generation error:", error);
      // You might want to add notification here
    } finally {
      setIsGeneratingData(false);
    }
  };

  return {
    isImporting,
    importProgress,
    importStatus,
    importResult,
    importPhase,
    showRdfPreview,
    showAdvancedOptions,
    isConnected,
    copySuccess,
    downloadSuccess,
    handleImportToDgraph,
    getRdfTripleCount,
    getPreviewContent,
    copyToClipboard,
    downloadContent,
    toggleRdfPreview,
    toggleAdvancedOptions,
    navigateToQuery,
    generateDataOnly,
    isGeneratingTemplate,
    isGeneratingData,
    generateTemplateOnly,
  };
};

export const ImportHeader = ({
  title,
  description,
  onBack,
  onNextToQueries,
  itemName,
}: {
  title: string;
  description: string;
  onBack: () => void;
  onNextToQueries: () => void;
  itemName?: string;
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
        {itemName && (
          <p className="mt-1 text-sm text-purple-400 font-medium">{itemName}</p>
        )}
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-[#333] text-gray-300 text-sm rounded hover:bg-[#444]"
        >
          Back
        </button>
        <button
          onClick={onNextToQueries}
          className="px-3 py-1.5 bg-[#333] text-gray-300 text-sm rounded hover:bg-[#444]"
        >
          Skip to Queries →
        </button>
      </div>
    </div>
  </div>
);

export const DataSummary = ({
  currentItem,
  isBatch,
}: {
  currentItem: ImportItem;
  isBatch: boolean;
}) => (
  <div className="mb-6 bg-[#1c1c1c] rounded-lg overflow-hidden border border-[#2a2a2a]">
    <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#222]">
      <h3 className="text-sm font-medium text-white">
        {isBatch ? "Batch Information" : "Data Information"}
      </h3>
    </div>
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#222] p-3 rounded border border-[#333]">
          <div className="text-sm font-medium text-gray-300">Name</div>
          <div className="text-sm text-gray-400">{currentItem.name}</div>
        </div>
        {isBatch && currentItem.files && (
          <div className="bg-[#222] p-3 rounded border border-[#333]">
            <div className="text-sm font-medium text-gray-300">Files</div>
            <div className="text-sm text-gray-400">
              {currentItem.files.length} files
            </div>
          </div>
        )}
        <div className="bg-[#222] p-3 rounded border border-[#333]">
          <div className="text-sm font-medium text-gray-300">Type</div>
          <div className="text-sm text-gray-400">
            {isBatch ? "Batch Import" : "CSV Import"}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ConnectionWarning = () => (
  <div className="mb-8 p-4 bg-yellow-900/20 border-l-4 border-yellow-600 text-yellow-300">
    <div className="flex items-center">
      <AlertCircle className="h-5 w-5 mr-2" />
      <p>Connect to Dgraph using the sidebar before importing data.</p>
    </div>
  </div>
);

export const ImportProgress = ({
  isImporting,
  importStatus,
  importProgress,
  importPhase,
}: {
  isImporting: boolean;
  importStatus: string;
  importProgress: number;
  importPhase: "template" | "rdf" | "import" | "complete" | null;
}) => {
  if (!isImporting && importPhase !== "complete") return null;

  const isError =
    importStatus.toLowerCase().includes("failed") ||
    importStatus.toLowerCase().includes("error");

  const getPhaseIcon = () => {
    if (isError) return <AlertCircle className="h-5 w-5 text-red-400 mr-2" />;

    switch (importPhase) {
      case "template":
        return <FileText className="h-5 w-5 text-purple-400 mr-2" />;
      case "rdf":
        return <Database className="h-5 w-5 text-purple-400 mr-2" />;
      case "import":
        return <ArrowUpRight className="h-5 w-5 text-purple-400 mr-2" />;
      case "complete":
        return importStatus.toLowerCase().includes("failed") ? (
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
        );
      default:
        return (
          <Loader2 className="h-5 w-5 text-purple-400 mr-2 animate-spin" />
        );
    }
  };

  return (
    <div
      className={`bg-[#1c1c1c] shadow rounded-lg border border-[#2a2a2a] p-6 mb-8 ${
        isError ? "border-l-4 border-red-500" : ""
      }`}
    >
      <div className="flex items-center mb-4">
        {getPhaseIcon()}
        <h2 className="text-lg font-medium text-white">
          {isError
            ? "Import Error"
            : importPhase === "complete"
              ? "Import Complete"
              : "Import Progress"}
        </h2>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span className="flex items-center">
            <span
              className={
                isError
                  ? "text-red-400"
                  : importPhase === "complete"
                    ? "text-green-400"
                    : ""
              }
            >
              {importStatus}
            </span>
            {!isError && importPhase !== "complete" && (
              <Loader2 className="h-3 w-3 ml-2 animate-spin text-purple-400" />
            )}
          </span>
          <span>{importProgress}%</span>
        </div>
        <div className="w-full bg-[#333] rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              isError
                ? "bg-red-500"
                : importPhase === "complete"
                  ? "bg-green-500"
                  : "bg-purple-600"
            }`}
            style={{ width: `${importProgress}%` }}
          />
        </div>
      </div>

      {/* Phase indicators */}
      <div className="flex justify-between mt-4">
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              importPhase
                ? isError && importPhase === "template"
                  ? "bg-red-500"
                  : "bg-purple-600"
                : "bg-[#333]"
            }`}
          ></div>
          <span className="text-xs text-gray-400 mt-1">Prepare</span>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              importPhase === "rdf" ||
              importPhase === "import" ||
              importPhase === "complete"
                ? isError && importPhase === "rdf"
                  ? "bg-red-500"
                  : "bg-purple-600"
                : "bg-[#333]"
            }`}
          ></div>
          <span className="text-xs text-gray-400 mt-1">Convert</span>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              importPhase === "import" || importPhase === "complete"
                ? isError && importPhase === "import"
                  ? "bg-red-500"
                  : "bg-purple-600"
                : "bg-[#333]"
            }`}
          ></div>
          <span className="text-xs text-gray-400 mt-1">Import</span>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              importPhase === "complete"
                ? isError
                  ? "bg-red-500"
                  : "bg-green-500"
                : "bg-[#333]"
            }`}
          ></div>
          <span className="text-xs text-gray-400 mt-1">Complete</span>
        </div>
      </div>

      {/* Debug information for errors */}
      {isError && (
        <div className="mt-4 p-3 bg-red-900/20 rounded-md border border-red-800/40 text-sm text-red-300">
          <p className="font-medium mb-1">Error Details:</p>
          <p>{importStatus}</p>
          <p className="mt-3 text-xs text-red-400">
            Check the browser console for more detailed error information.
          </p>
        </div>
      )}
    </div>
  );
};

export const ImportResults = ({
  importResult,
  onNextToQueries,
}: {
  importResult: any;
  onNextToQueries: () => void;
}) => {
  if (!importResult) return null;

  return (
    <div
      className={`bg-[#1c1c1c] shadow rounded-lg border border-[#2a2a2a] p-6 ${
        importResult.success
          ? "border-l-4 border-green-500"
          : "border-l-4 border-red-500"
      }`}
    >
      <div className="flex items-center">
        {importResult.success ? (
          <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
        )}
        <h2 className="text-lg font-medium text-white">
          {importResult.success ? "Import Successful" : "Import Failed"}
        </h2>
      </div>

      <p className="mt-2 text-sm text-gray-300">{importResult.message}</p>

      {importResult.stats && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-[#222] p-4 rounded-md border border-[#333]">
            <div className="text-sm text-gray-400">Triples Processed</div>
            <div className="text-lg font-medium text-white">
              {importResult.stats.triplesProcessed}
            </div>
          </div>
          <div className="bg-[#222] p-4 rounded-md border border-[#333]">
            <div className="text-sm text-gray-400">Nodes Created</div>
            <div className="text-lg font-medium text-white">
              {importResult.stats.nodesCreated}
            </div>
          </div>
          <div className="bg-[#222] p-4 rounded-md border border-[#333]">
            <div className="text-sm text-gray-400">Edges Created</div>
            <div className="text-lg font-medium text-white">
              {importResult.stats.edgesCreated}
            </div>
          </div>
        </div>
      )}

      {importResult.success && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onNextToQueries}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Continue to Queries
            <ChevronRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const AdvancedOptions = ({
  showAdvancedOptions,
  toggleAdvancedOptions,
  currentItem,
  downloadContent,
  downloadSuccess,
  onGenerateTemplate,
  onGenerateData,
  isGeneratingTemplate,
  isGeneratingData,
}: {
  showAdvancedOptions: boolean;
  toggleAdvancedOptions: () => void;
  currentItem: ImportItem;
  downloadContent: (
    content: string,
    filename: string,
    type?: string,
    successType?: string,
  ) => void;
  downloadSuccess: Record<string, boolean>;
  onGenerateTemplate: () => Promise<void>;
  onGenerateData: () => Promise<void>;
  isGeneratingTemplate: boolean;
  isGeneratingData: boolean;
}) => {
  return (
    <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] mb-8">
      <button
        onClick={toggleAdvancedOptions}
        className="w-full px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center">
          <span className="text-lg font-medium text-white">
            Advanced Options
          </span>
          <span className="ml-3 text-xs bg-[#333] px-2.5 py-1 rounded-full text-gray-300">
            Optional
          </span>
        </div>
        {showAdvancedOptions ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {showAdvancedOptions && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-400 mb-4">
            These options allow you to generate and download individual
            components of the import process. You don't need these for the
            standard import flow.
          </p>

          {/* RDF Generation and Download Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
            {/* Template Generation Card */}
            <div className="bg-[#222] p-5 rounded-lg border border-[#333]">
              <div className="flex items-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-400 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"></path>
                  <path d="M14 12a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1 1 1 0 0 0-1 1v1a1 1 0 0 1-1 1"></path>
                </svg>
                <h3 className="text-md font-medium text-white">RDF Template</h3>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                Generate RDF template for all CSV data.
                {currentItem.rdfTemplate && (
                  <span className="block mt-1 text-xs text-green-400">
                    Template generated
                  </span>
                )}
              </p>

              <div className="flex space-x-3">
                {!currentItem.rdfTemplate ? (
                  <button
                    onClick={onGenerateTemplate}
                    disabled={isGeneratingTemplate}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md 
                      ${
                        isGeneratingTemplate
                          ? "bg-purple-900/50 text-purple-300/70 cursor-not-allowed"
                          : "text-white bg-purple-600 hover:bg-purple-700"
                      }`}
                  >
                    {isGeneratingTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 mr-1.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <path d="M12 18v-6"></path>
                          <path d="M9 15l3-3 3 3"></path>
                        </svg>
                        Generate Template
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      downloadContent(
                        currentItem.rdfTemplate || "",
                        `${currentItem.name.replace(/\s+/g, "-").replace(".csv", "")}-template.ttl`,
                        "text/turtle",
                        "template",
                      )
                    }
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    {downloadSuccess["template"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1.5 text-green-400" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 mr-1.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Template
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* RDF Data Generation Card */}
            <div className="bg-[#222] p-5 rounded-lg border border-[#333]">
              <div className="flex items-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-400 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h3 className="text-md font-medium text-white">RDF Data</h3>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                Complete RDF data in Turtle format generated from your CSV data.
                {currentItem.rdfData && (
                  <span className="block mt-1 text-xs text-green-400">
                    {currentItem.rdfData
                      ?.split("\n")
                      .filter((line) => line.trim() && !line.startsWith("#"))
                      .length || 0}{" "}
                    triples generated!
                  </span>
                )}
                {!currentItem.rdfTemplate && !isGeneratingTemplate && (
                  <span className="block mt-1 text-xs text-yellow-400">
                    Generate the template first
                  </span>
                )}
              </p>

              <div className="flex space-x-3">
                {!currentItem.rdfData ? (
                  <button
                    onClick={onGenerateData}
                    disabled={isGeneratingData || !currentItem.rdfTemplate}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md 
                      ${
                        isGeneratingData || !currentItem.rdfTemplate
                          ? "bg-purple-900/50 text-purple-300/70 cursor-not-allowed"
                          : "text-white bg-purple-600 hover:bg-purple-700"
                      }`}
                  >
                    {isGeneratingData ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 mr-1.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <path d="M12 18v-6"></path>
                          <path d="M9 15l3-3 3 3"></path>
                        </svg>
                        Generate RDF Data
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      downloadContent(
                        currentItem.rdfData || "",
                        `${currentItem.name.replace(/\s+/g, "-").replace(".csv", "")}-data.ttl`,
                        "text/turtle",
                        "data",
                      )
                    }
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    {downloadSuccess["data"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1.5 text-green-400" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 mr-1.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download RDF Data
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Note: For most users, the one-click import button above is all you
            need. These advanced options are for users who want to inspect or
            manually manipulate the RDF data.
          </p>
        </div>
      )}
    </div>
  );
};

export const RdfPreview = ({
  currentItem,
  showRdfPreview,
  toggleRdfPreview,
  getPreviewContent,
  copyToClipboard,
}: {
  currentItem: ImportItem;
  showRdfPreview: boolean;
  toggleRdfPreview: () => void;
  getPreviewContent: (content: string, maxLines?: number) => string;
  copyToClipboard: (content: string, type?: string) => void;
}) => {
  const getRdfTripleCount = () => {
    if (!currentItem?.rdfData) return 0;
    return currentItem.rdfData
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#")).length;
  };

  if (!currentItem?.rdfData) return null;

  return (
    <div className="mb-8">
      <div className="bg-[#1c1c1c] rounded-lg shadow-sm border border-[#2a2a2a]">
        <div className="border-b border-[#2a2a2a] px-4 py-3 bg-[#222]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-white">
                RDF Data Ready for Import
              </span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                {getRdfTripleCount()} triples
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleRdfPreview}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#333] border border-[#444] rounded hover:bg-[#444]"
              >
                {showRdfPreview ? "Hide Data" : "Preview Data"}
              </button>
              <button
                onClick={() => copyToClipboard(currentItem.rdfData || "")}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#333] border border-[#444] rounded hover:bg-[#444]"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </button>
            </div>
          </div>
        </div>

        {showRdfPreview && (
          <CodeHighlighter
            code={getPreviewContent(currentItem.rdfData)}
            language="turtle"
            maxHeight="300px"
          />
        )}

        {!showRdfPreview && (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#222] p-3 rounded border border-[#333]">
                <div className="text-sm font-medium text-gray-300">Source</div>
                <div className="text-sm text-gray-400">{currentItem.name}</div>
              </div>
              <div className="bg-[#222] p-3 rounded border border-[#333]">
                <div className="text-sm font-medium text-gray-300">Triples</div>
                <div className="text-sm text-gray-400">
                  {getRdfTripleCount()} statements
                </div>
              </div>
              <div className="bg-[#222] p-3 rounded border border-[#333]">
                <div className="text-sm font-medium text-gray-300">
                  RDF Format
                </div>
                <div className="text-sm text-gray-400">Turtle (.ttl)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
