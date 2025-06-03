'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { RdfToDgraph } from '@hypermode/csvkit-rdf-to-dgraph';

interface NodeType {
  name: string;
  count: number;
}

interface ConnectionStoreContextType {
  dgraphUrl: string;
  dgraphApiKey: string;
  setDgraphUrl: (url: string) => void;
  setDgraphApiKey: (apiKey: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  schema: string;
  setSchema: (schema: string) => void;
  nodeTypes: NodeType[];
  setNodeTypes: (nodeTypes: NodeType[]) => void;
  isInitialized: boolean;
  testConnection: () => Promise<boolean>;
  fetchNodeTypes: () => Promise<Record<string, number> | null>;
  fetchSchema: () => Promise<string | null>;
  isFetching: boolean;
  lastConnectionTime: number | null;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
  hasValidNodeTypes: boolean;
}

const ConnectionStoreContext = createContext<ConnectionStoreContextType | undefined>(undefined);

export function ConnectionStoreProvider({ children }: { children: React.ReactNode }) {
  const [dgraphUrl, setDgraphUrlState] = useState<string>('http://localhost:8080');
  const [dgraphApiKey, setDgraphApiKeyState] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [schema, setSchemaState] = useState<string>('');
  const [nodeTypes, setNodeTypesState] = useState<NodeType[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [lastConnectionTime, setLastConnectionTime] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Track whether we have valid node types
  const hasValidNodeTypes = nodeTypes.length > 0;

  const initRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom setter for schema that updates localStorage
  const setSchema = useCallback((newSchema: string) => {
    setSchemaState(newSchema);
    if (initRef.current) {
      localStorage.setItem('dgraph-schema', newSchema);
    }
  }, []);

  // Custom setter for nodeTypes that updates localStorage
  const setNodeTypes = useCallback((newNodeTypes: NodeType[]) => {
    setNodeTypesState(newNodeTypes);
    if (initRef.current) {
      localStorage.setItem('dgraph-node-types', JSON.stringify(newNodeTypes));
    }
  }, []);

  // Load connection details from localStorage on initialization
  useEffect(() => {
    if (initRef.current) return;

    try {
      // Set default values first, then override with localStorage if available
      let storedDgraphUrl = 'http://localhost:8080';
      let storedDgraphApiKey = '';
      let hasStoredConnection = false;

      // Try to get stored values
      const localUrl = localStorage.getItem('dgraphUrl');
      const localApiKey = localStorage.getItem('dgraphApiKey');
      const storedSchema = localStorage.getItem('dgraph-schema');
      const storedNodeTypes = localStorage.getItem('dgraph-node-types');
      const storedLastConnectionTime = localStorage.getItem('dgraph-last-connection-time');

      if (localUrl) {
        storedDgraphUrl = localUrl;
        hasStoredConnection = true;
      } else {
        // If no stored URL, save the default one
        localStorage.setItem('dgraphUrl', storedDgraphUrl);
      }

      if (localApiKey) {
        storedDgraphApiKey = localApiKey;
      }

      // Update state with the values
      setDgraphUrlState(storedDgraphUrl);
      setDgraphApiKeyState(storedDgraphApiKey);

      if (storedSchema) {
        setSchemaState(storedSchema);
      }

      if (storedNodeTypes) {
        try {
          setNodeTypesState(JSON.parse(storedNodeTypes));
        } catch (error) {
          console.error('Failed to parse stored node types:', error);
        }
      }

      if (storedLastConnectionTime) {
        try {
          setLastConnectionTime(parseInt(storedLastConnectionTime, 10));
        } catch (error) {
          console.error('Failed to parse last connection time:', error);
        }
      }

      // Mark initialization as completing but wait for connection test
      // Give a little delay to avoid immediate connection test
      fetchTimeoutRef.current = setTimeout(() => {
        // Auto-check connection status on init if we have connection details
        if (hasStoredConnection) {
          // Clear any previous connection error
          setConnectionError(null);

          testConnection()
            .then((connected) => {
              setIsConnected(connected);
              if (connected) {
                // Fetch schema and node types together to ensure consistency
                fetchTimeoutRef.current = setTimeout(async () => {
                  // Only fetch if still connected
                  if (isConnected) {
                    try {
                      const schemaResult = await fetchSchema();
                      if (schemaResult) {
                        // After schema is fetched, fetch node types
                        await fetchNodeTypes();
                      }
                    } catch (error) {
                      console.error('Error fetching initial schema/types:', error);
                    }
                  }

                  // Update last connection time
                  const now = Date.now();
                  setLastConnectionTime(now);
                  localStorage.setItem('dgraph-last-connection-time', now.toString());
                }, 300);
              }

              // Mark initialization as complete after connection test
              setIsInitialized(true);
            })
            .catch((error) => {
              console.error('Connection test failed during init:', error);
              setConnectionError(error.message || 'Connection test failed');
              setIsInitialized(true);
            });
        } else {
          // No stored connection details, just mark as initialized
          setIsInitialized(true);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load Dgraph connection details:', error);
      setIsInitialized(true); // Still mark as initialized even if there's an error
    }

    initRef.current = true;

    // Clean up any timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Custom setter for dgraphUrl that updates localStorage
  const setDgraphUrl = useCallback((url: string) => {
    setDgraphUrlState(url);
    if (initRef.current) {
      localStorage.setItem('dgraphUrl', url);
    }
  }, []);

  // Custom setter for dgraphApiKey that updates localStorage
  const setDgraphApiKey = useCallback((apiKey: string) => {
    setDgraphApiKeyState(apiKey);
    if (initRef.current) {
      localStorage.setItem('dgraphApiKey', apiKey);
    }
  }, []);

  // Test connection function
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!dgraphUrl) return false;

    setIsFetching(true);
    setConnectionError(null);

    try {
      // Always ensure URL and API key are saved to localStorage when testing connection
      localStorage.setItem('dgraphUrl', dgraphUrl);
      if (dgraphApiKey) {
        localStorage.setItem('dgraphApiKey', dgraphApiKey);
      }

      // Create a connection object based on URL type
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

      const connected = await rdfToDgraph.testConnection();
      setIsConnected(connected);

      if (connected) {
        // Update last connection time
        const now = Date.now();
        setLastConnectionTime(now);
        localStorage.setItem('dgraph-last-connection-time', now.toString());
      }

      return connected;
    } catch (error) {
      console.error('Error testing connection:', error);
      setIsConnected(false);
      setConnectionError((error as Error).message || 'Connection failed');
      return false;
    } finally {
      setIsFetching(false);
    }
  }, [dgraphUrl, dgraphApiKey]);

  // Fetch node types function with debounce to avoid too many requests
  const fetchNodeTypes = useCallback(async (): Promise<Record<string, number> | null> => {
    if (!dgraphUrl || !isConnected) return null;

    // Don't allow multiple fetches at once
    if (isFetching) {
      console.log('Already fetching data, skipping fetchNodeTypes');
      return null;
    }

    setIsFetching(true);
    try {
      // Create a connection object based on URL type
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

      const nodeTypesWithCounts = await rdfToDgraph.getNodeTypesWithCounts();

      if (nodeTypesWithCounts) {
        const typesArray = Object.entries(nodeTypesWithCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count); // Sort by count descending

        setNodeTypes(typesArray);
        localStorage.setItem('dgraph-node-types', JSON.stringify(typesArray));
        return nodeTypesWithCounts;
      } else {
        // If no node types returned, set empty array
        setNodeTypes([]);
        localStorage.setItem('dgraph-node-types', '[]');
      }
      return null;
    } catch (error) {
      console.error('Error fetching node types:', error);
      // On error, clear node types
      setNodeTypes([]);
      localStorage.setItem('dgraph-node-types', '[]');
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [dgraphUrl, dgraphApiKey, isConnected, isFetching, setNodeTypes]);

  // Fetch schema function with debounce
  const fetchSchema = useCallback(async (): Promise<string | null> => {
    if (!dgraphUrl || !isConnected) return null;

    // Don't allow multiple fetches at once
    if (isFetching) {
      console.log('Already fetching data, skipping fetchSchema');
      return null;
    }

    setIsFetching(true);
    try {
      // Create a connection object based on URL type
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

      const schemaStr = await rdfToDgraph.fetchSchema();

      if (schemaStr) {
        setSchema(schemaStr);
        localStorage.setItem('dgraph-schema', schemaStr);
        return schemaStr;
      } else {
        // If no schema returned, set empty string
        setSchema('');
        localStorage.setItem('dgraph-schema', '');
      }
      return null;
    } catch (error) {
      console.error('Error fetching schema:', error);
      // On error, clear schema
      setSchema('');
      localStorage.setItem('dgraph-schema', '');
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [dgraphUrl, dgraphApiKey, isConnected, isFetching, setSchema]);

  const value = {
    dgraphUrl,
    dgraphApiKey,
    setDgraphUrl,
    setDgraphApiKey,
    isConnected,
    setIsConnected,
    schema,
    setSchema,
    nodeTypes,
    setNodeTypes,
    isInitialized,
    testConnection,
    fetchNodeTypes,
    fetchSchema,
    isFetching,
    lastConnectionTime,
    connectionError,
    setConnectionError,
    hasValidNodeTypes,
  };

  return <ConnectionStoreContext.Provider value={value}>{children}</ConnectionStoreContext.Provider>;
}

// Custom hook to use the connection store
export function useConnectionStore() {
  const context = useContext(ConnectionStoreContext);
  if (context === undefined) {
    throw new Error('useConnectionStore must be used within a ConnectionStoreProvider');
  }
  return context;
}
