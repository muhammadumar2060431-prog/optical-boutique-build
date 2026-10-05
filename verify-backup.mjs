import assert from "node:assert/strict";
import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const folder = resolve(process.argv[2] || "");
const summary = JSON.parse(await readFile(resolve(folder, "summary.json"), "utf8"));
assert.equal(summary.verifiedReadable, true);
assert.equal(summary.dataStableDuringExport, true);
const protectedKey = await readFile(resolve(folder, "key.dpapi"));
const command =
  "Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($p))";
const unprotect = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-Command", command],
  { input: protectedKey.toString("base64"), encoding: "utf8", windowsHide: true },
);
assert.equal(unprotect.status, 0);
const key = Buffer.from(unprotect.stdout.trim(), "base64");
function decrypt(bytes) {
  const cipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((name) => [name, canonical(value[name])]),
    );
  return value;
}
const manifest = JSON.parse(
  decrypt(await readFile(resolve(folder, "manifest.enc"))).toString("utf8"),
);
const tables = JSON.parse(decrypt(await readFile(resolve(folder, "tables.enc"))).toString("utf8"));
assert.deepEqual(tables, manifest.tables);
const target = resolve(".tmp", "restore-verification", randomUUID());
await mkdir(target, { recursive: true });
const db = await PGlite.create();
let restoredRows = 0;
try {
  // Rehearse row payload restoration in memory, not against the production database.
  await db.exec(
    "CREATE TABLE restored_rows (table_name TEXT,position INTEGER,payload JSONB,PRIMARY KEY(table_name,position));",
  );
  for (const [table, rows] of Object.entries(tables)) {
    assert.equal(rows.length, summary.rowCounts[table]);
    for (let position = 0; position < rows.length; position++) {
      await db.query("INSERT INTO restored_rows VALUES ($1,$2,$3::jsonb)", [
        table,
        position,
        JSON.stringify(rows[position]),
      ]);
      restoredRows++;
    }
    const result = await db.query(
      "SELECT payload FROM restored_rows WHERE table_name=$1 ORDER BY position",
      [table],
    );
    assert.equal(
      hash(JSON.stringify(canonical(result.rows.map((row) => row.payload)))),
      hash(JSON.stringify(canonical(rows))),
    );
  }
  const verified = new Set();
  let storageBytes = 0;
  for (const object of manifest.objects) {
    assert.match(object.sha256, /^[a-f0-9]{64}$/);
    if (!verified.has(object.sha256)) {
      const bytes = decrypt(await readFile(resolve(folder, "objects", `${object.sha256}.enc`)));
      assert.equal(hash(bytes), object.sha256);
      // Public images may be written locally; private objects are rehearsed only in memory.
      if (object.public) {
        const path = resolve(target, `${object.sha256}.bin`);
        await writeFile(path, bytes);
        assert.equal(hash(await readFile(path)), object.sha256);
      }
      verified.add(object.sha256);
    }
    storageBytes += object.bytes;
  }
  assert.equal(manifest.objects.length, summary.objectCount);
  assert.equal(storageBytes, summary.objectBytes);
  const result = {
    checkedAt: new Date().toISOString(),
    backupFolder: folder,
    rehearsalFolder: target,
    restoredTables: Object.keys(tables).length,
    restoredRows,
    restoredStorageObjects: manifest.objects.length,
    uniqueContents: verified.size,
    storageBytes,
    rowPayloadRoundTripVerified: true,
    storageByteRestoreVerified: true,
    fullSchemaAuthRestoreVerified: false,
    keyPortability: "Windows CurrentUser DPAPI; keep this Windows profile/key available",
  };
  await writeFile(resolve(folder, "restore-verification.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  key.fill(0);
  await db.close();
}
