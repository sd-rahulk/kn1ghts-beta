"use client";
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
let csrfPromise: Promise<string> | undefined;
function csrfToken() {
  csrfPromise ??= fetch("/api/auth/csrf", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("Unable to verify this request. Refresh and try again.");
    return (await response.json()).token as string;
  }).catch((error) => { csrfPromise = undefined; throw error; });
  return csrfPromise;
}
export async function api<T>(path: string, method = "GET", body?: unknown, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    headers["X-CSRF-Token"] = await csrfToken();
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, { method, headers, cache: "no-store", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  // A proxy or platform error page may not be JSON; keep the generic message instead of a parser error.
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) csrfPromise = undefined;
    // The CSRF check runs before any change is made, so one retry with a fresh token is safe.
    if (response.status === 403 && result.code === "csrf" && method !== "GET" && !retried) return api<T>(path, method, body, true);
    throw new ApiError(result.error || "The request could not be completed.", response.status);
  }
  return result as T;
}
