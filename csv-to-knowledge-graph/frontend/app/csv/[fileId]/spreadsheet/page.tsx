"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCSVStore } from "@/store/csv";
import Papa from "papaparse";
import { X } from "lucide-react";

interface ExpandedCellData {
  content: string;
  rowIndex: number;
  colIndex: number;
}

interface CellPosition {
  row: number;
  col: number;
}

interface ParsedData {
  data: any[];
  headers: string[];
}

export default function SpreadsheetPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const { csvFiles, currentFile } = useCSVStore();
  const fileData = csvFiles.find((file) => file.id === fileId) || currentFile;

  const [parsedData, setParsedData] = useState<ParsedData>({
    data: [],
    headers: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedCell, setExpandedCell] = useState<ExpandedCellData | null>(
    null,
  );
  const [focusedCell, setFocusedCell] = useState<CellPosition>({
    row: -1,
    col: -1,
  });
  const [processingAnimation, setProcessingAnimation] = useState<boolean>(true);

  // Track if data is parsing vs. waiting for graph
  const [dataParsingComplete, setDataParsingComplete] =
    useState<boolean>(false);

  // Check if graph data is available to coordinate visual states
  const isGraphDataAvailable =
    fileData?.graphData !== null && fileData?.graphData !== undefined;

  // Listen for the graph-generation-complete event
  useEffect(() => {
    // Handler for the custom event
    const handleGraphComplete = (event: CustomEvent) => {
      // Only stop animation if this is the current file
      if (event.detail && event.detail.fileId === fileId) {
        // Use a small delay to avoid visual glitches
        setTimeout(() => {
          setProcessingAnimation(false);
        }, 300);
      }
    };

    // Add event listener
    if (typeof window !== "undefined") {
      window.addEventListener(
        "graph-generation-complete",
        handleGraphComplete as EventListener,
      );
    }

    // Clean up function
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "graph-generation-complete",
          handleGraphComplete as EventListener,
        );
      }
    };
  }, [fileId]);

  // Initial data loading
  useEffect(() => {
    if (fileData?.content) {
      setLoading(true);
      setDataParsingComplete(false);
      setProcessingAnimation(true);

      try {
        // Parse CSV data
        const result = Papa.parse(fileData.content, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        setParsedData({
          data: result.data as any[],
          headers: result.meta.fields || [],
        });

        // Mark data parsing as complete
        setDataParsingComplete(true);
        setLoading(false);

        // If graph data is already available, stop the animation quickly (but not immediately to avoid flashing)
        if (isGraphDataAvailable) {
          setTimeout(() => {
            setProcessingAnimation(false);
          }, 300);
        }
        // Otherwise keep animation going until graph is ready
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setLoading(false);
        setProcessingAnimation(false);
        setDataParsingComplete(false);
      }
    }
  }, [fileData, isGraphDataAvailable]);

  // Stop processing animation when graph data becomes available
  useEffect(() => {
    if (isGraphDataAvailable && processingAnimation && dataParsingComplete) {
      // Use a short delay to ensure smooth transition
      setTimeout(() => {
        setProcessingAnimation(false);
      }, 300);
    }
  }, [isGraphDataAvailable, processingAnimation, dataParsingComplete]);

  // Function to handle cell double-clicks
  const handleCellDoubleClick = (
    content: string,
    rowIndex: number,
    colIndex: number,
  ): void => {
    // Only expand if content exists and is a string with sufficient length
    if (content && typeof content === "string" && content.length > 20) {
      setExpandedCell({
        content,
        rowIndex,
        colIndex,
      });
    }
  };

  // Function to close the expanded cell modal
  const closeExpandedCell = useCallback((): void => {
    setExpandedCell(null);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (expandedCell) {
        // If expanded cell is open, allow ESC to close it
        if (e.key === "Escape") {
          closeExpandedCell();
          return;
        }
        return; // Don't allow navigation while a cell is expanded
      }

      if (
        focusedCell.row === -1 ||
        !parsedData.data ||
        parsedData.data.length === 0
      ) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          setFocusedCell({ row: 0, col: 0 });
        }
        return;
      }

      const headers = parsedData.headers || [];
      const maxRow = Math.min(parsedData.data.length - 1, 99); // Assuming we're showing max 100 rows
      const maxCol = headers.length - 1;

      switch (e.key) {
        case "ArrowUp":
          if (focusedCell.row > 0) {
            setFocusedCell({ ...focusedCell, row: focusedCell.row - 1 });
          }
          break;
        case "ArrowDown":
          if (focusedCell.row < maxRow) {
            setFocusedCell({ ...focusedCell, row: focusedCell.row + 1 });
          }
          break;
        case "ArrowLeft":
          if (focusedCell.col > 0) {
            setFocusedCell({ ...focusedCell, col: focusedCell.col - 1 });
          }
          break;
        case "ArrowRight":
          if (focusedCell.col < maxCol) {
            setFocusedCell({ ...focusedCell, col: focusedCell.col + 1 });
          }
          break;
        case "Home":
          setFocusedCell({ ...focusedCell, col: 0 });
          break;
        case "End":
          setFocusedCell({ ...focusedCell, col: maxCol });
          break;
        case "Enter":
          // Double-click equivalent - expand the cell if it contains significant text
          if (parsedData.data[focusedCell.row] && headers[focusedCell.col]) {
            const content = String(
              parsedData.data[focusedCell.row][headers[focusedCell.col]] || "",
            );
            handleCellDoubleClick(content, focusedCell.row, focusedCell.col);
          }
          break;
        case "Escape":
          setFocusedCell({ row: -1, col: -1 });
          break;
        default:
          break;
      }
    },
    [
      focusedCell,
      parsedData.data,
      parsedData.headers,
      expandedCell,
      closeExpandedCell,
    ],
  );

  // Set up the keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Function to truncate cell content
  const truncateContent = (
    content: string | null | undefined,
    maxLength = 100,
  ): string => {
    if (!content) return "";
    const stringContent = String(content);
    if (stringContent.length <= maxLength) return stringContent;
    return stringContent.substring(0, maxLength) + "...";
  };

  // Function to determine if a cell is focused
  const isCellFocused = (rowIndex: number, colIndex: number): boolean => {
    return focusedCell.row === rowIndex && focusedCell.col === colIndex;
  };

  // Loading state renders the same spreadsheet with animation
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="outline-none">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-300 uppercase bg-[#222] border-b border-[#333]">
              <tr>
                {parsedData.headers.length
                  ? parsedData.headers.map((header, index) => (
                      <th key={index} className="px-4 py-3">
                        <div className="csv-cell-pulse">{header}</div>
                      </th>
                    ))
                  : Array.from({ length: 5 }).map((_, index) => (
                      <th key={index} className="px-4 py-3">
                        <div className="csv-cell-pulse">Column {index + 1}</div>
                      </th>
                    ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.data.length
                ? parsedData.data.slice(0, 100).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={
                        rowIndex % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#222]"
                      }
                    >
                      {parsedData.headers.map((header, cellIndex) => {
                        const cellContent = String(row[header] || "");
                        const delay = (rowIndex + cellIndex) * 0.025;

                        return (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 border-b border-[#333]"
                          >
                            <div
                              className="truncate max-w-xs csv-cell-pulse"
                              style={{ animationDelay: `${delay}s` }}
                            >
                              {truncateContent(cellContent, 40)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : Array.from({ length: 10 }).map((_, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={
                        rowIndex % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#222]"
                      }
                    >
                      {Array.from({ length: 5 }).map((_, cellIndex) => {
                        const delay = (rowIndex + cellIndex) * 0.025;

                        return (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 border-b border-[#333]"
                          >
                            <div
                              className="truncate max-w-xs csv-cell-pulse h-6"
                              style={{ animationDelay: `${delay}s` }}
                            >
                              {rowIndex === 0
                                ? `Row ${rowIndex + 1}`
                                : `Cell ${rowIndex}-${cellIndex}`}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div
          tabIndex={0}
          className="outline-none"
          onFocus={() => {
            if (focusedCell.row === -1) {
              setFocusedCell({ row: 0, col: 0 });
            }
          }}
        >
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-300 uppercase bg-[#222] border-b border-[#333]">
              <tr>
                {parsedData.headers.map((header, index) => (
                  <th key={index} className="px-4 py-3">
                    <div
                      className={processingAnimation ? "csv-cell-pulse" : ""}
                    >
                      {header}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.data.slice(0, 100).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#222]"}
                >
                  {parsedData.headers.map((header, cellIndex) => {
                    const cellContent = String(row[header] || "");
                    const isFocused = isCellFocused(rowIndex, cellIndex);
                    // Calculate a delay based on row and column position for wave effect
                    const delay = (rowIndex + cellIndex) * 0.025; // smaller delay for smoother wave

                    return (
                      <td
                        key={cellIndex}
                        className={`px-4 py-2 border-b border-[#333] cursor-pointer ${
                          isFocused
                            ? "outline outline-2 outline-purple-500"
                            : ""
                        }`}
                        onClick={() =>
                          setFocusedCell({ row: rowIndex, col: cellIndex })
                        }
                        onDoubleClick={() =>
                          handleCellDoubleClick(
                            cellContent,
                            rowIndex,
                            cellIndex,
                          )
                        }
                      >
                        <div
                          className={`truncate max-w-xs ${processingAnimation ? "csv-cell-pulse" : "text-gray-300"}`}
                          style={
                            processingAnimation
                              ? {
                                  animationDelay: `${delay}s`,
                                }
                              : {}
                          }
                        >
                          {truncateContent(cellContent, 40)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedData.data.length > 100 && (
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing first 100 rows of {parsedData.data.length} total rows
          </div>
        )}
      </div>

      {/* Expanded Cell Modal */}
      {expandedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#1c1c1c] rounded-lg shadow-lg border border-[#333] w-full max-w-2xl mx-4">
            <div className="border-b border-[#333] px-6 py-4 flex justify-between items-center">
              <h3 className="font-medium text-white">
                Cell Content ({parsedData.headers[expandedCell.colIndex]}, Row{" "}
                {expandedCell.rowIndex + 1})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={closeExpandedCell}
                  className="p-1 rounded-full hover:bg-[#333]"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto whitespace-pre-wrap text-gray-300">
              {expandedCell.content}
            </div>
            <div className="border-t border-[#333] px-6 py-3 flex justify-end">
              <button
                onClick={closeExpandedCell}
                className="px-4 py-2 bg-purple-700 text-white rounded-md text-sm hover:bg-purple-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes cellPulse {
          0% {
            color: #ffffff;
          }
          50% {
            color: #9333ea;
          }
          100% {
            color: #ffffff;
          }
        }

        .csv-cell-pulse {
          animation-name: cellPulse;
          animation-duration: 2.5s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }
      `}</style>
    </>
  );
}
