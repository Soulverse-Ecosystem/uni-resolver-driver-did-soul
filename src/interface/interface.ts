export interface SoulverseResponse {
  didDocument: any;
  version: number;
  deactivated: boolean;
  updatedAt: string;
}

export interface DidDocument {
  '@context'?: string[];
  id: string;
  verificationMethod?: unknown[];
  authentication?: unknown[];
  assertionMethod?: unknown[];
  service?: unknown[];
}

export interface DidResolutionResult {
  statusCode?: number;
  message?: string;
  didDocument: DidDocument | null;
  didDocumentMetadata: {
    versionId?: string;
    deactivated?: boolean;
    updated?: string;
  };
  didResolutionMetadata: {
    contentType?: string;
    error?: string;
  };
}
