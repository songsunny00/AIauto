import { chromium } from "@playwright/test";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TEST_BASE_URL || "http://localhost:7001";
const channel = process.env.PW_BROWSER_CHANNEL || "msedge";

(async () => {
  const browser = await chromium.launch({ channel, headless: true });
  const page = await browser.newContext({ viewport: { width: 1980, height: 1080 } }).then((c) => c.newPage());
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1) 含 captcha 关键字的节点
  const captchaHTML = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*")).filter((e) =>
      (e.className && typeof e.className === "string" && /captcha|verify|slider|security/i.test(e.className)) ||
      /Security Verif|安全验证|滑块/.test(e.textContent || "")
    );
    return els.slice(0, 8).map((e) => e.outerHTML.slice(0, 600)).join("\n----\n");
  });
  console.log("=== CAPTCHA-LIKE HTML ===\n" + (captchaHTML || "(none)"));

  // 2) 整个登录表单 HTML
  const formHTML = await page.evaluate(() => {
    const form = document.querySelector("form") || document.querySelector(".login-container, .login-card, [class*='login']");
    return form ? form.outerHTML.slice(0, 2500) : "(no form found)\n" + document.body.innerHTML.slice(0, 1500);
  });
  console.log("=== LOGIN FORM HTML ===\n" + formHTML);

  await page.screenshot({ path: path.join(__dirname, "login-inspect.png"), fullPage: false });
  console.log("=== screenshot saved login-inspect.png ===");
  await browser.close();
})().catch((e) => { console.error("ERR", e); process.exit(3); });
