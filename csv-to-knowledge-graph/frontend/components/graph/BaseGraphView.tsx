import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Network, AlertCircle, ArrowRight } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

export interface BaseGraphViewProps {
  // Required props
  graphData: any;
  isLoading: boolean;
  error: string | null;

  // Navigation props
  continuePath?: string;
  continueText?: string;

  // Callbacks
  onRetry?: () => void;
  onGraphGenerated?: (data: any) => void;

  // Custom content
  loadingMessage?: string;
  errorMessage?: string;
  emptyStateMessage?: string;

  // Flag to indicate if this is for a batch or a single file
  isBatch?: boolean;
  itemName?: string;
}

export const BaseGraphView: React.FC<BaseGraphViewProps> = ({
  graphData,
  isLoading,
  error,
  continuePath,
  continueText = 'Continue to Import',
  onRetry,
  onGraphGenerated,
  loadingMessage = 'Processing data...',
  errorMessage,
  emptyStateMessage = 'No data available',
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewState, setViewState] = useState<'loading' | 'error' | 'graph' | 'empty'>('loading');

  // Update view state based on props
  useEffect(() => {
    if (error) {
      setViewState('error');
    } else if (graphData) {
      setViewState('graph');
      if (onGraphGenerated) {
        onGraphGenerated(graphData);
      }
    } else if (isLoading) {
      setViewState('loading');
    } else {
      setViewState('empty');
    }
  }, [error, graphData, isLoading, onGraphGenerated]);

  const toggleFullscreen = (): void => {
    setIsFullscreen(!isFullscreen);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Render based on the current view state
  const renderContent = () => {
    switch (viewState) {
      case 'empty':
        return (
          <div
            className="w-full h-full flex items-center justify-center bg-[#1c1c1c]"
            style={{ minHeight: 'calc(100vh - 11rem)' }}
          >
            <div className="text-center p-6">
              <Network className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Data Available</h3>
              <p className="text-gray-500 max-w-md">{emptyStateMessage}</p>
            </div>
          </div>
        );

      case 'loading':
        return (
          <div
            className="w-full h-full flex flex-col items-center justify-center bg-[#1c1c1c]"
            style={{ minHeight: 'calc(100vh - 11rem)' }}
          >
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-purple-500 mb-4 mx-auto"></div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">Processing Data</h3>
              <p className="text-gray-500 max-w-md">{loadingMessage}</p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div
            className="w-full h-full flex items-center justify-center bg-[#1c1c1c]"
            style={{ minHeight: 'calc(100vh - 11rem)' }}
          >
            <div className="text-center p-6">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Could Not Generate Graph</h3>
              <p className="text-gray-500 max-w-md mb-6">
                {errorMessage ||
                  error ||
                  'There was a problem analyzing your data. Please ensure your data is properly formatted.'}
              </p>
              {onRetry && (
                <button onClick={handleRetry} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  Try Again
                </button>
              )}
            </div>
          </div>
        );

      case 'graph':
        return (
          <div
            className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#121212] p-4' : 'relative'} h-full w-full overflow-hidden`}
            style={{ minHeight: 'calc(100vh - 11rem)' }}
          >
            <div className="relative bg-[#1c1c1c] h-full w-full overflow-hidden">
              <KnowledgeGraph graphData={graphData} height="100%" width="100%" />

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className={`${
                  isFullscreen ? 'absolute top-6 right-6 z-10' : 'absolute bottom-4 right-4'
                } bg-[#282828] text-gray-300 rounded-full p-2 shadow-md hover:bg-[#333] hover:text-white`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>

              {/* Continue to Import button */}
              {!isFullscreen && continuePath && (
                <Link
                  href={continuePath}
                  className="absolute bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-purple-700 shadow-lg"
                >
                  {continueText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        );

      default:
        return <div className="p-8 text-white">Unknown state</div>;
    }
  };

  return (
    <div className="w-full h-full overflow-hidden" style={{ minHeight: 'calc(100vh - 11rem)' }}>
      {renderContent()}
    </div>
  );
};

export default BaseGraphView;
