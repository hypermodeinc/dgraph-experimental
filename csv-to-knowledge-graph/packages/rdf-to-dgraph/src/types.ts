export interface DgraphCredentials {
  url?: string;
  apiKey?: string;
  dropAll?: boolean;
}

export interface ImportOptions {
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    triplesProcessed: number;
    nodesCreated: number;
    edgesCreated: number;
    relationshipsDetected: number;
  };
}

export type HeadersInit = {
  [key: string]: any;
};

export interface DgraphCredentials {
  url?: string;
  apiKey?: string;
  bearerToken?: string;
  authHeader?: string;
  dropAll?: boolean;
}

export interface DgraphConnectionOptions {
  url?: string;
  protocol?: "http" | "https";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  bearerToken?: string;
  sslMode?: "disable" | "require" | "verify-ca";
  dropAll?: boolean;
}

export interface ImportOptions {
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    triplesProcessed: number;
    nodesCreated: number;
    edgesCreated: number;
    relationshipsDetected: number;
  };
}
