import { chromium } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TEST_BASE_URL || "http://localhost:7001";
const channel = process.env.PW_BROWSER_CHANNEL || "msedge";
const AUTH_STATE = path.resolve(__dirname, "..", "shared", ".auth", "CONFIG-配置中心", "domain-state.json");

(async () => {
  const browser = await chromium.launch({ channel, headless: true });
  const context = await browser.newContext({ viewport: { width: 1980, height: 1080 }, storageState: AUTH_STATE });
  const page = await context.newPage();
  const errors = [];
  const bad = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => bad.push(`FAIL ${r.url()} ${r.failure()?.errorText || ""}`));

  await page.goto(`${BASE}/config/billingConfig`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const url = page.url();
  const btnCount = await page.getByTestId("billing-add-tenant-btn").count();
  const body = (await page.locator("body").innerText()).slice(0, 200);
  console.log("URL:", url);
  console.log("ADD_BTN_COUNT:", btnCount);
  console.log("BODY:", body);
  console.log("ERRORS:", errors.slice(0, 10).join("\n") || "(none)");
  console.log("BAD_NET:", bad.slice(0, 15).join("\n") || "(none)");
  await browser.close();
})().catch((e) => { console.error("ERR", e); process.exit(3); });
