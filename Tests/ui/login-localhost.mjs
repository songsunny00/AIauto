import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.TEST_BASE_URL || "http://localhost:7001";
const USER = process.env.TEST_USERNAME || "admin_shl";
const PASS = process.env.TEST_PASSWORD || "admin_shl@123";
const channel = process.env.PW_BROWSER_CHANNEL || "msedge";

const AUTH_DIR = path.resolve(__dirname, "..", "shared", ".auth", "CONFIG-配置中心");
const AUTH_STATE = path.join(AUTH_DIR, "domain-state.json");
const FORCE_ZH = process.env.FORCE_ZH === "1";

async function solveCaptcha(page) {
  const captchaDialog = page.locator(".captcha-dialog");
  if (!(await captchaDialog.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return false;
  }
  await page.waitForTimeout(3000);

  const gapData = await page.evaluate(() => {
    const bg = document.querySelector(".captcha-bg");
    const block = document.querySelector(".captcha-block");
    if (!bg || !block) return JSON.stringify({ bestX: 0 });
    const bgCtx = bg.getContext("2d");
    const blockCtx = block.getContext("2d");
    const w = bg.width, h = bg.height;
    const bw = block.width, bh = block.height;
    const bgData = bgCtx.getImageData(0, 0, w, h).data;
    const blockData = blockCtx.getImageData(0, 0, bw, bh).data;
    let pieceMinX = bw, pieceMaxX = 0, pieceMinY = bh, pieceMaxY = 0;
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = (y * bw + x) * 4;
        if (blockData[i + 3] > 50) {
          if (x < pieceMinX) pieceMinX = x;
          if (x > pieceMaxX) pieceMaxX = x;
          if (y < pieceMinY) pieceMinY = y;
          if (y > pieceMaxY) pieceMaxY = y;
        }
      }
    }
    const pieceW = pieceMaxX - pieceMinX + 1;
    const pieceH = pieceMaxY - pieceMinY + 1;
    let bestX = 0, bestScore = Infinity;
    for (let tx = 20; tx <= w - pieceW; tx++) {
      let score = 0, count = 0;
      for (let py = 0; py < pieceH; py++) {
        for (let px = 0; px < pieceW; px++) {
          const bi = ((pieceMinY + py) * bw + (pieceMinX + px)) * 4;
          if (blockData[bi + 3] > 50) {
            const sx = tx + px;
            const sy = pieceMinY + py;
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
              const si = (sy * w + sx) * 4;
              const dr = bgData[si] - blockData[bi];
              const dg = bgData[si + 1] - blockData[bi + 1];
              const db = bgData[si + 2] - blockData[bi + 2];
              score += dr * dr + dg * dg + db * db;
              count++;
            }
          }
        }
      }
      if (count > 0 && score / count < bestScore) {
        bestScore = score / count;
        bestX = tx;
      }
    }
    return JSON.stringify({ bestX });
  });

  const { bestX } = JSON.parse(gapData);
  console.log(`[captcha] bestX=${bestX}`);
  const btn = page.locator(".captcha-track__btn");
  const box = await btn.boundingBox();
  if (!box) return false;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 0; i <= bestX; i += 2) {
    await page.mouse.move(startX + i, startY + Math.sin(i / 8) * 2, { steps: 1 });
    await page.waitForTimeout(12);
  }
  await page.waitForTimeout(500);
  await page.mouse.up();
  return true;
}

(async () => {
  console.log(`[login] channel=${channel} base=${BASE} user=${USER} forceZh=${FORCE_ZH}`);
  const browser = await chromium.launch({ channel, headless: true });
  const context = await browser.newContext({ viewport: { width: 1980, height: 1080 }, locale: "zh-CN" });
  if (FORCE_ZH) {
    await context.addCookies([
      { name: "vue3-typescript-admin-languageKey", value: "zh", url: BASE },
    ]);
  }
  const page = await context.newPage();

  let authed = false;
  for (let attempt = 1; attempt <= 8 && !authed; attempt++) {
    if (!page.url().includes("/login")) {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    }
    const u = page.locator('input[placeholder="Please enter username"]').first();
    const p = page.locator('input[type="password"]').first();
    await u.fill(USER);
    await p.fill(PASS);
    await page.waitForTimeout(300);
    const loginBtn = page.locator("button.login-button").first();
    await loginBtn.click();
    await solveCaptcha(page).catch(() => {});
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 12000 });
      authed = true;
      console.log(`[login] SUCCESS attempt=${attempt} -> ${page.url()}`);
    } catch {
      console.log(`[login] attempt=${attempt} FAILED, still on ${page.url()}`);
    }
  }

  if (!authed) {
    console.log("[login] ALL ATTEMPTS FAILED");
    await browser.close();
    process.exit(1);
  }

  if (FORCE_ZH) {
    await context.addCookies([
      { name: "vue3-typescript-admin-languageKey", value: "zh", url: BASE },
    ]);
  }
  await page.waitForTimeout(1500);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: AUTH_STATE });
  console.log("[login] STORAGESTATE SAVED ->", AUTH_STATE);
  await browser.close();
})().catch((e) => {
  console.error("[login] ERROR", e);
  process.exit(3);
});
