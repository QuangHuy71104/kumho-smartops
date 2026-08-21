import { isApplicationError } from "../../../modules/shared/application/errors.ts";
import { ServerConfigurationError } from "../config-schema.ts";
import { isValidRequestId, resolveRequestId, REQUEST_ID_HEADER } from "./request-id.ts";

export type ProblemFieldError = Readonly<{
  field: string;
  code: string;
  message?: string;
}>;

export type ProblemDetails = Readonly<{
  type: string;
  title: string;
  status: number;
  code: string;
  requestId: string;
  detail?: string;
  instance?: string;
  errors?: readonly ProblemFieldError[];
}>;

export type ProblemOptions = Readonly<{
  status: number;
  code: string;
  title?: string;
  detail?: string;
  instance?: string;
  errors?: readonly ProblemFieldError[];
}>;

const STATUS_TITLES: Readonly<Record<number, string>> = {
  400: "Yêu cầu không hợp lệ",
  401: "Chưa xác thực",
  403: "Không có quyền truy cập",
  404: "Không tìm thấy tài nguyên",
  409: "Xung đột dữ liệu",
  412: "Phiên bản dữ liệu đã thay đổi",
  422: "Không thể xử lý yêu cầu",
  428: "Yêu cầu điều kiện cập nhật",
  429: "Quá nhiều yêu cầu",
  500: "Lỗi hệ thống",
  503: "Dịch vụ tạm thời chưa sẵn sàng",
};

const PROBLEM_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/u;
const FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/u;

function safeText(value: string, maximum: number) {
  const withoutControls = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? " " : character;
  }).join("");
  return withoutControls.trim().slice(0, maximum);
}

function validateStatus(status: number) {
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new TypeError("Problem status must be an HTTP error status");
  }
}

function validateCode(code: string) {
  if (!PROBLEM_CODE_PATTERN.test(code)) throw new TypeError("Problem code is invalid");
}

function normalizeErrors(errors: readonly ProblemFieldError[] | undefined) {
  if (!errors) return undefined;
  if (errors.length > 50) throw new TypeError("Problem field error limit exceeded");
  return Object.freeze(errors.map((error) => {
    if (!FIELD_PATTERN.test(error.field) || !PROBLEM_CODE_PATTERN.test(error.code)) {
      throw new TypeError("Problem field error is invalid");
    }
    const message = error.message ? safeText(error.message, 240) : undefined;
    return Object.freeze({ field: error.field, code: error.code, ...(message ? { message } : {}) });
  }));
}

function normalizeInstance(instance: string | undefined) {
  if (!instance) return undefined;
  if (!instance.startsWith("/") || instance.includes("?") || instance.includes("#") || instance.length > 240) {
    throw new TypeError("Problem instance must be a bounded path without query data");
  }
  return instance;
}

export class HttpProblem extends Error {
  readonly options: ProblemOptions;

  constructor(options: ProblemOptions) {
    super(options.detail ?? options.title ?? STATUS_TITLES[options.status] ?? "Request failed");
    this.name = "HttpProblem";
    this.options = options;
  }
}

export function createProblemDetails(options: ProblemOptions, requestIdCandidate?: string): ProblemDetails {
  validateStatus(options.status);
  validateCode(options.code);
  const requestId = isValidRequestId(requestIdCandidate)
    ? requestIdCandidate
    : resolveRequestId(undefined);
  const title = safeText(options.title ?? STATUS_TITLES[options.status] ?? "Request failed", 120);
  const detail = options.detail ? safeText(options.detail, 500) : undefined;
  const instance = normalizeInstance(options.instance);
  const errors = normalizeErrors(options.errors);
  const type = `urn:ksops:problem:${options.code.toLocaleLowerCase("en-US").replaceAll("_", "-")}`;

  return Object.freeze({
    type,
    title,
    status: options.status,
    code: options.code,
    requestId,
    ...(detail ? { detail } : {}),
    ...(instance ? { instance } : {}),
    ...(errors ? { errors } : {}),
  });
}

export function problemResponse(
  options: ProblemOptions,
  requestId?: string,
  responseHeaders?: HeadersInit,
): Response {
  const problem = createProblemDetails(options, requestId);
  const headers = new Headers(responseHeaders);
  headers.set("content-type", "application/problem+json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set(REQUEST_ID_HEADER, problem.requestId);
  return new Response(JSON.stringify(problem), { status: problem.status, headers });
}

export function errorProblemResponse(error: unknown, requestId?: string): Response {
  if (error instanceof HttpProblem) return problemResponse(error.options, requestId);
  if (error instanceof ServerConfigurationError) {
    return problemResponse({
      status: 503,
      code: "PILOT_NOT_CONFIGURED",
      detail: "API nghiệp vụ chưa được cấu hình cho môi trường này.",
    }, requestId);
  }
  if (isApplicationError(error)) {
    const fields = Array.isArray(error.details?.fields)
      ? error.details.fields.filter((field): field is string => typeof field === "string")
      : [];
    return problemResponse({
      status: error.status,
      code: error.code,
      detail: error.message,
      ...(fields.length
        ? { errors: fields.slice(0, 50).map((field) => ({ field, code: "INVALID" })) }
        : {}),
    }, requestId);
  }
  return problemResponse({
    status: 500,
    code: "INTERNAL_ERROR",
    detail: "Hệ thống không thể hoàn tất yêu cầu. Hãy thử lại sau.",
  }, requestId);
}
