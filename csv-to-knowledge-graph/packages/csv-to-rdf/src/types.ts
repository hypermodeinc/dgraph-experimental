export interface RdfMap {
  [key: string]: string | string[];
}

export interface XidMap {
  [key: string]: string;
}

export interface DfRow {
  [key: string]: any;
  LINE_NUMBER?: number;
}

export interface OutputOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}
