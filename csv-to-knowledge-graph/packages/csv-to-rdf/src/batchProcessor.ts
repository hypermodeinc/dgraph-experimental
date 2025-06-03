import { createCsvToRdf } from "./csvToRdf";
import { processingLogger } from "./debug";

export interface CSVBatchFile {
  id: string;
  name: string;
  content: string;
}

export interface BatchRdfOptions {
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
  normalizeHeaders?: boolean;
}

export async function processBatchToRDF(
  files: CSVBatchFile[],
  template: string,
  options: BatchRdfOptions = {},
): Promise<string> {
  processingLogger.info(
    "Starting batch RDF processing with %d files",
    files.length,
  );
  if (files.length === 0) {
    processingLogger.warning("No files provided for batch processing");
    return "";
  }

  if (!template) {
    processingLogger.warning("No template provided for batch processing");
    return "";
  }

  // Optional callbacks
  const { onProgress, onStatusChange, normalizeHeaders = true } = options;

  try {
    onStatusChange?.("Analyzing template and CSV files...");
    onProgress?.(10);

    // Step 1: First pass - Generate entity definitions without relationships
    processingLogger.info("First pass - generating entity definitions");
    onStatusChange?.("Generating entity definitions from CSV files...");

    // Extract entity template lines (those that don't define relationships between entities)
    const templateLines = template.split("\n");
    const entityTemplateLines = templateLines
      .filter((line) => {
        // Keep lines that are NOT relationships between entities
        // Relationships typically have a pattern where both subject and object are entity references like <_:Entity>
        return !line.includes("> <_:") && !line.match(/>\s+<[A-Z_]+>\s+<_:/);
      })
      .join("\n");

    // First pass - generate all entity definitions
    let entityDefinitions = "";
    let processedFiles = 0;

    for (const file of files) {
      if (!file.content) continue;

      processingLogger.info(
        "Processing file %s for entity definitions",
        file.name,
      );

      const converter = createCsvToRdf(entityTemplateLines, {
        normalizeHeaders, // Pass through header normalization option
        onProgress: (fileProgress) => {
          // Map progress for first pass (0-40%)
          const fileWeight = 1 / files.length;
          const baseProgress = 10 + processedFiles * fileWeight * 30;
          const fileProgress1 = fileWeight * (fileProgress / 100) * 30;
          onProgress?.(Math.floor(baseProgress + fileProgress1));
        },
      });

      // Process this file for entities
      onStatusChange?.(`Generating entities from ${file.name}...`);
      const fileEntityData = await converter.processCSVString(file.content);
      entityDefinitions += fileEntityData;

      const headerMapping = converter.getHeaderMapping();
      processingLogger.info(
        "Header mapping for %s: %o",
        file.name,
        Object.fromEntries(headerMapping),
      );

      processedFiles++;
    }

    // Step 2: Second pass - Extract only relationship triples
    processingLogger.info("Second pass - generating relationship triples");
    onStatusChange?.("Generating relationships between entities...");
    onProgress?.(45);

    // Extract relationship template lines
    const relationshipTemplateLines = templateLines
      .filter((line) => {
        // Keep only lines that define relationships between entities
        return (
          (line.includes("> <_:") || line.match(/>\s+<[A-Z_]+>\s+<_:/)) &&
          !line.includes("dgraph.type")
        );
      })
      .join("\n");

    // Second pass - generate all relationship triples
    let relationshipTriples = "";
    processedFiles = 0;

    for (const file of files) {
      if (!file.content) continue;

      processingLogger.info("Processing file %s for relationships", file.name);

      const converter = createCsvToRdf(relationshipTemplateLines, {
        normalizeHeaders,
        onProgress: (fileProgress) => {
          // Map progress for second pass (45-80%)
          const fileWeight = 1 / files.length;
          const baseProgress = 45 + processedFiles * fileWeight * 35;
          const fileProgress2 = fileWeight * (fileProgress / 100) * 35;
          onProgress?.(Math.floor(baseProgress + fileProgress2));
        },
      });

      // Process this file for relationships
      onStatusChange?.(`Generating relationships from ${file.name}...`);
      try {
        const fileRelationshipData = await converter.processCSVString(
          file.content,
        );
        relationshipTriples += fileRelationshipData;
      } catch (err) {
        // If relationship processing fails for a file, log but continue
        processingLogger.warning(
          "Error processing relationships for %s: %o",
          file.name,
          err,
        );
      }

      processedFiles++;
    }

    // Step 3: Clean and merge the data
    onStatusChange?.("Finalizing RDF data...");
    onProgress?.(85);

    // Function to clean RDF data
    const cleanRdfData = (rdfData: string): string => {
      return rdfData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          // Skip empty lines
          if (!line) return false;
          // Skip lines with empty quotes
          if (line.includes('""')) return false;
          // Skip lines with unsubstituted placeholders
          if (line.includes("[") && line.includes("]")) return false;
          return true;
        })
        .join("\n");
    };

    // Clean both entity definitions and relationship triples
    const cleanedEntityDefinitions = cleanRdfData(entityDefinitions);
    const cleanedRelationshipTriples = cleanRdfData(relationshipTriples);

    // Combine - entities first, then relationships
    const combinedRdfData =
      cleanedEntityDefinitions + "\n" + cleanedRelationshipTriples;

    // Step 4: Remove duplicate triples
    const uniqueLines = new Set(
      combinedRdfData.split("\n").filter((line) => line.trim()),
    );
    const dedupedRdfData = Array.from(uniqueLines).join("\n");

    processingLogger.info(
      "Batch processing complete. Generated %d unique RDF triples",
      uniqueLines.size,
    );
    onStatusChange?.("RDF generation complete");
    onProgress?.(100);

    return dedupedRdfData;
  } catch (error) {
    processingLogger.error("Error in batch processing: %o", error);
    throw error;
  }
}

