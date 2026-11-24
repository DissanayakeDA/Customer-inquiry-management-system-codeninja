import type { ApiErrorBody, ApiErrorCode } from '@inquirydesk/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, ValidationError } from '../../domain/errors';

/** The only place that knows how domain error codes map to HTTP status codes. */
const HTTP_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  INVALID_ID: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  DUPLICATE_INQUIRY: 409,
  STALE_VERSION: 409,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_TRANSITION: 422,
  INTERNAL_ERROR: 500,
};

interface BodyParserError {
  type?: string;
}

function toErrorBody(error: unknown): ApiErrorBody {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  const type = (error as BodyParserError | null)?.type;
  if (type === 'entity.parse.failed') {
    return { error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } };
  }
  if (type === 'entity.too.large') {
    return { error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' } };
  }

  return { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } };
}

export function errorHandler(logger: Pick<Console, 'error'> = console): ErrorRequestHandler {
  // Express recognises error handlers by their four parameters, so `_next` must stay.
  return (error, req, res, _next) => {
    const body = toErrorBody(error);
    const status = HTTP_STATUS[body.error.code];
    if (status >= 500) logger.error(`[api] ${req.method} ${req.originalUrl} failed:`, error);
    res.status(status).json(body);
  };
}

export const apiNotFound: RequestHandler = (req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `No API endpoint matches ${req.method} ${req.originalUrl}.` },
  };
  res.status(404).json(body);
};
