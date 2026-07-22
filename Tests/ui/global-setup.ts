import { chromium, Page } from "@playwright/test";

declare const __dirname: string;
declare const process: { env: Record<string, string | undefined> };
declare function require(name: string): any;

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:30080";
const TEST_USER = {
  username: process.env.TEST_USERNAME || "",
  password: process.env.TEST_PASSWORD || "",
};

function readRequiredSegment(name: string) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required and must be a single directory segment`);
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..")) {
    throw new Error(`${name} must be a single directory segment`);
  }
  return value;
}

// 共享登录态上收为测试资产级：Tests/shared/.auth/<一级模块>/domain-state.json
// 与 Tests/api-automation 接口用例、capture-auth.ts 共用同一份
const TEST_DOMAIN_PATH = readRequiredSegment("TEST_DOMAIN_PATH");
const AUTH_DIR = path.join(__dirname, "..", "shared", ".auth", TEST_DOMAIN_PATH);
const AUTH_STATE_PATH = path.join(AUTH_DIR, "domain-state.json");

async function solveCaptcha(page: Page) {
  const captchaDialog = page.locator(".captcha-dialog");
  if (!(await captchaDialog.isVisible({ timeout: 8_000 }).catch(() => false))) {
    return;
  }

  await page.waitForTimeout(1000);

  const gapData = await page.evaluate(() => {
    const bg = document.querySelector(".captcha-bg") as HTMLCanvasElement;
    const block = document.querySelector(".captcha-block") as HTMLCanvasElement;
    if (!bg || !block) return JSON.stringify({ bestX: 0 });

    const bgCtx = bg.getContext("2d")!;
    const blockCtx = block.getContext("2d")!;
    const w = bg.width,
      h = bg.height;
    const bw = block.width,
      bh = block.height;
    const bgData = bgCtx.getImageData(0, 0, w, h).data;
    const blockData = blockCtx.getImageData(0, 0, bw, bh).data;

    let pieceMinX = bw,
      pieceMaxX = 0,
      pieceMinY = bh,
      pieceMaxY = 0;
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
    let bestX = 0,
      bestScore = Infinity;

    for (let tx = 40; tx <= w - pieceW; tx++) {
      let score = 0,
        count = 0;
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
  const btn = page.locator(".captcha-track__btn");
  const box = await btn.boundingBox();
  if (!box) return;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 0; i <= bestX; i += 2) {
    await page.mouse.move(startX + i, startY + Math.sin(i / 8) * 2, {
      steps: 1,
    });
    await page.waitForTimeout(12);
  }
  await page.waitForTimeout(500);
  await page.mouse.up();
}

async function globalSetup() {
  if (!TEST_USER.username || !TEST_USER.password) {
    throw new Error(
      "TEST_USERNAME / TEST_PASSWORD missing in .env — cannot perform global login",
    );
  }

  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });

  const browserChannel = process.env.PW_BROWSER_CHANNEL || "";
  const browser = await chromium.launch(
    browserChannel
      ? { channel: browserChannel, headless: true }
      : { headless: true },
  );
  const context = await browser.newContext({
    viewport: { width: 1980, height: 1080 },
    locale: "zh-CN",
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  const usernameInput = page
    .locator(
      'input[name="username"], input[placeholder*="用户名"], input[placeholder*="账号"], input[type="text"]',
    )
    .first();
  await usernameInput.fill(TEST_USER.username);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(TEST_USER.password);
  await page.waitForTimeout(300);

  const loginBtn = page
    .locator(
      'main button[type="submit"], main button:has-text("登录"), form button[type="submit"], form button:has-text("登录"), .login-btn',
    )
    .first();
  await loginBtn.click({ force: true });

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await loginBtn.click({ force: true });
    }

    await solveCaptcha(page);
    const navigated = await page
      .waitForURL((url: URL) => !url.pathname.includes("/login"), {
        timeout: 12_000,
      })
      .then(() => true)
      .catch(() => false);
    if (navigated) break;

    if (attempt < 2) {
      await page.waitForTimeout(1000);
    }
  }

  if (page.url().includes("/login")) {
    await page.screenshot({ path: path.join(AUTH_DIR, "login-failed.png") });
    await browser.close();
    throw new Error("Global setup login failed — still on /login after captcha retries");
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: AUTH_STATE_PATH });

  console.log(`[global-setup] Auth state saved to ${AUTH_STATE_PATH}`);
  await browser.close();
}

export default globalSetup;
