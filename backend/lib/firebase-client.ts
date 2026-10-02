"use client";
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

let prepared: ReturnType<typeof getAuth> | undefined;
export async function clientAuth() {
  if (!prepared) {
    const app = getApps()[0] ?? initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    prepared = getAuth(app);
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) {
      connectAuthEmulator(prepared, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL, { disableWarnings: true });
    }
  }
  await setPersistence(prepared, inMemoryPersistence);
  return prepared;
}
