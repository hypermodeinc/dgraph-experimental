import React, { useState } from "react";
import {
  ChevronRight,
  Upload,
  CheckCircle,
  AlertCircle,
  Copy,
  Database,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { importRdfToDgraph } from "@hypermode/csvkit-rdf-to-dgraph";
import CodeHighlighter from "@/components/CodeHighlighter";
import { useConnectionStore } from "@/store/connection";

export interface FileItem {
  id: string;
  name: string;
  rdfData?: string;
}

interface DgraphImportStepProps {
  currentItem: FileItem;
  onNextToQueries: () => void;
  isBatch?: boolean;
}

export default function DgraphImportStep({
  currentItem,
  onNextToQueries,
  isBatch = false,
}: DgraphImportStepProps) {
  // Use the connection store for all connection related data
  const { dgraphUrl, dgraphApiKey, isConnected } = useConnectionStore();

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [showRdfPreview, setShowRdfPreview] = useState(false);

  const handleSkipToQueries = () => {
    // Proceed to queries page
    onNextToQueries();
  };

  const handleImportToDgraph = async () => {
    if (!currentItem?.rdfData) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);
    setImportStatus(`Starting ${isBatch ? "batch " : ""}import process...`);

    try {
      // Create the import options - use the connection string directly
      // The library will handle parsing dgraph:// URLs internally
      // Create the import options
      const options = {
        onProgress: (progress: any) => {
          setImportProgress(progress);
        },
        onStatusChange: (status: any) => setImportStatus(status),
      };

      // For dgraph:// URLs, apiKey is included in the URL
      // For HTTP URLs, we need to pass credentials directly
      const result = await importRdfToDgraph(
        currentItem.rdfData,
        dgraphUrl.startsWith("dgraph://")
          ? dgraphUrl
          : { url: dgraphUrl, apiKey: dgraphApiKey },
        options,
      );

      setImportResult(result);
      setImportProgress(100);
    } catch (error) {
      const e = error as Error;
      setImportStatus(`Import failed: ${e.message}`);
      setImportResult({
        success: false,
        message: e.message || "Import failed with unknown error",
        stats: null,
      });
      setImportProgress(100);
    } finally {
      setIsImporting(false);
    }
  };

  const getRdfTripleCount = () => {
    if (!currentItem?.rdfData) return 0;
    return currentItem.rdfData
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#")).length;
  };

  const getPreviewContent = (content: string, maxLines: number = 20) => {
    const lines = content.split("\n");
    return (
      lines.slice(0, maxLines).join("\n") +
      (lines.length > maxLines ? "\n..." : "")
    );
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // You could add a toast notification here
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Import to Dgraph</h1>
            <p className="mt-1 text-sm text-gray-400">
              Import the generated RDF data into your Dgraph instance
            </p>
          </div>

          {/* Skip to Queries button in header */}
          <button
            onClick={handleSkipToQueries}
            className="inline-flex items-center px-4 py-2 bg-[#333] border border-[#444] rounded-md text-gray-300 hover:bg-[#444]"
          >
            Skip to Queries
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Data preview section */}
      {currentItem?.rdfData && (
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
                    onClick={() => setShowRdfPreview(!showRdfPreview)}
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
                    <div className="text-sm font-medium text-gray-300">
                      Source
                    </div>
                    <div className="text-sm text-gray-400">
                      {currentItem.name}
                    </div>
                  </div>
                  <div className="bg-[#222] p-3 rounded border border-[#333]">
                    <div className="text-sm font-medium text-gray-300">
                      Triples
                    </div>
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
      )}

      {/* Connection status info banner */}
      {!isConnected && (
        <div className="mb-8 p-4 bg-yellow-900/20 border-l-4 border-yellow-600 text-yellow-300">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Connect to Dgraph using the sidebar before importing data.</p>
          </div>
        </div>
      )}

      {/* Import button section */}
      <div className="bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] p-6 mb-8">
        <h2 className="text-lg font-medium text-white mb-4">Import Data</h2>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleImportToDgraph}
            disabled={isImporting || !isConnected || !currentItem?.rdfData}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              isImporting || !isConnected || !currentItem?.rdfData
                ? "bg-purple-900/50 text-purple-300/70 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import to Dgraph
              </>
            )}
          </button>

          {/* Skip to Queries button (duplicate for convenience) */}
          <button
            onClick={handleSkipToQueries}
            className="inline-flex items-center px-4 py-2 bg-[#333] border border-[#444] rounded-md text-gray-300 hover:bg-[#444]"
          >
            Skip to Queries
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Import Progress */}
      {isImporting && (
        <div className="bg-[#1c1c1c] shadow rounded-lg border border-[#2a2a2a] p-6 mb-8">
          <h2 className="text-lg font-medium text-white mb-4">
            Import Progress
          </h2>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-300 mb-1">
              <span>
                {importStatus ||
                  `Importing ${isBatch ? "batch " : ""}RDF data to Dgraph...`}
              </span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full bg-[#333] rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
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
      )}

      {/* Help section */}
      <div className="mt-8 p-6 bg-blue-900/20 border border-blue-800/40 rounded-lg">
        <h3 className="text-sm font-medium text-blue-300 mb-2">
          Using this page
        </h3>
        <ul className="text-sm text-blue-200 space-y-1 list-disc pl-5">
          <li>
            Make sure your Dgraph instance is running and connected via the
            sidebar
          </li>
          <li>
            The "Import to Dgraph" button will send your RDF data to Dgraph
          </li>
          <li>
            If you just want to see example queries without importing, use "Skip
            to Queries"
          </li>
          <li>
            After import completes, you'll be able to explore your data with
            queries
          </li>
        </ul>
      </div>
    </div>
  );
}
