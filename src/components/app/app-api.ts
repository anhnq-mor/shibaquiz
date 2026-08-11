import { apiFetch } from "@/components/api-activity";
import type { Locale } from "@/domain/common/locale";

export interface AppApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
}

export class AppApiRequestError extends Error {
  constructor(readonly body: AppApiError | undefined) {
    super(body?.message ?? "request_failed");
  }
}

export async function appApiRequest<T>(
  path: string,
  locale: Locale,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    /**
     * Skip the global full-screen loading overlay. Use for frequent
     * background requests (autosave, per-question check) where a
     * page-wide loading state would be distracting rather than helpful.
     */
    silent?: boolean;
  },
): Promise<T> {
  const url = `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
  const method = init?.method ?? "POST";
  const requestInit: RequestInit = { method };
  if (init?.body !== undefined) {
    requestInit.headers = { "Content-Type": "application/json" };
    requestInit.body = JSON.stringify(init.body);
  }
  const response = await (init?.silent ? fetch : apiFetch)(url, requestInit);
  const data = (await response.json().catch(() => undefined)) as
    T | AppApiError | undefined;
  if (!response.ok) {
    throw new AppApiRequestError(data as AppApiError | undefined);
  }
  return data as T;
}
