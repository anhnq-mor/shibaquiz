import { apiFetch } from "@/components/api-activity";
import type { Locale } from "@/domain/common/locale";

export interface AdminApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
}

export class AdminApiRequestError extends Error {
  constructor(readonly body: AdminApiError | undefined) {
    super(body?.message ?? "request_failed");
  }
}

export async function adminApiRequest<T>(
  path: string,
  locale: Locale,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
): Promise<T> {
  const url = `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
  const method = init?.method ?? "POST";
  const requestInit: RequestInit = { method };
  if (init?.body !== undefined) {
    requestInit.headers = { "Content-Type": "application/json" };
    requestInit.body = JSON.stringify(init.body);
  }
  const response = await apiFetch(url, requestInit);
  const data = (await response.json().catch(() => undefined)) as
    T | AdminApiError | undefined;
  if (!response.ok) {
    throw new AdminApiRequestError(data as AdminApiError | undefined);
  }
  return data as T;
}
