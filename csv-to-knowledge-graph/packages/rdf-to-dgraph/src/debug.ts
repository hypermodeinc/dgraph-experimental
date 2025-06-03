import { createLogger } from "@hypermode/csvkit-utils";

const logger = createLogger("rdf-to-dgraph");

export const connectionLogger = logger("connection");
export const importLogger = logger("import");
export const schemaLogger = logger("schema");
export const mutationLogger = logger("mutation");
export const debugLogger = logger("debug");
