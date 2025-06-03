"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export interface CSVFileData {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  // Store graph data for this file
  graphData?: any;
  // Store RDF data for this file
  rdfData?: string;
  // Store RDF template for this file
  rdfTemplate?: string;
}

interface CSVStoreContextType {
  csvFiles: CSVFileData[];
  currentFile: CSVFileData | null;
  selectCSVFile: (id: string) => void;
  clearCurrentFile: () => void;
  addCSVFile: (file: File) => Promise<CSVFileData>;
  removeCSVFile: (id: string) => void;
  clearAllFiles: () => void;
  isLoading: boolean;
  // Graph data storage
  setGraphData: (graphData: any) => void;
  // RDF data storage
  setRdfData: (rdfData: string) => void;
  // RDF template storage
  setRdfTemplate: (rdfTemplate: string) => void;
  inputPrompt: string;
  setInputPrompt: (text: string) => void;
}

const CSVStoreContext = createContext<CSVStoreContextType | undefined>(
  undefined,
);

export function CSVStoreProvider({ children }: { children: React.ReactNode }) {
  const [csvFiles, setCsvFiles] = useState<CSVFileData[]>([]);
  const [currentFile, setCurrentFile] = useState<CSVFileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>("");

  const initRef = useRef(false);

  // Initial load of files from localStorage
  useEffect(() => {
    if (initRef.current) return;

    const storedFiles = localStorage.getItem("csvFiles");
    if (storedFiles) {
      try {
        const parsedFiles = JSON.parse(storedFiles);
        setCsvFiles(parsedFiles);

        // Try to restore the current file from the URL
        // This uses a trick to extract the fileId from the URL path
        const path = window.location.pathname;
        // eslint-disable-next-line no-useless-escape
        const matches = path.match(/\/csv\/([^\/]+)/);

        if (matches && matches[1]) {
          const fileId = matches[1];
          const foundFile = parsedFiles.find(
            (file: CSVFileData) => file.id === fileId,
          );

          if (foundFile) {
            setCurrentFile(foundFile);
          }
        }
      } catch (error) {
        console.error("Failed to parse CSV files from localStorage:", error);
        localStorage.removeItem("csvFiles");
      }
    }

    initRef.current = true;
  }, []);

  // Update localStorage whenever csvFiles changes
  useEffect(() => {
    if (!initRef.current) return;
    localStorage.setItem("csvFiles", JSON.stringify(csvFiles));
  }, [csvFiles]);

  // Helper function to read a file as text
  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          resolve(event.target.result);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  // Add a new CSV file
  const addCSVFile = useCallback(
    async (file: File): Promise<CSVFileData> => {
      setIsLoading(true);

      try {
        // Generate a unique ID
        const id = `csv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const content = await readFileAsText(file);
        const newFile: CSVFileData = {
          id,
          name: file.name,
          content,
          timestamp: Date.now(),
          graphData: null, // Initialize with no graph data
          rdfData: undefined, // Initialize with no RDF data
          rdfTemplate: undefined, // Initialize with no RDF template
        };

        // Update state with the new file
        setCsvFiles((prevFiles) => {
          // Remove any existing file with the same name to avoid duplicates
          const filteredFiles = prevFiles.filter((f) => f.name !== file.name);
          return [newFile, ...filteredFiles].slice(0, 10); // Limit to 10 most recent files
        });

        setCurrentFile(newFile);

        return newFile;
      } catch (error) {
        console.error("Failed to process CSV file:", error);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [readFileAsText],
  );

  const selectCSVFile = useCallback(
    (id: string) => {
      const file = csvFiles.find((f) => f.id === id);
      if (file) {
        console.log("Selecting CSV file:", file.name);
        setCurrentFile(file);
      } else {
        console.warn("CSV file not found with ID:", id);
      }
    },
    [csvFiles],
  );

  // Update graph data for the current file
  const setGraphData = useCallback(
    (graphData: any) => {
      if (currentFile) {
        // Update the current file with the new graph data
        setCsvFiles((prevFiles) =>
          prevFiles.map((file) => {
            if (file.id === currentFile.id) {
              return { ...file, graphData };
            }
            return file;
          }),
        );

        // Also update currentFile state
        setCurrentFile((prev) => {
          if (prev && prev.id === currentFile.id) {
            return { ...prev, graphData };
          }
          return prev;
        });
      }
    },
    [currentFile],
  );

  // Update RDF data for the current file
  const setRdfData = useCallback(
    (rdfData: string) => {
      if (currentFile) {
        // Update the current file with the new RDF data
        setCsvFiles((prevFiles) =>
          prevFiles.map((file) => {
            if (file.id === currentFile.id) {
              return { ...file, rdfData };
            }
            return file;
          }),
        );

        // Also update currentFile state
        setCurrentFile((prev) => {
          if (prev && prev.id === currentFile.id) {
            return { ...prev, rdfData };
          }
          return prev;
        });
      }
    },
    [currentFile],
  );

  // Update RDF template for the current file
  const setRdfTemplate = useCallback(
    (rdfTemplate: string) => {
      if (currentFile) {
        // Update the current file with the new RDF template
        setCsvFiles((prevFiles) =>
          prevFiles.map((file) => {
            if (file.id === currentFile.id) {
              return { ...file, rdfTemplate };
            }
            return file;
          }),
        );

        // Also update currentFile state
        setCurrentFile((prev) => {
          if (prev && prev.id === currentFile.id) {
            return { ...prev, rdfTemplate };
          }
          return prev;
        });
      }
    },
    [currentFile],
  );

  const clearCurrentFile = useCallback(() => {
    setCurrentFile(null);
  }, []);

  const removeCSVFile = useCallback(
    (id: string) => {
      setCsvFiles((prevFiles) => prevFiles.filter((f) => f.id !== id));

      if (currentFile && currentFile.id === id) {
        setCurrentFile(null);
      }
    },
    [csvFiles, currentFile],
  );

  const clearAllFiles = useCallback(() => {
    setCsvFiles([]);
    setCurrentFile(null);
    localStorage.removeItem("csvFiles");
  }, []);

  const value = {
    csvFiles,
    currentFile,
    addCSVFile,
    selectCSVFile,
    clearCurrentFile,
    removeCSVFile,
    clearAllFiles,
    isLoading,
    // Graph data storage
    setGraphData,
    // RDF data storage
    setRdfData,
    setRdfTemplate,
    inputPrompt,
    setInputPrompt,
  };

  return (
    <CSVStoreContext.Provider value={value}>
      {children}
    </CSVStoreContext.Provider>
  );
}

// Custom hook to use the CSV store
export function useCSVStore() {
  const context = useContext(CSVStoreContext);
  if (context === undefined) {
    throw new Error("useCSVStore must be used within a CSVStoreProvider");
  }
  return context;
}
