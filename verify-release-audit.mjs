import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "./.tmp/browser-tools/node_modules/playwright/index.mjs";

const base = process.env.LOCAL_SITE_URL || "http://localhost:8081";
const directory = ".tmp/release-audit";
await mkdir(directory, { recursive: true });
const response = await fetch(`${base}/api/v1/storefront`, { signal: AbortSignal.timeout(30_000) });
assert.equal(response.status, 200);
const payload = await response.json();
assert.ok(payload.data?.faqs?.length);
assert.equal(Boolean(payload.data.settings?.adminEmail), false);
assert.equal(
  payload.data.testimonials.some((review) => "email" in review),
  false,
);
const unauthorized = await fetch(`${base}/api/v1/storefront`, { method: "POST" });
assert.equal(unauthorized.status, 401);
const body = JSON.stringify(payload);
const results = [];
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await context.route("**/api/v1/storefront", (route) =>
      route.fulfill({ contentType: "application/json", body }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [path, placement] of [
      ["/", "home"],
      ["/faqs", null],
      ["/about", "about"],
      ["/contact", "contact"],
      ["/cart", "cart"],
      ["/checkout", "checkout"],
      ["/order-status", "tracking"],
    ]) {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
      const expected = payload.data.faqs.filter(
        (faq) =>
          faq.enabled !== false &&
          (placement === null ||
            faq.showOnPages?.includes(placement) ||
            (!faq.showOnPages && placement === "home" && faq.showOnHome)),
      ).length;
      const section = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", { name: "Frequently Asked Questions", exact: true }),
        })
        .last();
      if (expected) {
        await section.waitFor({ timeout: 20_000 });
        const items = section.locator(
          placement === "home" || placement === null ? "button[aria-expanded]" : "details",
        );
        await page.waitForFunction(
          ({ expected, selector }) => {
            const heading = Array.from(document.querySelectorAll("h2")).find(
              (element) => element.textContent === "Frequently Asked Questions",
            );
            return heading?.closest("section")?.querySelectorAll(selector).length === expected;
          },
          {
            expected,
            selector:
              placement === "home" || placement === null ? "button[aria-expanded]" : "details",
          },
        );
        assert.equal(await items.count(), expected);
        const style = await items.first().evaluate((element) => {
          const list =
            element.tagName === "DETAILS"
              ? element.parentElement
              : element.parentElement.parentElement;
          const css = getComputedStyle(list);
          return { maxHeight: css.maxHeight, overflowY: css.overflowY };
        });
        assert.equal(style.maxHeight, "none");
        assert.ok(!["auto", "scroll"].includes(style.overflowY));
        if (path === "/faqs") {
          await items.last().click();
          assert.equal(await items.last().getAttribute("aria-expanded"), "true");
          await section.screenshot({
            path: `${directory}/faqs-${mobile ? "mobile" : "desktop"}.png`,
          });
        }
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      results.push({ path, mobile, faqCount: expected, internalScrollbar: false });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  // A blocked storefront endpoint must still fall back to public database reads.
  const context = await browser.newContext();
  await context.route("**/api/v1/storefront", (route) => route.abort());
  const page = await context.newPage();
  await page.goto(`${base}/faqs`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    (expected) => document.querySelectorAll("section button[aria-expanded]").length === expected,
    payload.data.faqs.length,
    { timeout: 20_000 },
  );
  results.push({ blockedApiDirectDatabaseFallback: true });
  await context.close();
  await writeFile(
    `${directory}/browser-results.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        base,
        storefrontPrivacy: true,
        unauthorizedInvalidationDenied: true,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      viewsPassed: results.length - 1,
      blockedApiFallback: true,
      resultsFile: `${directory}/browser-results.json`,
    }),
  );
} finally {
  await browser.close();
}
