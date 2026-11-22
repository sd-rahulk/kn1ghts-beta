/**
 * Create an unpublished, randomized weekly CTF starter.
 * The generated flag is private: never commit or publish this JSON file.
 */
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function makeWeeklyChallenge({ token = randomBytes(16).toString("hex"), now = Date.now() } = {}) {
  if (!/^[a-f0-9]{32}$/.test(token)) throw new Error("Expected a random 32-character hexadecimal token.");
  const flag = `KN1GHTS{${token}}`;
  const transmission = Buffer.from(flag, "utf8").toString("base64");
  return {
    slug: "tiny-signal-01",
    title: "Tiny Signal — The First Transmission",
    description: [
      "A lost message was found in a little radio log. It looks like ordinary text, but the sender encoded it with Base64.",
      "Decode the transmission and submit the result exactly as written:",
      transmission,
      "Format: KN1GHTS{...}. No brute force or scanning is required.",
    ].join("\n\n"),
    category: "Misc",
    difficulty: "beginner",
    resourceUrl: "",
    opensAt: now + 24 * 60 * 60 * 1000,
    closesAt: null,
    status: "draft",
    flag,
  };
}

async function main() {
  const challenge = makeWeeklyChallenge();
  const folder = path.resolve(process.cwd(), ".private");
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const filename = path.join(folder, "weekly-challenge-draft.json");
  await writeFile(filename, JSON.stringify(challenge, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log("Private weekly CTF draft created at .private/weekly-challenge-draft.json");
  console.log("Copy the draft into the management app, verify in an emulator, then decide when to publish.");
  console.log("The flag is intentionally NOT printed. Never commit the generated JSON.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.code === "EEXIST" ?
      "A draft already exists; delete or archive it privately before generating another." :
      "Unable to create private weekly challenge draft.");
    process.exitCode = 1;
  });
}
