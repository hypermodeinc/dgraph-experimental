'use client';

import React, { useState, useEffect } from 'react';
import { Key, Eye, Loader2, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { RdfToDgraph, parseDgraphUrl } from '@hypermode/csvkit-rdf-to-dgraph';

export interface DgraphConnectionProps {
  onConnectionChange?: (isConnected: boolean) => void;
  onSchemaFetched?: (schema: string) => void;
  onNodeTypesFetched?: (nodeTypes: Record<string, number>) => void;
  initialUrl?: string;
  initialApiKey?: string;
  disabled?: boolean;
  onUrlChange?: (url: string) => void;
  onApiKeyChange?: (apiKey: string) => void;
  className?: string;
}

export default function DgraphConnection({
  onConnectionChange,
  initialUrl,
  initialApiKey,
  disabled = false,
  onUrlChange,
  onApiKeyChange,
  className = '',
  onNodeTypesFetched,
  onSchemaFetched,
}: DgraphConnectionProps) {
  // Get connection state from the store
  const {
    dgraphUrl: storeDgraphUrl,
    dgraphApiKey: storeDgraphApiKey,
    setDgraphUrl: storeSetDgraphUrl,
    setDgraphApiKey: storeSetDgraphApiKey,
    isConnected: storeIsConnected,
    setSchema: storeSetSchema,
    setNodeTypes: storeSetNodeTypes,
    testConnection: storeTestConnection,
    fetchSchema,
    fetchNodeTypes,
    isFetching: storeIsFetching,
    connectionError,
    setConnectionError,
  } = useConnectionStore();

  // Use local state for component-specific items
  const [dgraphUrl, setDgraphUrl] = useState(initialUrl || storeDgraphUrl);
  const [dgraphApiKey, setDgraphApiKey] = useState(initialApiKey || storeDgraphApiKey);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isDroppingData, setIsDroppingData] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [dropSuccess, setDropSuccess] = useState(false);
  const [dropConfirmationOpen, setDropConfirmationOpen] = useState(false);
  const [effectiveUrl, setEffectiveUrl] = useState<string | null>(null);
  const [isHypermodeInstance, setIsHypermodeInstance] = useState(false);

  // Initialize component
  useEffect(() => {
    // When component mounts, check if there is a connection error from the store
    if (connectionError) {
      setConnectionStatus(connectionError);
      setStatusType('error');
    } else if (storeIsConnected) {
      setConnectionStatus('Connection successful! Your Dgraph instance is ready.');
      setStatusType('success');
    }

    // Ensure URL is properly set on component mount
    if (dgraphUrl) {
      // Process the URL to calculate the effective URL and instance type
      try {
        if (dgraphUrl.startsWith('dgraph://')) {
          const { url } = parseDgraphUrl(dgraphUrl);
          setEffectiveUrl(url);
          setIsHypermodeInstance(url.includes('hypermode.host'));
        } else {
          setEffectiveUrl(null);
          setIsHypermodeInstance(dgraphUrl.includes('hypermode.host'));
        }
      } catch (error) {
        console.error('Error parsing URL:', error);
        setEffectiveUrl(null);
        setIsHypermodeInstance(false);
      }
    }
  }, [connectionError, storeIsConnected, dgraphUrl]);

  // Handle URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setDgraphUrl(newUrl);

    // Clear any previous connection errors
    setConnectionError(null);
    setConnectionStatus(null);

    // Pass to parent component if provided
    if (onUrlChange) {
      onUrlChange(newUrl);
    }

    // Update the store
    storeSetDgraphUrl(newUrl);

    // Show the effective URL if it's a dgraph:// URL
    try {
      if (newUrl.startsWith('dgraph://')) {
        const { url } = parseDgraphUrl(newUrl);
        setEffectiveUrl(url);
        setIsHypermodeInstance(url.includes('hypermode.host'));
      } else {
        setEffectiveUrl(null);
        setIsHypermodeInstance(newUrl.includes('hypermode.host'));
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      setEffectiveUrl(null);
      setIsHypermodeInstance(false);
    }
  };

  // Handle API key change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setDgraphApiKey(newApiKey);

    // Clear any previous connection errors
    setConnectionError(null);
    setConnectionStatus(null);

    // Pass to parent component if provided
    if (onApiKeyChange) {
      onApiKeyChange(newApiKey);
    }

    // Update the store
    storeSetDgraphApiKey(newApiKey);
  };

  // Test connection function
  const handleTestConnection = async () => {
    // Ensure URL and API key are updated in the store before testing
    // This is important for the default localhost:8080 case
    storeSetDgraphUrl(dgraphUrl);
    storeSetDgraphApiKey(dgraphApiKey);

    setConnectionStatus('Testing connection...');
    setStatusType('info');

    try {
      // Use the store's test connection method
      const connected = await storeTestConnection();

      if (connected) {
        setConnectionStatus('Connection successful! Your Dgraph instance is ready.');
        setStatusType('success');

        // After successful connection, fetch schema and node types
        try {
          // Fetch schema
          const schemaData = await fetchSchema();

          // If callback is provided, also pass schema to parent
          if (onSchemaFetched && schemaData) {
            onSchemaFetched(schemaData);
          }

          // Fetch node types
          const nodeTypesWithCounts = await fetchNodeTypes();

          // If callback is provided, pass node types to parent
          if (onNodeTypesFetched && nodeTypesWithCounts) {
            onNodeTypesFetched(nodeTypesWithCounts);
          }
        } catch (error) {
          console.error('Error fetching schema or node types:', error);
          const errorMessage = (error as Error).message || 'Failed to fetch schema or node types';
          setConnectionStatus(`Connection successful, but ${errorMessage}`);
          setStatusType('warning');
        }

        // Notify parent component if provided
        if (onConnectionChange) {
          onConnectionChange(true);
        }
      } else {
        setConnectionStatus('Connection failed. Please check your URL and credentials.');
        setStatusType('error');

        // Notify parent component if provided
        if (onConnectionChange) {
          onConnectionChange(false);
        }
      }
    } catch (error) {
      const errorMsg = (error as Error).message || 'Unknown connection error';
      setConnectionStatus(`Connection error: ${errorMsg}`);
      setStatusType('error');
      setConnectionError(errorMsg);

      // Notify parent component if provided
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    }
  };

  // Handle drop data button click
  const handleDropData = () => {
    setDropConfirmationOpen(true);
  };

  // Confirm drop data
  const confirmDropData = async () => {
    setDropConfirmationOpen(false);
    setIsDroppingData(true);
    setConnectionStatus('Dropping all existing data from Dgraph...');
    setStatusType('warning');
    setDropSuccess(false);

    try {
      // Determine connection input type
      let connectionInput: string | { url?: string; apiKey?: string };

      if (dgraphUrl.startsWith('dgraph://')) {
        connectionInput = dgraphUrl;
      } else {
        connectionInput = {
          url: dgraphUrl,
          apiKey: dgraphApiKey || undefined,
        };
      }

      const rdfToDgraph = new RdfToDgraph(connectionInput);

      // Drop all data
      await rdfToDgraph.dropAllData();

      // Add a waiting period to ensure Dgraph has processed the drop
      setConnectionStatus('Waiting for drop operation to complete...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      setConnectionStatus('All data successfully dropped from Dgraph. You can now import your RDF data.');
      setStatusType('success');
      setDropSuccess(true);

      // Clear local schema and node types in the store
      storeSetSchema('');
      storeSetNodeTypes([]);
    } catch (error) {
      const e = error as Error;
      setConnectionStatus(`Failed to drop data: ${e.message}`);
      setStatusType('error');
      setConnectionError(e.message);
    } finally {
      setIsDroppingData(false);
    }
  };

  // Cancel drop data
  const cancelDropData = () => {
    setDropConfirmationOpen(false);
  };

  return (
    <div className={`bg-[#1c1c1c] shadow rounded-lg border border-[#2a2a2a] p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img src="/dgraph-logomark.svg" alt="Dgraph Logo" className="h-6 w-6 mr-2" />
          <h2 className="text-lg font-medium text-white">Dgraph Connection</h2>
        </div>
        {storeIsConnected && (
          <div className="px-2 py-1 bg-green-900/20 rounded-full border border-green-800/40 text-green-300 text-xs flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></div>
            Connected
          </div>
        )}
      </div>

      {/* Drop confirmation dialog */}
      {dropConfirmationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1c] rounded-lg shadow-lg border border-[#2a2a2a] max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-white mb-4">Drop All Data?</h3>
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <Trash2 className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-gray-300 font-medium">
                  This will permanently delete ALL data from your Dgraph database.
                </p>
              </div>
              <p className="text-gray-400">
                All nodes, edges, and schema definitions will be removed. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <button onClick={confirmDropData} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Yes, drop all data
              </button>
              <button
                onClick={cancelDropData}
                className="px-4 py-2 bg-[#333] text-gray-300 border border-[#444] rounded-md hover:bg-[#444]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Dgraph Connection String</label>
          <input
            type="text"
            value={dgraphUrl}
            onChange={handleUrlChange}
            className="mt-1 block w-full border border-[#444] rounded-md bg-[#222] shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="http://localhost:8080 or dgraph://localhost:9080"
            disabled={disabled || isDroppingData || storeIsFetching}
          />
          <p className="mt-1 text-sm text-gray-400">You can use HTTP URL or dgraph:// connection string format</p>
        </div>

        {/* Effective URL display for dgraph:// URLs */}
        {effectiveUrl && (
          <div className="px-3 py-2 bg-[#333] rounded text-sm text-gray-300">
            <span className="font-medium">Effective URL: </span>
            {effectiveUrl}
          </div>
        )}

        {/* Hypermode instance info */}
        {isHypermodeInstance && (
          <div className="px-3 py-2 bg-[#222] rounded border border-[#333] text-sm text-gray-300 flex items-start">
            <Info className="h-4 w-4 text-purple-400 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Hypermode Dgraph Instance Detected</p>
              <p className="text-xs text-gray-400 mt-1">
                This is a Hypermode-hosted Dgraph instance. Make sure you've included the correct bearer token in your
                connection string.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300">API Key (optional)</label>
          <div className="mt-1 relative">
            <input
              type={showCredentials ? 'text' : 'password'}
              value={dgraphApiKey}
              onChange={handleApiKeyChange}
              className="block w-full border border-[#444] rounded-md bg-[#222] shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter API key if required"
              disabled={
                disabled ||
                isDroppingData ||
                storeIsFetching ||
                dgraphUrl.includes('apikey=') ||
                dgraphUrl.includes('bearertoken=')
              }
            />
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              disabled={disabled || isDroppingData || storeIsFetching}
            >
              {showCredentials ? <Eye className="h-4 w-4 text-gray-400" /> : <Key className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
          {(dgraphUrl.includes('apikey=') || dgraphUrl.includes('bearertoken=')) && (
            <p className="mt-1 text-sm text-yellow-400">Authentication is already included in the connection string.</p>
          )}
        </div>

        {connectionStatus && (
          <div
            className={`p-4 rounded-md ${
              statusType === 'success'
                ? 'bg-green-900/20 text-green-300 border border-green-800/40'
                : statusType === 'error'
                  ? 'bg-red-900/20 text-red-300 border border-red-800/40'
                  : statusType === 'warning'
                    ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800/40'
                    : 'bg-blue-900/20 text-blue-300 border border-blue-800/40'
            }`}
          >
            <div className="flex items-center">
              {statusType === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
              {statusType === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
              {statusType === 'warning' && <AlertCircle className="h-5 w-5 mr-2" />}
              {statusType === 'info' && <Info className="h-5 w-5 mr-2" />}
              {connectionStatus}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleTestConnection}
            disabled={disabled || isDroppingData || storeIsFetching}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              disabled || isDroppingData || storeIsFetching
                ? 'bg-[#333] text-gray-400 border-[#444] cursor-not-allowed'
                : 'bg-[#333] text-white border-[#444] hover:bg-[#444]'
            }`}
          >
            {storeIsFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>

          {/* "Drop Data" button */}
          <button
            onClick={handleDropData}
            disabled={disabled || isDroppingData || storeIsFetching || !storeIsConnected}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              disabled || isDroppingData || storeIsFetching || !storeIsConnected
                ? 'bg-red-900/50 text-red-300/70 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isDroppingData ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dropping Data...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Drop All Data
              </>
            )}
          </button>
        </div>

        {/* Data drop success indicator */}
        {dropSuccess && (
          <div className="mt-2 p-3 bg-green-900/20 border border-green-800/40 rounded-md flex items-center">
            <CheckCircle className="text-green-400 mr-2" size={16} />
            <div>
              <p className="text-sm text-green-300">
                <strong>Database cleared successfully.</strong> You can now import your RDF data.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connection string help */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/40 rounded text-sm text-blue-300">
        <h3 className="font-medium mb-2">Connection String Formats</h3>
        <ul className="list-disc pl-5 space-y-1 text-blue-200">
          <li>
            <code className="bg-blue-900/30 px-1 rounded">http://localhost:8080</code> - Standard HTTP format
          </li>
          <li>
            <code className="bg-blue-900/30 px-1 rounded">dgraph://localhost:9080</code> - Basic Dgraph format
          </li>
          <li>
            <code className="bg-blue-900/30 px-1 rounded">dgraph://user:pass@localhost:9080</code> - With auth
          </li>
          <li>
            <code className="bg-blue-900/30 px-1 rounded">dgraph://localhost:9080?bearertoken=TOKEN</code> - With bearer
            token
          </li>
          <li>
            <code className="bg-blue-900/30 px-1 rounded">dgraph://host:port?apikey=VALUE&sslmode=verify-ca</code> -
            With API key
          </li>
        </ul>
      </div>
    </div>
  );
}
