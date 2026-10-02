import nextEnv from "@next/env";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { mkdir, writeFile } from "node:fs/promises";
import ts from "typescript";

nextEnv.loadEnvConfig(process.cwd());
let app;
try {
  app = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, databaseURL: process.env.FIREBASE_DATABASE_URL, credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) }, "configuration-check");
  const database = getDatabase(app);
  if (process.argv.includes("--repair-index")) {
    const token = await app.options.credential.getAccessToken();
    const rulesUrl = new URL(".settings/rules.json", process.env.FIREBASE_DATABASE_URL.replace(/\/?$/, "/"));
    let rawRules = "";
    const getRules = async () => {
      const response = await fetch(rulesUrl, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Unable to read Firebase rules (${response.status}); no rules were changed.`);
      rawRules = await response.text();
      const parsed = ts.parseConfigFileTextToJson("database.rules.json", rawRules);
      if (parsed.error || !parsed.config?.rules) throw new Error("Unable to parse the existing rules safely; no rules were changed.");
      return parsed.config;
    };
    const rules = await getRules();
    const previous = JSON.stringify(rules);
    const messages = rules.rules.messages ?? {};
    const existing = messages[".indexOn"];
    const indexes = typeof existing === "string" ? [existing] : existing ?? [];
    if (!Array.isArray(indexes)) throw new Error("Unexpected inbox index configuration; no rules were changed.");
    if (!indexes.includes("createdAt")) {
      await mkdir(".firebase", { recursive: true });
      await writeFile(`.firebase/rules-before-inbox-index-${Date.now()}.json`, rawRules);
      if (JSON.stringify(await getRules()) !== previous) throw new Error("Rules changed during the check; retry before updating them.");
      rules.rules.messages = { ...messages, ".indexOn": [...indexes, "createdAt"] };
      await database.setRules(rules);
      console.log("Added messages/createdAt index; preserved existing read/write permissions and other rules.");
    } else console.log("Inbox index already exists.");
  }
  const snapshot = await database.ref("messages").orderByChild("createdAt").limitToLast(100).get();
  console.log("Inbox query succeeded. Messages returned:", snapshot.numChildren());
} catch (error) {
  console.error(error.code ?? error.name, error.message);
  process.exitCode = 1;
} finally { if (app) await deleteApp(app); }
