import * as fs from "fs";
import * as path from "path";

/**
 * 共享登录态路径解析：Tests/shared/.auth/<一级模块>/domain-state.json
 *
 * 此路径与以下位置保持一致：
 * - Tests/ui/global-setup.ts 自动登录后写入的位置
 * - Tests/ui 各二级模块 fixture 消费的位置
 * - Tests/api-automation 接口用例消费的位置
 *
 * 「自动登录 / 手动导出 / UI 消费 / 接口消费」都围绕同一份文件，
 * 不存在多份登录态互相过期的问题。
 */
export function resolveAuthStatePath(domain?: string): string {
  const TEST_DOMAIN_PATH = (domain ?? process.env.TEST_DOMAIN_PATH ?? "").trim();
  if (!TEST_DOMAIN_PATH) {
    throw new Error(
      "resolveAuthStatePath: TEST_DOMAIN_PATH 未设置，无法确定登录态目录",
    );
  }
  if (
    TEST_DOMAIN_PATH.includes("/") ||
    TEST_DOMAIN_PATH.includes("\\") ||
    TEST_DOMAIN_PATH.includes("..")
  ) {
    throw new Error("TEST_DOMAIN_PATH 必须是单个目录段，不能含 / \\ 或 ..");
  }
  // 本文件位于 Tests/shared/auth/，向上一级到 Tests/shared
  return path.join(
    __dirname,
    "..",
    ".auth",
    TEST_DOMAIN_PATH,
    "domain-state.json",
  );
}

export function authStateExists(domain?: string): boolean {
  try {
    return fs.existsSync(resolveAuthStatePath(domain));
  } catch {
    return false;
  }
}

export function readAuthState(domain?: string) {
  const p = resolveAuthStatePath(domain);
  if (!fs.existsSync(p)) {
    throw new Error(
      `登录态文件不存在：${p}\n` +
        `请先手动登录并导出（npm run capture:auth），或确保 global-setup.ts 已成功生成。`,
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
