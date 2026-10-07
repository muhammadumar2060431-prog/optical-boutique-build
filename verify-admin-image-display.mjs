import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "./.tmp/browser-tools/node_modules/playwright/index.mjs";

const base = process.env.LOCAL_SITE_URL || "http://localhost:8082";
const directory = ".tmp/admin-image-audit";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.route("**/*.supabase.co/**", (route) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/", "/glasses", "/lenses"]) {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator("main").waitFor();
      await page.waitForTimeout(1000);
      const images = await page.locator("main img").evaluateAll((items) =>
        items
          .filter((item) => item.getBoundingClientRect().width > 0 && item.complete)
          .map((item) => ({
            loaded: item.naturalWidth > 0,
            fit: getComputedStyle(item).objectFit,
            source: item.getAttribute("src"),
            isCollectionBanner:
              item.getAttribute("width") === "1200" && item.getAttribute("height") === "500",
            isCategoryBanner:
              item.getAttribute("width") === "1200" && item.getAttribute("height") === "600",
            isHeroBanner: Boolean(
              item.closest("section")?.querySelector('[aria-label="Next slide"]'),
            ),
          })),
      );
      assert.ok(images.length > 0, path);
      assert.equal(
        images.some((image) => !image.loaded),
        false,
        JSON.stringify(images.filter((image) => !image.loaded)),
      );
      assert.equal(
        images.some(
          (image) =>
            image.fit === "fill" &&
            !image.isCollectionBanner &&
            !image.isCategoryBanner &&
            !image.isHeroBanner,
        ),
        false,
        path,
      );
      if (path !== "/") {
        const banner = page.locator('main img[width="1200"][height="600"]').first();
        await banner.evaluate((item) => item.decode());
        const frame = await banner.evaluate((item) => {
          const image = item.getBoundingClientRect();
          const section = item.closest("section").getBoundingClientRect();
          return {
            fit: getComputedStyle(item).objectFit,
            width: image.width,
            height: image.height,
            frameWidth: section.width,
            leftGap: image.left - section.left,
            rightGap: section.right - image.right,
          };
        });
        assert.equal(frame.fit, "fill", `${path} banner fit`);
        assert.equal(frame.width, viewport.width, `${path} banner width`);
        assert.equal(
          frame.height,
          Math.min(viewport.width / 2, viewport.width >= 640 ? 440 : Infinity),
        );
        assert.equal(frame.leftGap, 0, `${path} banner left gap`);
        assert.equal(frame.rightGap, 0, `${path} banner right gap`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${path} ${viewport.width}px overflow`);
      await page.screenshot({
        path: `${directory}/storefront-${viewport.width}-${path === "/" ? "home" : path.slice(1)}.png`,
      });
      results.push({ path, viewport: viewport.width, images: images.length, overflow });
    }
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
  }
  await writeFile(`${directory}/display-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: true, checks: results.length }, null, 2));
} finally {
  await browser.close();
}
