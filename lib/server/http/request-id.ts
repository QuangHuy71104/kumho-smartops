const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;

export const REQUEST_ID_HEADER = "x-request-id";

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function createRequestId(): string {
  return `req_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}

export function resolveRequestId(
  candidate: string | null | undefined,
  generate: () => string = createRequestId,
): string {
  if (isValidRequestId(candidate)) return candidate;
  const generated = generate();
  if (!isValidRequestId(generated)) throw new Error("Request ID generator returned an invalid identifier");
  return generated;
}

export function requestIdFromHeaders(headers: Pick<Headers, "get">): string {
  return resolveRequestId(headers.get(REQUEST_ID_HEADER));
}
