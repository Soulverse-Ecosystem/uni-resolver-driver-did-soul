export type ResolutionError =
  | 'invalidDid'
  | 'invalidDidDocument'
  | 'notFound'
  | 'deactivated'
  | 'timeout'
  | 'internalError';

export interface DidResolutionResult {
  didDocument: Record<string, unknown> | null;
  didDocumentMetadata: Record<string, unknown>;
  didResolutionMetadata: {
    contentType?: string;
    error?: ResolutionError;
  };
}
