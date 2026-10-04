import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const EMULATOR_VARIABLES =["FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_DATABASE_EMULATOR_HOST", "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL"] as const;
export function configuration() {
  // The Admin SDK honours each emulator variable on its own: an auth emulator accepts unsigned tokens,
  // so any one of them in production (or a half-configured pair elsewhere) must keep the backend closed.
  const emulators = EMULATOR_VARIABLES.filter((key) => process.env[key]);
  const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST);
  const missing = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "FIREBASE_DATABASE_URL", "ADMIN_ORIGIN", "PUBLIC_SITE_ORIGIN", "CONTACT_API_SECRET", "PLATFORM_API_SECRET", "PREVIEW_SECRET"]
    .filter((key) => !process.env[key]);
  if (!emulator) for (const key of ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) if (!process.env[key]) missing.push(key);
  if (process.env.NODE_ENV === "production" && emulators.length) missing.push(`Disable Firebase emulators in production (remove ${emulators.join(", ")})`);
  else if (Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) !== Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST)) missing.push("Set both FIREBASE_AUTH_EMULATOR_HOST and FIREBASE_DATABASE_EMULATOR_HOST, or neither");
  for (const key of ["CONTACT_API_SECRET", "PLATFORM_API_SECRET", "PREVIEW_SECRET"]) if (process.env[key] && process.env[key]!.length < 32) missing.push(`${key} must contain at least 32 characters`);
  for (const key of ["ADMIN_ORIGIN", "PUBLIC_SITE_ORIGIN"]) {
    if (!process.env[key]) continue;
    try {
      const url = new URL(process.env[key]!);
      if (url.origin !== process.env[key] || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) missing.push(`${key} must be a canonical ${process.env.NODE_ENV === "production" ? "HTTPS " : ""}origin without a trailing slash`);
    } catch { missing.push(`${key} must be a valid origin`); }
  }
  return { ready: missing.length === 0, missing, emulator };
}

function app() {
  const status = configuration();
  if (!status.ready) throw new Error("Firebase backend is not configured.");
  return getApps().find((entry) => entry.name === "kn1ghts-admin") ?? initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    ...(status.emulator ? {} : { credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }) }),
  }, "kn1ghts-admin");
}
export const adminAuth = () => getAuth(app());
export const database = () => getDatabase(app());
