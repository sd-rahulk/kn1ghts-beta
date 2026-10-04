import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// firebase-admin.ts is server-only, so evaluate configuration() in a react-server child process
// with a controlled environment instead of whatever the developer's shell provides.
function configuration(env: Record<string, string>) {
  const base = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "key", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
    FIREBASE_DATABASE_URL: "https://project-default-rtdb.firebaseio.com", ADMIN_ORIGIN: "https://admin.example.com", PUBLIC_SITE_ORIGIN: "https://www.example.com",
    CONTACT_API_SECRET: "c".repeat(32), PLATFORM_API_SECRET: "g".repeat(32), PREVIEW_SECRET: "p".repeat(32), FIREBASE_CLIENT_EMAIL: "service@project.iam.gserviceaccount.com", FIREBASE_PRIVATE_KEY: "test-key",
  };
  const output = execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e",
    "const { configuration } = await import('./lib/firebase-admin.ts'); console.log(JSON.stringify(configuration()));"],
  { cwd: process.cwd(), encoding: "utf8", timeout: 30000, env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "", NODE_ENV: "test", ...base, ...env } as NodeJS.ProcessEnv });
  return JSON.parse(output.trim().split("\n").at(-1)!) as { ready: boolean; missing: string[]; emulator: boolean };
}

test("production with real credentials and no emulator variables is ready", () => {
  assert.equal(configuration({ NODE_ENV: "production" }).ready, true);
});
test("production refuses any single Firebase emulator variable", () => {
  for (const key of ["FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_DATABASE_EMULATOR_HOST", "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL"]) {
    const status = configuration({ NODE_ENV: "production", [key]: "127.0.0.1:9099" });
    assert.equal(status.ready, false, key);
    assert.ok(status.missing.some((entry) => entry.includes(key)), key);
  }
});
test("a half-configured emulator pair is refused outside production", () => {
  const status = configuration({ NODE_ENV: "development", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" });
  assert.equal(status.ready, false);
  assert.equal(configuration({ NODE_ENV: "development", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000" }).emulator, true);
});
