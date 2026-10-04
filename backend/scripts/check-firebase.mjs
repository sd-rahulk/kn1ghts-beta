import nextEnv from "@next/env";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { mkdir, writeFile } from "node:fs/promises";
import ts from "typescript";

nextEnv.loadEnvConfig(process.cwd());
const repair = process.argv.includes("--repair-index");
// The rules endpoint documents no conditional write, so a repair can only be made atomic when the server
// returns an ETag for the rules. Without one, overwriting needs an explicit acknowledgement that no other
// rules deployment is running; otherwise newer rules could be replaced by the snapshot read here.
const unconditional = process.argv.includes("--allow-unconditional-rules-write");
let app;
try {
  app = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, databaseURL: process.env.FIREBASE_DATABASE_URL, credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) }, "configuration-check");
  const database = getDatabase(app);
  const token = await app.options.credential.getAccessToken();
  const rulesUrl = new URL(".settings/rules.json", process.env.FIREBASE_DATABASE_URL.replace(/\/?$/, "/"));
  const authorization = { Authorization: `Bearer ${token.access_token}` };
  const getRules = async () => {
    const response = await fetch(rulesUrl, { headers: { ...authorization, "X-Firebase-ETag": "true" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Unable to read Firebase rules (${response.status}); no rules were changed.`);
    const raw = await response.text();
    const parsed = ts.parseConfigFileTextToJson("database.rules.json", raw);
    if (parsed.error || !parsed.config?.rules) throw new Error("Unable to parse the existing rules safely; no rules were changed.");
    return { raw, rules: parsed.config, etag: response.headers.get("etag") };
  };
  const canonical = (value) => JSON.stringify(value, (_key, entry) => entry && typeof entry === "object" && !Array.isArray(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry);
  const inboxIndexes = (rules) => {
    const existing = rules.rules.messages?.[".indexOn"];
    const indexes = typeof existing === "string" ? [existing] : existing ?? [];
    if (!Array.isArray(indexes)) throw new Error("Unexpected inbox index configuration; no rules were changed.");
    return indexes;
  };

  // A query without an index still succeeds (Firebase filters client-side), so the deployed rules are
  // the only reliable evidence that the inbox index exists.
  let deployed = await getRules();
  if (!inboxIndexes(deployed.rules).includes("createdAt")) {
    if (!repair) throw new Error("The deployed rules have no messages/.indexOn createdAt index. Deploy database.rules.json, or rerun with --repair-index.");
    await mkdir(".firebase", { recursive: true });
    await writeFile(`.firebase/rules-before-inbox-index-${Date.now()}.json`, deployed.raw);
    const fresh = await getRules();
    if (canonical(fresh.rules) !== canonical(deployed.rules)) throw new Error("Rules changed during the check; retry before updating them.");
    const rules = fresh.rules;
    rules.rules.messages = { ...(rules.rules.messages ?? {}), ".indexOn": [...inboxIndexes(rules), "createdAt"] };
    if (fresh.etag) {
      const response = await fetch(rulesUrl, { method: "PUT", headers: { ...authorization, "Content-Type": "application/json", "if-match": fresh.etag }, body: JSON.stringify(rules), signal: AbortSignal.timeout(15000) });
      if (response.status === 412) throw new Error("Rules changed before the update was applied; no rules were changed. Retry the repair.");
      if (!response.ok) throw new Error(`Unable to update Firebase rules (${response.status}).`);
    } else if (unconditional) {
      await database.setRules(rules);
    } else {
      throw new Error("Firebase did not return a version tag for the rules, so they cannot be updated without risking a concurrent deployment being overwritten. No rules were changed. Deploy database.rules.json with the Firebase CLI, or rerun with --repair-index --allow-unconditional-rules-write when no other rules deployment is in progress.");
    }
    deployed = await getRules();
    if (canonical(deployed.rules) !== canonical(rules)) throw new Error("The rules read back after the update differ from the rules written; review them in the Firebase console.");
    console.log("Added messages/createdAt index; preserved existing read/write permissions and other rules.");
  } else console.log("Inbox index exists in the deployed rules.");
  const snapshot = await database.ref("messages").orderByChild("createdAt").limitToLast(100).get();
  console.log("Inbox query succeeded. Messages returned:", snapshot.numChildren());
} catch (error) {
  console.error(error.code ?? error.name, error.message);
  process.exitCode = 1;
} finally { if (app) await deleteApp(app); }