/**
 * Process a batch of CSV files with a shared RDF template
 * for use in scenarios that require manual setup like browser environments
 */
export function createBatchRdfProcessor() {
  return {
    processBatchToRDF,
  };
}

/**
 * Utility function to analyze headers across multiple CSV files
 */
export async function analyzeCSVHeaders(files: CSVBatchFile[]): Promise<{
  fileHeaders: Record<string, string[]>;
  commonHeaders: string[];
  allHeaders: string[];
  headerVariations: Record<string, string[]>;
}> {
  const fileHeaders: Record<string, string[]> = {};
  const allHeadersSet = new Set<string>();
  const headerVariations: Record<string, string[]> = {};

  for (const file of files) {
    if (!file.content) continue;

    const converter = createCsvToRdf("", {
      // Empty template for analysis
      normalizeHeaders: true,
    });

    try {
      // Process just enough to get headers
      await converter.processCSVString(
        file.content.split("\n").slice(0, 2).join("\n"),
      );

      const normalizedHeaders = converter.getNormalizedHeaders();
      const headerMapping = converter.getHeaderMapping();

      fileHeaders[file.name] = normalizedHeaders;

      // Track all unique headers
      normalizedHeaders.forEach((header) => allHeadersSet.add(header));

      // Track header variations
      headerMapping.forEach((normalized, original) => {
        if (normalized !== original) {
          if (!headerVariations[normalized]) {
            headerVariations[normalized] = [];
          }
          if (!headerVariations[normalized].includes(original)) {
            headerVariations[normalized].push(original);
          }
        }
      });
    } catch (error) {
      processingLogger.warning(
        "Could not analyze headers for file %s: %o",
        file.name,
        error,
      );
      fileHeaders[file.name] = [];
    }
  }

  const allHeaders = Array.from(allHeadersSet);

  // Find common headers across all files
  const commonHeaders = allHeaders.filter((header) =>
    Object.values(fileHeaders).every((headers) => headers.includes(header)),
  );

  processingLogger.info(
    "Header analysis complete: %d files, %d unique headers, %d common headers",
    files.length,
    allHeaders.length,
    commonHeaders.length,
  );

  return {
    fileHeaders,
    commonHeaders,
    allHeaders,
    headerVariations,
  };
}
