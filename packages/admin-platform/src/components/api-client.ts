import type { Locale } from "../domain/auth";

/**
 * Matches the shape of the request helper every consuming app already has
 * for its own authenticated JSON fetches (e.g. an `adminApiRequest`/
 * `appApiRequest` that adds a locale query param and a loading indicator).
 * Components in this package take one of these as a prop instead of
 * depending on any specific app's implementation.
 */
export type ApiRequestFn = <T>(
  path: string,
  locale: Locale,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
) => Promise<T>;

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body?: { message?: string } }).body;
    if (body?.message) return body.message;
  }
  return fallback;
}
