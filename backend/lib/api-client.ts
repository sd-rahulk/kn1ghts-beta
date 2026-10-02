"use client";
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
let csrfPromise: Promise<string> | undefined;
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") {
    csrfPromise ??= fetch("/api/auth/csrf", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to verify this request. Refresh and try again.");
      return (await response.json()).token as string;
    }).catch((error) => { csrfPromise = undefined; throw error; });
    headers["X-CSRF-Token"] = await csrfPromise;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, { method, headers, cache: "no-store", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 403) csrfPromise = undefined;
    throw new ApiError(result.error || "The request could not be completed.", response.status);
  }
  return result as T;
}
