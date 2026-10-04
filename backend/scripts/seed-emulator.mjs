import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { readFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

loadEnvConfig(process.cwd());
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099" || process.env.FIREBASE_DATABASE_EMULATOR_HOST !== "127.0.0.1:9000" || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-kn1ghts") throw new Error("This script only seeds the demo-kn1ghts local Firebase emulators.");
const app = initializeApp({ projectId: "demo-kn1ghts", databaseURL: "https://demo-kn1ghts-default-rtdb.firebaseio.com" });
const auth = getAuth(app), database = getDatabase(app);
// Local accounts use a password chosen in backend/.env.local, never one committed to the repository.
const password = process.env.EMULATOR_SEED_PASSWORD ?? "";
if (password.length < 12) throw new Error("Set EMULATOR_SEED_PASSWORD (12+ characters, local emulators only) in backend/.env.local before seeding.");
for (const [uid, email, role, verified] of [
  ["local-owner", "owner@kn1ghts.test", "owner", true], ["local-editor", "editor@kn1ghts.test", "editor", true],
  ["local-viewer", "viewer@kn1ghts.test", "viewer", true], ["local-unverified", "unverified@kn1ghts.test", "editor", false],
  ["local-outsider", "outsider@kn1ghts.test", null, true],
]) {
  try { await auth.createUser({ uid, email, password, emailVerified: verified }); }
  catch (error) { if (error.code !== "auth/uid-already-exists" && error.code !== "auth/email-already-exists") throw error; }
  if (role) await database.ref(`access/members/${uid}`).set({ uid, email, role, active: true, createdAt: Date.now() });
}
const content = JSON.parse(await readFile(new URL("../content/default.json", import.meta.url), "utf8"));
if (!(await database.ref("cms").get()).exists()) await database.ref("cms").set({ version: 0, draft: content, published: content, publishedAt: Date.now() });
console.log("Local owner: owner@kn1ghts.test\nPassword: the EMULATOR_SEED_PASSWORD value from backend/.env.local\nThese accounts only exist in the emulators.");
await deleteApp(app);
