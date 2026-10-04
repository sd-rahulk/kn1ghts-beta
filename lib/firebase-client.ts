"use client";
import { getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";

let prepared: ReturnType<typeof getAuth> | undefined;
let preparation: Promise<ReturnType<typeof getAuth>> | undefined;

export function clientAuth() {
  if (preparation) return preparation;
  preparation = (async () => {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    if (!config.apiKey || !config.authDomain || !config.projectId) throw new Error("Public account access is not configured yet.");
    const app = getApps()[0] ?? initializeApp(config);
    prepared = getAuth(app);
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) {
      connectAuthEmulator(prepared, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL, { disableWarnings: true });
    }
    await setPersistence(prepared, browserLocalPersistence);
    return prepared;
  })();
  return preparation;
}
