import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAnnouncementRecord } from "../src/lib/announcements.ts";

describe("announcement database mapping", () => {
  it("loads the saved messages, enabled state, and colours", () => {
    assert.deepEqual(
      mapAnnouncementRecord({
        enabled: true,
        messages: ["Free delivery", "20% off"],
        background: "#0E0E10",
        text_color: "#F6F4EF",
      }),
      {
        enabled: true,
        messages: ["Free delivery", "20% off"],
        background: "#0E0E10",
        textColor: "#F6F4EF",
      },
    );
  });
  it("keeps intentionally empty messages instead of reviving legacy text", () => {
    assert.deepEqual(
      mapAnnouncementRecord({
        messages: [],
        text: "Old promotion",
        message: "Old promotion",
        enabled: false,
      }).messages,
      [],
    );
    assert.equal(mapAnnouncementRecord({ enabled: false, active: true }).enabled, false);
  });
  it("supports legacy single-text announcements and partial realtime records", () => {
    assert.deepEqual(mapAnnouncementRecord({ text: "", message: "Legacy message" }).messages, [
      "Legacy message",
    ]);
    assert.deepEqual(mapAnnouncementRecord({ text: "First\r\nSecond", active: false }).messages, [
      "First",
      "Second",
    ]);
    const fallback = {
      enabled: true,
      messages: ["Saved"],
      background: "#000000",
      textColor: "#ffffff",
    };
    assert.deepEqual(mapAnnouncementRecord({ enabled: false }, fallback), {
      ...fallback,
      enabled: false,
    });
  });
});
