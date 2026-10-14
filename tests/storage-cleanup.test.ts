import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  processStorageCleanup,
  storageObjectExists,
  type StorageCleanupBackend,
} from "../src/lib/storage-cleanup.ts";

describe("storage verification without unsupported HEAD requests", () => {
  it("checks the exact name in its folder, not similar filenames", async () => {
    assert.equal(
      await storageObjectExists("hero/a.webp", async (folder, options) => {
        assert.equal(folder, "hero");
        assert.deepEqual(options, { search: "a.webp", limit: 1000 });
        return { data: [{ name: "a.webp.backup" }], error: null };
      }),
      false,
    );
    assert.equal(
      await storageObjectExists("hero/a.webp", async () => ({
        data: [{ name: "a.webp" }],
        error: null,
      })),
      true,
    );
  });
  it("retains failures and missing listing responses as unconfirmed", async () => {
    await assert.rejects(
      storageObjectExists("hero/a.webp", async () => ({
        data: null,
        error: new Error("Unavailable"),
      })),
      /Unavailable/,
    );
    await assert.rejects(
      storageObjectExists("hero/a.webp", async () => ({ data: null, error: null })),
      /could not be verified/,
    );
  });
  it("does not infer absence from truncated results", async () => {
    await assert.rejects(
      storageObjectExists("hero/a.webp", async () => ({
        data: Array.from({ length: 1000 }, () => ({ name: "other" })),
        error: null,
      })),
      /incomplete/,
    );
  });
});

function backend(paths: string[]) {
  const removed: string[][] = [];
  const finished: Array<{ paths: string[]; error: string | null }> = [];
  const api: StorageCleanupBackend = {
    claim: async () => paths,
    remove: async (entries) => {
      removed.push(entries);
    },
    exists: async () => false,
    finish: async (entries, error) => {
      finished.push({ paths: entries, error });
    },
  };
  return { api, removed, finished };
}
describe("confirmed deleted-record storage cleanup", () => {
  it("removes only database-claimed paths and confirms absence before finishing", async () => {
    const fixture = backend(["hero/deleted.webp"]);
    assert.deepEqual(await processStorageCleanup(fixture.api), {
      claimed: 1,
      removed: 1,
      retrying: 0,
    });
    assert.deepEqual(fixture.removed, [["hero/deleted.webp"]]);
    assert.deepEqual(fixture.finished, [{ paths: ["hero/deleted.webp"], error: null }]);
  });
  it("does not touch storage when no deleted-record files are eligible", async () => {
    const fixture = backend([]);
    assert.equal((await processStorageCleanup(fixture.api)).removed, 0);
    assert.deepEqual(fixture.removed, []);
  });
  it("retains failed deletion claims for retry instead of marking files removed", async () => {
    const fixture = backend(["brands/deleted.webp"]);
    fixture.api.remove = async () => {
      throw new Error("Network failure");
    };
    assert.deepEqual(await processStorageCleanup(fixture.api), {
      claimed: 1,
      removed: 0,
      retrying: 1,
    });
    assert.notEqual(fixture.finished[0]?.error, null);
  });
  it("retains partially removed and unverified files for retry", async () => {
    const fixture = backend(["hero/removed.webp", "hero/retained.webp", "hero/unknown.webp"]);
    fixture.api.exists = async (path) => {
      if (path.endsWith("unknown.webp")) throw new Error("Cannot confirm");
      return path.endsWith("retained.webp");
    };
    assert.deepEqual(await processStorageCleanup(fixture.api), {
      claimed: 3,
      removed: 1,
      retrying: 2,
    });
    assert.deepEqual(fixture.finished[0], { paths: ["hero/removed.webp"], error: null });
    assert.deepEqual(fixture.finished[1]?.paths, ["hero/retained.webp", "hero/unknown.webp"]);
  });
  it("stops before removing anything when reference checks fail", async () => {
    const fixture = backend(["hero/unsafe.webp"]);
    fixture.api.claim = async () => {
      throw new Error("Reference lookup unavailable");
    };
    await assert.rejects(processStorageCleanup(fixture.api));
    assert.deepEqual(fixture.removed, []);
  });
});
