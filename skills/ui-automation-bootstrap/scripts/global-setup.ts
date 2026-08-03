/**
 * global-setup.ts — 全局前置：检查登录态有效性，失效时唤起人工登录
 *
 * 流程：
 * 1. 读 Tests/.env 获取环境变量
 * 2. 若 storageState 不存在 → 直接调 captureAuthManual
 * 3. 若存在 → 用无头浏览器验证有效性（isAuthStateValid）
 * 4. 无效 → 调 captureAuthManual 重新生成
 * 5. 失败则抛错，让所有用例 fail-fast
 */
import { chromium, type FullConfig } from '@playwright/test';
import { authStatePath, authStateExists, isAuthStateValid, loadEnv } from '../shared/auth/auth-state';
import { captureAuthManual } from '../shared/auth/capture-auth';

// 一级模块由 run.mjs --domain 注入 TEST_DOMAIN_PATH；独立运行（如 auth:capture）时
// 回退到 .env 的 DEFAULT_DOMAIN（项目级默认模块）。两者都缺则抛错，避免硬编码模块名。
const DOMAIN = process.env.TEST_DOMAIN_PATH || process.env.DEFAULT_DOMAIN || '';
// 登录态校验目标页：优先 TEST_AUTH_TARGET_PATH，回退 .env 的 DEFAULT_AUTH_PATH（项目级默认页）。
const TARGET_PATH = process.env.TEST_AUTH_TARGET_PATH || process.env.DEFAULT_AUTH_PATH || '';
if (!DOMAIN) {
  throw new Error(
    '[global-setup] 未指定一级模块：请通过 run.mjs --domain <一级模块> 传入，或在 Tests/.env 设置 DEFAULT_DOMAIN。',
  );
}
if (!TARGET_PATH) {
  throw new Error(
    '[global-setup] 未指定登录态校验目标页：请通过 TEST_AUTH_TARGET_PATH 传入，或在 Tests/.env 设置 DEFAULT_AUTH_PATH。',
  );
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const { baseUrl } = loadEnv();
  const targetUrl = baseUrl + TARGET_PATH;
  const statePath = authStatePath(DOMAIN);

  console.log('[global-setup] 检查登录态...');

  // 1. storageState 不存在 → 直接捕获
  if (!authStateExists(DOMAIN)) {
    console.log('[global-setup] 登录态文件不存在，启动人工登录...');
    await captureAuthManual();
    return;
  }

  // 2. 验证有效性
  const browser = await chromium.launch({ headless: true });
  try {
    const valid = await isAuthStateValid(browser, DOMAIN, targetUrl);
    if (valid) {
      console.log('[global-setup] ✅ 登录态有效，复用 ' + statePath);
      return;
    }
    console.log('[global-setup] ⚠️ 登录态已失效，启动人工登录...');
  } finally {
    await browser.close();
  }

  // 3. 失效 → 重新捕获
  await captureAuthManual();
  console.log('[global-setup] ✅ 登录态已更新');
}
