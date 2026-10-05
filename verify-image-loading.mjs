import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.LOCAL_SITE_URL || "http://localhost:8080";
await mkdir(".tmp/image-verification", { recursive: true });
const apiChecks = [];
let data;
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  const response = await fetch(`${base}/api/v1/storefront`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const payload = await response.json();
  data = payload.data;
  assert.ok(data?.products?.length);
  assert.equal(Boolean(data.settings?.adminEmail), false);
  assert.equal(
    data.testimonials.some((review) => "email" in review),
    false,
  );
  assert.equal(data.orders, null);
  apiChecks.push({
    status: response.status,
    cache: response.headers.get("x-redis-cache"),
    elapsedMs: Math.round(performance.now() - start),
    timing: response.headers.get("server-timing"),
  });
}
const unauthorized = await fetch(`${base}/api/v1/storefront`, {
  method: "POST",
  signal: AbortSignal.timeout(15000),
});
assert.equal(unauthorized.status, 401);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Next slide", exact: true }).waitFor();
    const liveHero = page
      .locator("section")
      .filter({ has: page.getByRole("button", { name: "Next slide", exact: true }) });
    await liveHero.dispatchEvent("touchstart");
    await liveHero.locator('div[aria-hidden="false"] img').evaluate((image) => image.decode());
    await page.screenshot({
      path: `.tmp/image-verification/${mobile ? "mobile" : "desktop"}-live.png`,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false);

    // Isolated browser fixtures only; no products or Storage files are created remotely.
    const product = {
      ...data.products[0],
      hoverImage: `${data.products[0].image}?verificationAlternate=1`,
      createdAt: new Date().toISOString(),
    };
    const category = data.categories.find((item) => item.id === product.categoryId);
    assert.ok(category);
    const fixture = { ...data, products: [product] };
    await context.route("**/api/v1/storefront", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: { data: fixture, cache: "fixture" } })
        : route.continue(),
    );
    await context.route("**/storage/v1/render/image/public/**", (route) =>
      route.fulfill({ status: 400, json: { error: "fixture transform unavailable" } }),
    );
    await page.evaluate(() => localStorage.clear());
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const hero = page
      .locator("section")
      .filter({ has: page.getByRole("button", { name: "Next slide", exact: true }) });
    await hero.waitFor();
    await hero.dispatchEvent("touchstart");
    await page.waitForFunction(() => {
      const image = document.querySelector('section div[aria-hidden="false"] img');
      return (
        image?.complete &&
        image.naturalWidth > 0 &&
        image.src.includes("/storage/v1/object/public/")
      );
    });
    assert.equal(await hero.locator("img").count(), 1);
    await hero.getByRole("button", { name: "Next slide", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('section div[aria-hidden="false"] img')?.naturalWidth > 0,
    );
    assert.equal(await hero.locator("img").count(), 2);

    await page.evaluate(() => localStorage.clear());
    await page.goto(`${base}/${category.slug}`, { waitUntil: "domcontentloaded" });
    const card = page
      .locator(`a[href="/product/${product.slug}"]`)
      .filter({ has: page.locator("div.aspect-square") })
      .first();
    await card.waitFor();
    await card.scrollIntoViewIfNeeded();
    assert.equal(await card.locator("img").count(), 1);
    if (mobile) {
      await card.dispatchEvent("pointerover", { pointerType: "touch" });
      assert.equal(await card.locator("img").count(), 1);
    } else {
      await card.hover();
      await card.locator('img[alt$="alternate view"]').waitFor();
      assert.equal(await card.locator("img").count(), 2);
    }
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    results.push({
      mobile,
      noOverflow: true,
      transformFallbackOriginal: true,
      hiddenHeroDeferred: true,
      hoverImagesOnDemand: true,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  ".tmp/image-verification/results.json",
  JSON.stringify({ apiChecks, unauthorizedRefreshStatus: unauthorized.status, results }, null, 2),
);
console.log(JSON.stringify({ apiChecks, results }));
