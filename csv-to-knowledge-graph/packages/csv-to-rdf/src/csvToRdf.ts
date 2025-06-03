import Papa from "papaparse";
import { transformDataFrame } from "./rdfLib";
import type { XidMap, DfRow, RdfMap } from "./types";
import {
  parserLogger,
  processingLogger,
  conversionLogger,
  templateLogger,
} from "./debug";

interface CsvToRdfOptions {
  template: string;
  chunkSize?: number;
  xidmap?: XidMap;
  onProgress?: (progress: number) => void;
  normalizeHeaders?: boolean; // New option to control header normalization
}

export class CsvToRdf {
  private template: string;
  private chunkSize: number;
  private xidmap: XidMap;
  private rdfBuffer: string[];
  private completed: boolean = false;
  private onProgress?: (progress: number) => void;
  private normalizeHeaders: boolean;
  private headerMapping: Map<string, string> = new Map();

  constructor(options: CsvToRdfOptions) {
    this.template = options.template;
    this.chunkSize = options.chunkSize || 1000;
    this.xidmap = options.xidmap || {};
    this.rdfBuffer = [];
    this.onProgress = options.onProgress;
    this.normalizeHeaders = options.normalizeHeaders !== false; // Default to true

    processingLogger.info(
      "CsvToRdf instance created with chunk size: %d",
      this.chunkSize,
    );
    templateLogger.info("Template length: %d characters", this.template.length);
    templateLogger.info(
      "Header normalization: %s",
      this.normalizeHeaders ? "enabled" : "disabled",
    );
  }

