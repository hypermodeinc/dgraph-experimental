import { createLogger } from "@hypermode/csvkit-utils";

const logger = createLogger("csv-to-rdf");

export const parserLogger = logger("parser");
export const templateLogger = logger("template");
export const processingLogger = logger("processing");
export const conversionLogger = logger("conversion");
export const debugLogger = logger("debug");
