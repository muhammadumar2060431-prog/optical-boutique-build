import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "./.tmp/browser-tools/node_modules/playwright/index.mjs";
import sharp from "sharp";

const base = process.env.LOCAL_SITE_URL || "http://localhost:8082";
const output = ".tmp/admin-image-audit";
const fixtureHtml = await readFile(
  new URL("./tests/fixtures/admin-image-audit.html", import.meta.url),
  "utf8",
);
await mkdir(output, { recursive: true });
const fixture = await sharp({
  create: { width: 1800, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp({
        create: {
          width: 800,
          height: 400,
          channels: 4,
          background: { r: 220, g: 40, b: 80, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      left: 500,
      top: 400,
    },
  ])
  .png()
  .toBuffer();
const profiles = [
  ["product", 1, 800, 800, 200],
  ["gallery", 1, 500, 500, 200],
  ["variant", 1, 600, 600, 120],
  ["hero", 2, 1920, 960, 300],
  ["category-banner", 2, 1200, 600, 250],
  ["collection-banner", 2.4, 1200, 500, 250],
  ["category-icon", 1, 400, 400, 100],
  ["reel", 9 / 16, 480, 854, 150],
  ["brand", null, 420, 140, 50],
  ["store-logo", null, 400, 120, 80],
  ["blog-cover", 16 / 9, 1600, 900, 350],
  ["blog-inline", 16 / 9, 1400, 788, 300],
  ["review-proof", null, 1200, 1600, 300],
];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.route(`${base}/tests/fixtures/admin-image-audit.html`, (route) =>
      route.fulfill({ contentType: "text/html", body: fixtureHtml }),
    );
    // Keep browser fixtures isolated from database and Storage mutations.
    await context.route("**/*.supabase.co/**", async (route) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: '{"message":"Audit blocks remote writes"}',
        });
      } else await route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/tests/fixtures/admin-image-audit.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForFunction(() => Boolean(window.imageAudit), undefined, { timeout: 60_000 });
    for (const [name, cropAspect, maxWidth, maxHeight, maxKB] of profiles) {
      console.log(`Checking ${viewport.width}px ${name}`);
      await page.evaluate((options) => window.imageAudit.mount(options), {
        cropAspect,
        maxWidth,
        maxHeight,
        maxBytes: maxKB * 1024,
      });
      await page
        .locator('input[type="file"]')
        .setInputFiles({ name: "transparent.png", mimeType: "image/png", buffer: fixture });
      const modal = page.getByRole("dialog");
      await modal.waitFor();
      await page.waitForFunction(
        () => !document.querySelector('[role="dialog"] button:last-child')?.disabled,
      );
      assert.equal(await page.locator("#record-save").isDisabled(), true);
      await page.getByTitle("Zoom In", { exact: true }).click();
      await page.waitForTimeout(150);
      await page.getByTitle("Zoom Out", { exact: true }).click();
      await page.waitForTimeout(150);
      const bounds = await modal.boundingBox();
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1, name);
      assert.ok(bounds.y >= -1 && bounds.y + bounds.height <= viewport.height + 1, name);
      if (name === "product" || name === "collection-banner" || name === "reel") {
        await page.screenshot({ path: `${output}/${viewport.width}-${name}.png` });
      }
      await page.getByRole("button", { name: "Save Image", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector("#image-result")
          ?.getAttribute("data-source")
          ?.startsWith("data:image/"),
      );
      assert.equal(await page.locator("#record-save").isDisabled(), false);
      const source = await page.locator("#image-result").getAttribute("data-source");
      const bytes = Buffer.from(source.split(",")[1], "base64");
      const metadata = await sharp(bytes).metadata();
      assert.ok(metadata.width <= maxWidth && metadata.height <= maxHeight, name);
      assert.ok(bytes.length <= maxKB * 1024, name);
      assert.ok(Math.abs(metadata.width / metadata.height - (cropAspect || 1.5)) < 0.02, name);
      assert.equal(metadata.hasAlpha, true, name);
      const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(data[3], 0, `${name} transparent corner`);
      results.push({
        viewport: viewport.width,
        name,
        width: metadata.width,
        height: metadata.height,
        bytes: bytes.length,
      });
      await page.getByTitle("Adjust / Re-crop image").click();
      await modal.waitFor();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(await page.locator("#image-result").getAttribute("data-source"), source);
      assert.equal(await page.locator("#record-save").isDisabled(), false);
    }
    await page.evaluate(() => window.imageAudit.mount({ cropAspect: 1 }));
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "zoom.png", mimeType: "image/png", buffer: fixture });
    await page.getByRole("dialog").waitFor();
    for (let step = 0; step < 20; step++) await page.getByTitle("Zoom In", { exact: true }).click();
    await page.getByText("Zoom: 2.5x", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Save Image", exact: true }).click();
    await page.locator("#record-save:not([disabled])").waitFor();
    const zoomSource = await page.locator("#image-result").getAttribute("data-source");
    const zoomMetadata = await sharp(Buffer.from(zoomSource.split(",")[1], "base64")).metadata();
    assert.equal(zoomMetadata.width, zoomMetadata.height);
    assert.ok(zoomMetadata.width < 600);
    await page.evaluate(() => window.imageAudit.mount({ cropAspect: 1 }));
    await page.locator('input[type="file"]').setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await page
      .getByText("Warning: Use a JPG, PNG, WebP, or AVIF image.", { exact: true })
      .waitFor();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("broken") });
    await page
      .getByText("The image could not be loaded. Replace it and try again.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: fixture });
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Save Image", exact: true }).click();
    await page.locator("#record-save:not([disabled])").waitFor();
    // The upload completion callback must use the latest form state.
    await page.evaluate(async () => {
      const { ImageOptimizer } = await import("/src/lib/image-optimizer.ts");
      const optimize = ImageOptimizer.prototype.optimize;
      ImageOptimizer.prototype.optimize = async function (source) {
        await new Promise((resolve) => {
          window.finishOptimization = resolve;
        });
        return optimize.call(this, source);
      };
      window.restoreOptimizer = () => {
        ImageOptimizer.prototype.optimize = optimize;
      };
      window.imageAudit.mount({ allowAdjustment: false });
    });
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: fixture });
    await page.getByLabel("Draft title").fill("after");
    await page.waitForFunction(() => Boolean(window.finishOptimization));
    await page.evaluate(() => window.finishOptimization());
    await page.locator("#record-save:not([disabled])").waitFor();
    assert.equal(await page.locator("#saved-title").textContent(), "after");
    await page.evaluate(() => window.restoreOptimizer());
    await page.evaluate(() =>
      window.imageAudit.mount({ allowAdjustment: false, localOnly: false }),
    );
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "session.png", mimeType: "image/png", buffer: fixture });
    await page.getByText(/Your admin session has expired/).waitFor();
    assert.equal(await page.locator("#image-result").getAttribute("data-source"), "");
    assert.equal(await page.locator("#record-save").isDisabled(), false);
    const mockId = "00000000-0000-4000-8000-000000000001";
    const opaqueSource =
      "https://image-audit.supabase.co/storage/v1/object/public/optique-images/products/opaque.png";
    await context.route(opaqueSource, (route) => route.abort());
    const proxyPattern = "**/api/v1/admin/image-proxy?url=*";
    await context.route(proxyPattern, (route) =>
      route.fulfill({ contentType: "image/png", body: fixture }),
    );
    await page.evaluate(
      (initialValue) => window.imageAudit.mount({ initialValue, cropAspect: 1 }),
      opaqueSource,
    );
    await page.getByTitle("Adjust / Re-crop image").click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Save Image", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector("#image-result")
        ?.getAttribute("data-source")
        ?.startsWith("data:image/"),
    );
    assert.equal(await page.locator("#record-save").isDisabled(), false);
    await context.unroute(proxyPattern);
    await context.route("**/auth/v1/user", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: mockId,
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        }),
      }),
    );
    const tokenPayload = Buffer.from(
      JSON.stringify({
        sub: mockId,
        aud: "authenticated",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    await page.evaluate(async (token) => {
      const { supabase } = await import("/src/lib/supabase.ts");
      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: "audit-only-refresh",
      });
      if (error) throw error;
    }, `eyJhbGciOiJIUzI1NiJ9.${tokenPayload}.audit-signature`);
    let uploadStatus = 200;
    const uploads = [];
    await context.route("**/storage/v1/object/optique-images/**", (route) => {
      if (route.request().method() !== "POST") return route.abort();
      const path = new URL(route.request().url()).pathname.split("/optique-images/")[1];
      assert.match(path, /^[a-z]+\/[a-f0-9-]+\.(png|webp|jpe?g|avif)$/);
      assert.match(
        route.request().postDataBuffer().toString("latin1"),
        /Content-Type: image\/(png|webp|jpeg|avif)/i,
      );
      uploads.push(path);
      return route.fulfill({
        status: uploadStatus,
        contentType: "application/json",
        body:
          uploadStatus === 200
            ? JSON.stringify({ Id: "audit-only", Key: `optique-images/${path}` })
            : '{"statusCode":"403","error":"Unauthorized","message":"Audit simulated rejection"}',
      });
    });
    await context.route("**/storage/v1/object/public/optique-images/**", (route) =>
      route.fulfill({ contentType: "image/png", body: fixture }),
    );
    for (const folder of [
      "products",
      "categories",
      "collections",
      "hero",
      "brands",
      "reels",
      "settings",
      "blog",
      "testimonials",
    ]) {
      await page.evaluate(
        (storageFolder) =>
          window.imageAudit.mount({ localOnly: false, allowAdjustment: false, storageFolder }),
        folder,
      );
      await page
        .locator('input[type="file"]')
        .setInputFiles({ name: "storage.png", mimeType: "image/png", buffer: fixture });
      await page.waitForFunction(() =>
        document
          .querySelector("#image-result")
          ?.getAttribute("data-source")
          ?.startsWith("https://"),
      );
      const stored = await page.locator("#image-result").getAttribute("data-source");
      assert.ok(stored.includes(`/storage/v1/object/public/optique-images/${folder}/`), folder);
      assert.equal(await page.locator("#record-save").isDisabled(), false);
    }
    uploadStatus = 403;
    const initialValue = `data:image/png;base64,${fixture.toString("base64")}`;
    await page.evaluate(
      (initialValue) =>
        window.imageAudit.mount({ localOnly: false, allowAdjustment: false, initialValue }),
      initialValue,
    );
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "rejected.png", mimeType: "image/png", buffer: fixture });
    await page.getByText(/Storage denied this upload/).waitFor();
    assert.equal(await page.locator("#image-result").getAttribute("data-source"), initialValue);
    assert.equal(await page.locator("#record-save").isDisabled(), false);
    console.log(`Verified ${uploads.length} isolated Storage requests at ${viewport.width}px`);
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
  }
  const required = await fetch(`${base}/api/v1/admin/image-proxy`);
  assert.equal(required.status, 400);
  const denied = await fetch(
    `${base}/api/v1/admin/image-proxy?url=${encodeURIComponent("http://127.0.0.1/storage/v1/object/public/optique-images/a.png")}`,
  );
  assert.equal(denied.status, 403);
  const remote = JSON.parse(await readFile(`${output}/remote-assets.json`, "utf8"));
  const storageImage = remote.assets.find((asset) =>
    asset.source.includes("/storage/v1/object/public/optique-images/"),
  );
  assert.ok(storageImage);
  const proxyImage = await fetch(
    `${base}/api/v1/admin/image-proxy?url=${encodeURIComponent(storageImage.source)}`,
  );
  assert.equal(proxyImage.status, 200);
  assert.ok((await sharp(Buffer.from(await proxyImage.arrayBuffer())).metadata()).width > 0);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: true, profileChecks: results.length, output }, null, 2));
} finally {
  await browser.close();
}
