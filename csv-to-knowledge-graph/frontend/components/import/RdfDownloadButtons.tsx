import React from 'react';
import { FileText, FileCode, Download, CheckCircle, Loader2 } from 'lucide-react';

interface RdfGenerationButtonsProps {
  currentItem: {
    id: string;
    name: string;
    rdfData?: string;
    rdfTemplate?: string;
    graphData?: any;
  };
  downloadContent: (content: string, filename: string, type?: string, successType?: string) => void;
  downloadSuccess: Record<string, boolean>;
  onGenerateTemplate: () => Promise<void>;
  onGenerateData: () => Promise<void>;
  isGeneratingTemplate: boolean;
  isGeneratingData: boolean;
}

export const RdfGenerationButtons: React.FC<RdfGenerationButtonsProps> = ({
  currentItem,
  downloadContent,
  downloadSuccess,
  onGenerateTemplate,
  onGenerateData,
  isGeneratingTemplate,
  isGeneratingData,
}) => {
  if (!currentItem) return null;

  // Create filenames for downloads
  const baseFilename = currentItem.name.replace(/\s+/g, '-').replace('.csv', '');
  const dataFilename = `${baseFilename}-data.ttl`;
  const templateFilename = `${baseFilename}-template.ttl`;

  // Check if we have RDF data or template
  const hasRdfData = !!currentItem?.rdfData;
  const hasRdfTemplate = !!currentItem?.rdfTemplate;
  const hasGraphData = !!currentItem?.graphData;

  // Check if buttons should be disabled
  const disableTemplateGeneration = isGeneratingTemplate || !hasGraphData;
  const disableDataGeneration = isGeneratingData || !hasGraphData || !hasRdfTemplate;

  return (
    <div className="mt-6 bg-[#1c1c1c] rounded-lg border border-[#2a2a2a] p-6 mb-8">
      <h2 className="text-lg font-medium text-white mb-4">Generate & Download RDF Files</h2>
      <p className="text-sm text-gray-400 mb-4">
        Generate and download RDF template and data files without importing to Dgraph. You can use these files with
        other tools or save them for later use.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Generation Card */}
        <div className="bg-[#222] p-5 rounded-lg border border-[#333]">
          <div className="flex items-center mb-3">
            <FileCode className="h-5 w-5 text-purple-400 mr-2" />
            <h3 className="text-md font-medium text-white">RDF Template</h3>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            The template defines how your CSV data is converted to a knowledge graph structure.
            {hasRdfTemplate && (
              <span className="block mt-1 text-xs text-green-400">Template generated successfully!</span>
            )}
          </p>

          <div className="flex space-x-3">
            {!hasRdfTemplate ? (
              <button
                onClick={onGenerateTemplate}
                disabled={disableTemplateGeneration}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md 
                  ${
                    disableTemplateGeneration
                      ? 'bg-purple-900/50 text-purple-300/70 cursor-not-allowed'
                      : 'text-white bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {isGeneratingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileCode className="w-4 h-4 mr-1.5" />
                    Generate Template
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() =>
                  downloadContent(currentItem.rdfTemplate || '', templateFilename, 'text/turtle', 'template')
                }
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                {downloadSuccess['template'] ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5 text-green-400" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1.5" />
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
            <FileText className="h-5 w-5 text-purple-400 mr-2" />
            <h3 className="text-md font-medium text-white">RDF Data</h3>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Complete RDF data in Turtle format generated from your CSV file.
            {hasRdfData && (
              <span className="block mt-1 text-xs text-green-400">
                {currentItem.rdfData?.split('\n').filter((line) => line.trim() && !line.startsWith('#')).length || 0}{' '}
                triples generated!
              </span>
            )}
            {!hasRdfTemplate && !isGeneratingTemplate && (
              <span className="block mt-1 text-xs text-yellow-400">Generate the template first</span>
            )}
          </p>

          <div className="flex space-x-3">
            {!hasRdfData ? (
              <button
                onClick={onGenerateData}
                disabled={disableDataGeneration}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md 
                  ${
                    disableDataGeneration
                      ? 'bg-purple-900/50 text-purple-300/70 cursor-not-allowed'
                      : 'text-white bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {isGeneratingData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1.5" />
                    Generate RDF Data
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => downloadContent(currentItem.rdfData || '', dataFilename, 'text/turtle', 'data')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                {downloadSuccess['data'] ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5 text-green-400" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1.5" />
                    Download RDF Data
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
