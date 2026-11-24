import type { ApiErrorBody, ApiErrorCode } from '@inquirydesk/shared';

/** Server error codes plus the two failures that never reach the server's error handler. */
export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE';

const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again.";
const SERVER_MESSAGE = 'Something went wrong on our side. Please try again.';

/** Every failed API call surfaces as an ApiError, so components can branch on `code` instead of parsing messages. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static network(): ApiError {
    return new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const error = body?.error;
    if (error && typeof error.code === 'string' && typeof error.message === 'string') {
      return new ApiError(response.status, error.code, error.message, error.fieldErrors ?? {}, error.details ?? {});
    }
    // Not our API's error format, e.g. the dev proxy could not reach Express.
    return response.status >= 500
      ? new ApiError(response.status, 'INTERNAL_ERROR', SERVER_MESSAGE)
      : new ApiError(response.status, 'UNEXPECTED_RESPONSE', `Unexpected response from the server (${response.status}).`);
  }

  /** Connectivity or server-side failure: worth retrying. 4xx responses will fail the same way again. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export function isApiError(error: unknown, code?: ClientErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** Message for any thrown value, for places that just need to show something sensible. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SERVER_MESSAGE;
}
