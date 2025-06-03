import { createLogger } from "@hypermode/csvkit-utils";

const debugPattern = process.env.NEXT_PUBLIC_DEBUG_APP || "@hypermode*";

if (typeof window !== "undefined") {
  window.enableDebug(debugPattern);
}

const pattern = "frontend";
const logger = createLogger(pattern);

export const rdfGenLogger = logger("rdf-generation");
export const templateLogger = logger("template");
export const rdfDataLogger = logger("rdf-data");
export const uiLogger = logger("ui");
