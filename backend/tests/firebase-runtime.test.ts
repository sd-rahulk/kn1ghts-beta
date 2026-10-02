import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("Firebase Auth loads and resolves signing keys without native require(ESM)", () => {
  const output = execFileSync(process.execPath, ["--no-experimental-require-module", "-e", `
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    assert.equal(typeof require('firebase-admin/auth').getAuth, 'function');
    assert.equal(typeof require('firebase-admin/app').initializeApp, 'function');
    assert.equal(typeof require('firebase-admin/database').getDatabase, 'function');
    const jwks = require('jwks-rsa');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'runtime-test', use: 'sig', alg: 'RS256' };
    const client = jwks({ jwksUri: 'https://example.invalid/jwks', getKeysInterceptor: async () => [jwk] });
    client.getSigningKey('runtime-test').then(key => {
      const payload = Buffer.from('Firebase JWKS compatibility test');
      const signature = crypto.sign('RSA-SHA256', payload, privateKey);
      assert.ok(crypto.verify('RSA-SHA256', payload, key.getPublicKey(), signature));
      console.log('Firebase startup and JWKS signature verification passed');
    }).catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 15000 });
  assert.match(output, /JWKS signature verification passed/);
});
