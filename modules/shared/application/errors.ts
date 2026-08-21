export type ApplicationErrorCode =
  | "BAD_REQUEST"
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_MISMATCH"
  | "INVALID_TRANSITION"
  | "VALIDATION_FAILED"
  | "PRECONDITION_REQUIRED"
  | "DATABASE_UNAVAILABLE";

const statusByCode: Record<ApplicationErrorCode, number> = {
  BAD_REQUEST: 400,
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  VERSION_MISMATCH: 412,
  INVALID_TRANSITION: 422,
  VALIDATION_FAILED: 422,
  PRECONDITION_REQUIRED: 428,
  DATABASE_UNAVAILABLE: 503,
};

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly status: number;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: ApplicationErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export function isApplicationError(value: unknown): value is ApplicationError {
  return value instanceof ApplicationError;
}
