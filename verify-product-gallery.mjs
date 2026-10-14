import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "./.tmp/browser-tools/node_modules/playwright/index.mjs";

const base = process.env.LOCAL_SITE_URL || "http://localhost:8080";
await mkdir(".tmp/product-gallery", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const slug of [
      "men-s-polarized-sunglasses-brown-matte-frame",
      "ray-ban-silver-aviator-sunglasses-g-15-lens",
      "ar10",
    ]) {
      await page.goto(`${base}/product/${slug}`, { waitUntil: "domcontentloaded" });
      const thumbnails = page.locator('button[aria-label^="Show "]');
      await thumbnails.first().waitFor({ timeout: 60000 });
      await page.waitForFunction(
        () => {
          const button = document.querySelector('button[aria-label^="Show "]');
          return button && Object.keys(button).some((key) => key.startsWith("__reactProps$"));
        },
        undefined,
        { timeout: 60000 },
      );
      assert.ok((await thumbnails.count()) >= 2, `${slug}: missing secondary thumbnails`);
      for (const thumbnail of await thumbnails.all()) {
        await thumbnail.scrollIntoViewIfNeeded();
        await thumbnail.locator("img").evaluate((image) => image.decode());
        assert.equal(await thumbnail.locator("img").getAttribute("data-fallback"), null);
        const source = await thumbnail.locator("img").getAttribute("src");
        await thumbnail.click();
        const mainImage = page.locator(".lens-ring > img");
        await page
          .waitForFunction(
            (src) => document.querySelector(".lens-ring > img")?.getAttribute("src") === src,
            source,
          )
          .catch(async (error) => {
            console.log(
              JSON.stringify({
                slug,
                expected: source,
                actual: await mainImage.getAttribute("src"),
                errors,
              }),
            );
            await page.screenshot({ path: ".tmp/product-gallery/failure.png" });
            throw error;
          });
        await mainImage.evaluate((image) => image.decode());
        assert.equal(await mainImage.getAttribute("data-fallback"), null);
        assert.equal(await thumbnail.getAttribute("aria-pressed"), "true");
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.screenshot({
        path: `.tmp/product-gallery/${slug}-${viewport.width}.png`,
        fullPage: true,
      });
      console.log(
        JSON.stringify({
          slug,
          viewport: viewport.width,
          thumbnails: await thumbnails.count(),
          loaded: true,
        }),
      );
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
