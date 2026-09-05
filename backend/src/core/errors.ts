export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string | undefined;
  invalidParams?: Array<{ field: string; message: string }> | undefined;
  timestamp: string;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  public toProblemDetails(instanceUri?: string): ProblemDetails {
    return {
      type: `https://aezamine.com/errors/${this.code.toLowerCase().replace(/_/g, '-')}`,
      title: this.name.replace(/Error$/, ''),
      status: this.status,
      detail: this.message,
      instance: instanceUri,
      timestamp: new Date().toISOString()
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Invalid request payload or parameters', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required or invalid credentials') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Access denied to requested resource') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Requested resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = 'HTTP method not allowed for this endpoint') {
    super(message, 405, 'METHOD_NOT_ALLOWED');
  }
}

export class RateLimitExceededError extends HttpError {
  public readonly retryAfterSeconds: number;

  constructor(message = 'Too many requests, please slow down', retryAfterSeconds = 5) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal server encountered an unexpected condition') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Target upstream service is currently unreachable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}
