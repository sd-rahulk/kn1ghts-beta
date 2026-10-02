import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

loadEnvConfig(process.cwd());
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Usage: npm run bootstrap -- your-owner@email.com");
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_DATABASE_EMULATOR_HOST) throw new Error("Use seed:emulator for local accounts. Bootstrap is for real Firebase.");
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_DATABASE_URL || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) throw new Error("Fill in backend/.env.local first.");
const app = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, databaseURL: process.env.FIREBASE_DATABASE_URL, credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const auth = getAuth(), database = getDatabase();
const members = (await database.ref("access/members").get()).val() || {};
if (Object.values(members).some((member) => member.active && member.role === "owner")) throw new Error("An owner already exists. Grant additional access through the dashboard.");
let user;
try { user = await auth.getUserByEmail(email); }
catch (error) { if (error.code !== "auth/user-not-found") throw error; user = await auth.createUser({ email }); }
const result = await database.ref("access").transaction((current) => {
  if (Object.values(current?.members || {}).some((member) => member.active && member.role === "owner")) return undefined;
  return { ...(current || {}), members: { ...(current?.members || {}), [user.uid]: { uid: user.uid, email, role: "owner", active: true, createdAt: Date.now() } } };
});
if (!result.committed) throw new Error("Another owner was bootstrapped first. No access record was overwritten.");
console.log(`Owner access granted to ${email}. Use the login screen to set up your password, then verify your email.`);
await deleteApp(app);