  /**
   * Normalize header by removing quotes and trimming whitespace
   */
  private normalizeHeader(header: string): string {
    if (!this.normalizeHeaders) return header;

    // Remove outer quotes (both single and double)
    let normalized = header.replace(/^["']|["']$/g, "").trim();

    // Handle escaped quotes inside headers
    normalized = normalized.replace(/""/g, '"').replace(/''/g, "'");

    templateLogger.info('Header normalized: "%s" -> "%s"', header, normalized);
    return normalized;
  }

  /**
   * Create mapping between original and normalized headers
   */
  private createHeaderMapping(headers: string[]): void {
    this.headerMapping.clear();

    headers.forEach((header) => {
      const normalized = this.normalizeHeader(header);
      this.headerMapping.set(header, normalized);
      // Also map normalized to normalized for convenience
      this.headerMapping.set(normalized, normalized);
    });

    templateLogger.info(
      "Created header mapping for %d headers",
      headers.length,
    );
    templateLogger.info(
      "Header mapping: %o",
      Object.fromEntries(this.headerMapping),
    );
  }

  /**
   * Transform headers in parsed data rows
   */
  private transformRowHeaders(rows: any[]): DfRow[] {
    if (!this.normalizeHeaders || this.headerMapping.size === 0) {
      return rows as DfRow[];
    }

    return rows.map((row) => {
      const transformedRow: DfRow = {};

      Object.keys(row).forEach((originalHeader) => {
        const normalizedHeader =
          this.headerMapping.get(originalHeader) || originalHeader;
        transformedRow[normalizedHeader] = row[originalHeader];
      });

      return transformedRow;
    });
  }

  async processCSVString(csvData: string): Promise<string> {
    processingLogger.info(
      "Processing CSV string of length: %d",
      csvData.length,
    );

    return new Promise((resolve, reject) => {
      let totalRows = 0;
      let headers: string[] = [];

      parserLogger.info(
        "Starting initial parse to count rows and extract headers",
      );
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          const normalized = this.normalizeHeader(header);
          templateLogger.info(
            'Transform header: "%s" -> "%s"',
            header,
            normalized,
          );
          return normalized;
        },
        step: (results: any) => {
          if (totalRows === 0) {
            // Capture headers from first row
            headers = results.meta.fields || [];
            this.createHeaderMapping(headers);
            parserLogger.info("Extracted headers: %o", headers);
          }
          totalRows++;
        },
        complete: () => {
          parserLogger.info("Counted %d total rows in CSV", totalRows);
          this.processWithProgress(csvData, totalRows, resolve, reject);
        },
        error: (error: Error) => {
          parserLogger.error("Error counting rows: %o", error);
          reject(new Error(`Error counting rows: ${error.message}`));
        },
      });
    });
  }

  private processWithProgress(
    csvData: string,
    totalRows: number,
    resolve: (value: string) => void,
    reject: (reason: Error) => void,
  ) {
    let processedRows = 0;

    processingLogger.info(
      "Starting CSV processing with %d total rows",
      totalRows,
    );

    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      chunkSize: this.chunkSize,
      transformHeader: (header: string) => {
        return this.normalizeHeader(header);
      },
      chunk: (results: any) => {
        processingLogger.info(
          "Processing chunk with %d rows",
          results.data.length,
        );

        // Transform headers in the chunk data
        const transformedRows = this.transformRowHeaders(results.data);

        const rdfOutput = this.transformChunk(transformedRows);
        if (rdfOutput) {
          this.rdfBuffer.push(rdfOutput);
          processingLogger.info(
            "Generated %d bytes of RDF data",
            rdfOutput.length,
          );
        } else {
          processingLogger.warning("No RDF data generated from chunk");
        }

        processedRows += results.data.length;
        const progress = Math.min(
          100,
          Math.floor((processedRows / totalRows) * 100),
        );
        processingLogger.info(
          "Progress: %d%% (%d/%d rows)",
          progress,
          processedRows,
          totalRows,
        );

        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      complete: () => {
        this.completed = true;
        if (this.onProgress) {
          this.onProgress(100);
        }
        processingLogger.info(
          "CSV processing completed, generated %d chunks of RDF data",
          this.rdfBuffer.length,
        );
        resolve(this.rdfBuffer.join(""));
      },
      error: (error: Error) => {
        processingLogger.error("Error processing CSV: %o", error);
        reject(new Error(`Error processing CSV: ${error.message}`));
      },
    });
  }

  async processCSVFile(file: File): Promise<string> {
    processingLogger.info(
      "Processing CSV file: %s (%d bytes)",
      file.name,
      file.size,
    );

    return new Promise((resolve, reject) => {
      let totalRows = 0;
      let headers: string[] = [];

      parserLogger.info(
        "Starting initial parse to count rows in file: %s",
        file.name,
      );
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          return this.normalizeHeader(header);
        },
        step: (results: any) => {
          if (totalRows === 0) {
            // Capture headers from first row
            headers = results.meta.fields || [];
            this.createHeaderMapping(headers);
            parserLogger.info("Extracted headers from file: %o", headers);
          }
          totalRows++;
        },
        complete: () => {
          parserLogger.info("Counted %d total rows in file", totalRows);
          this.processFileWithProgress(file, totalRows, resolve, reject);
        },
        error: (error) => {
          parserLogger.error("Error counting rows in file: %o", error);
          reject(new Error(`Error counting rows: ${error.message}`));
        },
      });
    });
  }

  private processFileWithProgress(
    file: File,
    totalRows: number,
    resolve: (value: string) => void,
    reject: (reason: Error) => void,
  ) {
    let processedRows = 0;

    processingLogger.info(
      "Starting file processing with %d total rows",
      totalRows,
    );

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      chunkSize: this.chunkSize,
      transformHeader: (header: string) => {
        return this.normalizeHeader(header);
      },
      chunk: (results) => {
        processingLogger.info(
          "Processing file chunk with %d rows",
          results.data.length,
        );

        // Transform headers in the chunk data
        const transformedRows = this.transformRowHeaders(results.data);

        const rdfOutput = this.transformChunk(transformedRows);
        if (rdfOutput) {
          this.rdfBuffer.push(rdfOutput);
          processingLogger.info(
            "Generated %d bytes of RDF data from file chunk",
            rdfOutput.length,
          );
        } else {
          processingLogger.warning("No RDF data generated from file chunk");
        }

        processedRows += results.data.length;
        const progress = Math.min(
          100,
          Math.floor((processedRows / totalRows) * 100),
        );
        processingLogger.info(
          "File processing progress: %d%% (%d/%d rows)",
          progress,
          processedRows,
          totalRows,
        );

        if (this.onProgress) {
          this.onProgress(progress);
        }
      },
      complete: () => {
        this.completed = true;
        if (this.onProgress) {
          this.onProgress(100);
        }
        processingLogger.info(
          "File processing completed, generated %d chunks of RDF data",
          this.rdfBuffer.length,
        );
        resolve(this.rdfBuffer.join(""));
      },
      error: (error) => {
        processingLogger.error("Error processing file: %o", error);
        reject(new Error(`Error processing CSV: ${error.message}`));
      },
    });
  }

  private transformChunk(rows: DfRow[]): string | null {
    conversionLogger.info("Transforming chunk with %d rows", rows.length);

    const rowsWithLineNumbers = rows.map((row, index) => ({
      ...row,
      LINE_NUMBER: index,
    }));

    try {
      const rdfMap = transformDataFrame(rowsWithLineNumbers, this.template);
      const triplesCount = Object.keys(rdfMap).length;
      conversionLogger.info("Generated %d triples from chunk", triplesCount);

      const result = this.rdfMapToString(rdfMap);
      return result;
    } catch (error) {
      conversionLogger.error("Error transforming chunk to RDF: %o", error);
      return null;
    }
  }

  private rdfMapToString(rdfMap: RdfMap): string {
    let result = "";
    let triplesCount = 0;

    for (const [subject, value] of Object.entries(rdfMap)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          result += `${subject} ${v} .\n`;
          triplesCount++;
        }
      } else {
        result += `${subject} ${value} .\n`;
        triplesCount++;
      }
    }

    conversionLogger.info(
      "Converted RDF map to string with %d triples",
      triplesCount,
    );
    return result;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  getXidMap(): XidMap {
    return this.xidmap;
  }

  /**
   * Get the header mapping (original -> normalized)
   */
  getHeaderMapping(): Map<string, string> {
    return new Map(this.headerMapping);
  }

  /**
   * Get normalized headers
   */
  getNormalizedHeaders(): string[] {
    return Array.from(new Set(this.headerMapping.values()));
  }
}

export function createCsvToRdf(
  template: string,
  options?: Omit<CsvToRdfOptions, "template">,
): CsvToRdf {
  processingLogger.info(
    "Creating CsvToRdf instance with template of length %d",
    template.length,
  );
  return new CsvToRdf({ template, ...options });
}
