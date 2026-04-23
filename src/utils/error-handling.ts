import { AxiosError } from 'axios';

export type DidErrorType =
  | 'invalidDid'
  | 'notFound'
  | 'timeout'
  | 'internalError';

export function mapAxiosErrorToDidError(error: unknown): DidErrorType {
  if (error instanceof AxiosError) {
    const err = error as AxiosError;

    if (err.response) {
      const status = err.response.status;

      if (status === 404) return 'notFound';
      if (status === 400) return 'invalidDid';
    }

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'timeout';
    }
  }

  return 'internalError';
}
