import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteDatabaseRecord, updateInquiryStatus } from "../src/lib/database-delete.ts";
import { createMutationQueue } from "../src/lib/mutation-queue.ts";

function mockClient(
  config: {
    admin?: boolean;
    signedIn?: boolean;
    linked?: string;
    missing?: boolean;
    error?: boolean;
    returnedRows?: number;
    alreadyDeleted?: boolean;
    missingQuery?: boolean;
  } = {},
) {
  const writes: { table: string; kind: string; filters: [string, unknown][]; patch?: unknown }[] =
    [];
  const reads: string[] = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: config.signedIn === false ? null : { id: "admin" } },
        error: null,
      }),
    },
    rpc: async () => ({ data: config.admin !== false, error: null }),
    from: (table: string) => {
      let kind = "select";
      let patch: unknown;
      const filters: [string, unknown][] = [];
      const result = () => {
        if (kind === "select") {
          reads.push(table);
          return { data: config.linked === table ? [{ id: "linked" }] : [], error: null };
        }
        writes.push({ table, kind, filters, patch });
        return {
          data: Array.from({ length: config.returnedRows ?? 1 }, () => ({ id: "item" })),
          error: config.error ? new Error("Database rejected mutation") : null,
        };
      };
      const query = {
        select: () => query,
        limit: () => query,
        eq: (key: string, value: unknown) => {
          filters.push([key, value]);
          return query;
        },
        is: (key: string, value: unknown) => {
          filters.push([key, value]);
          return query;
        },
        contains: (key: string, value: unknown) => {
          filters.push([key, value]);
          return query;
        },
        delete: () => {
          kind = "delete";
          return query;
        },
        update: (value: unknown) => {
          kind = "update";
          patch = value;
          return query;
        },
        maybeSingle: async () => ({
          data:
            config.missing || (config.missingQuery && table === "queries")
              ? null
              : { id: "item", deleted_at: config.alreadyDeleted ? "2026-10-01" : null },
          error: null,
        }),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, writes, reads };
}

describe("database deletion safety", () => {
  it("does not mutate without a signed-in administrator", async () => {
    for (const config of [{ signedIn: false }, { admin: false }]) {
      const mock = mockClient(config);
      await assert.rejects(deleteDatabaseRecord(mock.client, "products", "item"));
      assert.equal(mock.writes.length, 0);
    }
  });
  it("rejects invalid IDs without writing", async () => {
    const mock = mockClient();
    await assert.rejects(deleteDatabaseRecord(mock.client, "products", " "));
    assert.equal(mock.writes.length, 0);
  });
  it("blocks category deletion rather than cascading into linked records", async () => {
    for (const linked of ["products", "collections"]) {
      const mock = mockClient({ linked });
      await assert.rejects(deleteDatabaseRecord(mock.client, "categories", "item"), /Move linked/);
      assert.equal(mock.writes.length, 0);
    }
  });
  it("checks product array relationships before deleting a collection", async () => {
    const mock = mockClient({ linked: "products" });
    await assert.rejects(deleteDatabaseRecord(mock.client, "collections", "item"), /Move linked/);
    assert.equal(mock.writes.length, 0);
  });
  it("deletes only the requested record and requires a returned row", async () => {
    const mock = mockClient();
    assert.equal(await deleteDatabaseRecord(mock.client, "products", "item"), true);
    assert.deepEqual(mock.writes, [
      { table: "products", kind: "delete", filters: [["id", "item"]], patch: undefined },
    ]);
  });
  it("does not report success for rejected or zero-row mutations", async () => {
    for (const config of [{ error: true }, { returnedRows: 0 }]) {
      const mock = mockClient(config);
      await assert.rejects(deleteDatabaseRecord(mock.client, "brands", "item"));
    }
  });
  it("treats an already absent record as idempotent only after admin verification", async () => {
    const mock = mockClient({ missing: true });
    assert.equal(await deleteDatabaseRecord(mock.client, "brands", "item"), true);
    assert.equal(mock.writes.length, 0);
  });
  it("preserves enquiry history using a soft delete", async () => {
    const mock = mockClient();
    assert.equal(await deleteDatabaseRecord(mock.client, "queries", "item"), true);
    assert.equal(mock.writes[0]?.kind, "update");
    assert.deepEqual(mock.writes[0]?.filters, [
      ["id", "item"],
      ["deleted_at", null],
    ]);
    assert.ok((mock.writes[0]?.patch as { deleted_at: string }).deleted_at);
  });
  it("cannot delete a customer order when deleting a legacy form enquiry", async () => {
    const mock = mockClient();
    await deleteDatabaseRecord(mock.client, "orders", "item");
    assert.ok(mock.writes[0]?.filters.some(([key, value]) => key === "source" && value === "form"));
  });
  it("does not rewrite an already soft-deleted record", async () => {
    const mock = mockClient({ alreadyDeleted: true });
    assert.equal(await deleteDatabaseRecord(mock.client, "queries", "item"), true);
    assert.equal(mock.writes.length, 0);
  });
});

describe("inquiry status safety", () => {
  it("updates only the query even if an order shares its ID", async () => {
    const mock = mockClient();
    assert.equal(await updateInquiryStatus(mock.client, "item", "Responded"), true);
    assert.equal(mock.writes.length, 1);
    assert.equal(mock.writes[0]?.table, "queries");
  });
  it("restricts legacy order inquiries to their form source", async () => {
    const mock = mockClient({ missingQuery: true });
    await updateInquiryStatus(mock.client, "item", "Archived");
    assert.equal(mock.writes[0]?.table, "orders");
    assert.ok(mock.writes[0]?.filters.some(([key, value]) => key === "source" && value === "form"));
  });
  it("rejects unconfirmed and unauthorized updates", async () => {
    for (const config of [{ admin: false }, { returnedRows: 0 }, { error: true }]) {
      const mock = mockClient(config);
      await assert.rejects(updateInquiryStatus(mock.client, "item", "Responded"));
    }
  });
});

describe("product mutation ordering", () => {
  it("waits for earlier saves before deleting the same product", async () => {
    const enqueue = createMutationQueue();
    const events: string[] = [];
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = enqueue("product", async () => {
      await wait;
      events.push("saved");
    });
    const remove = enqueue("product", async () => {
      events.push("deleted");
    });
    assert.deepEqual(events, []);
    release();
    await Promise.all([save, remove]);
    assert.deepEqual(events, ["saved", "deleted"]);
  });
  it("a failed save does not prevent the subsequent deletion", async () => {
    const enqueue = createMutationQueue();
    const failure = enqueue("product", async () => {
      throw new Error("failed");
    });
    const deletion = enqueue("product", async () => "deleted");
    await assert.rejects(failure);
    assert.equal(await deletion, "deleted");
  });
});
