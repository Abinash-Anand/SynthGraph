import "server-only";

/**
 * One error type per backend failure class, so every feature's server code
 * (and every Route Handler) can branch on `instanceof` instead of re-parsing
 * status codes in a dozen places.
 */
export class BackendApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.body = body;
  }
}

export class AuthenticationError extends BackendApiError {}
export class AuthorizationError extends BackendApiError {}
export class NotFoundError extends BackendApiError {}
export class ConflictError extends BackendApiError {}
export class ValidationError extends BackendApiError {}
export class ServerFailureError extends BackendApiError {}

export function toBackendApiError(status: number, message: string, body?: unknown): BackendApiError {
  if (status === 401) return new AuthenticationError(status, message, body);
  if (status === 403) return new AuthorizationError(status, message, body);
  if (status === 404) return new NotFoundError(status, message, body);
  if (status === 409) return new ConflictError(status, message, body);
  if (status === 400 || status === 422) return new ValidationError(status, message, body);
  if (status >= 500) return new ServerFailureError(status, message, body);
  return new BackendApiError(status, message, body);
}
