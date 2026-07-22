import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { resolveAuthStatePath } from "./auth/auth-state";

/**
 * 手动导出登录态（人工过图片拖拽验证码的可靠备用通道）
 *
 * 当 Tests/ui/global-setup.ts 的自动滑块破解不稳时，用本脚本：
 * 1) 用调试端口启动浏览器并手动登录（人工拖验证码）：
 *      Start-Process msedge -ArgumentList "--remote-debugging-port=9222"
 * 2) 登录成功后，另开一个终端执行：
 *      npm run capture:auth
 *    脚本会连接当前已打开、已登录的浏览器，把 cookie + localStorage 导出到
 *    Tests/shared/.auth/<一级模块>/domain-state.json —— UI 与接口用例共用同一份。
 *
 * 环境变量：
 *   TEST_DOMAIN_PATH  一级模块目录名（与 UI 运行保持一致）
 *   CDP_PORT          调试端口，默认 9222
 */
const PORT = process.env.CDP_PORT || "9222";

const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`);
const context = browser.contexts()[0];
if (!context) {
  await browser.close().catch(() => {});
  throw new Error(
    "未找到已打开的浏览器上下文。请确认：\n" +
      "  1) 已用 --remote-debugging-port=9222 启动浏览器；\n" +
      "  2) 已在其中登录成功（至少打开一个标签页）。",
  );
}

// 若当前还停在 /login，提示可能尚未登录成功
const firstPage = context.pages()[0];
if (firstPage && (await firstPage.url()).includes("/login")) {
  console.warn(
    "[capture-auth] 警告：当前页面仍在 /login，可能尚未登录成功；导出的状态将无法访问业务接口。",
  );
}

const target = resolveAuthStatePath();
fs.mkdirSync(path.dirname(target), { recursive: true });
await context.storageState({ path: target });
console.log(`[capture-auth] 已导出登录态 -> ${target}`);

// connectOverCDP 的 browser.close() 仅断开连接，不会关闭你本地已打开的浏览器
await browser.close();
