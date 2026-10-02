import "server-only";
import { database } from "./firebase-admin";
import { HttpError } from "./http";

export async function rateLimit(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const result = await database().ref(`limits/${key}`).transaction((value: { start: number; count: number } | null) => {
    if (!value || now - value.start >= windowMs) return { start: now, count: 1 };
    if (value.count >= maximum) return undefined;
    return { ...value, count: value.count + 1 };
  });
  if (!result.committed) throw new HttpError(429, "Too many requests. Please wait before trying again.");
}
