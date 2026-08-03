/**
 * network.ts — 网络请求工具（API 等待 / mock / 调用计数）
 *
 * 用于：
 * - 成功类组合断言（waitForApi，skill §8.3）
 * - ET 用例 API mock（mockApiFailure / mockApiTimeout / mockApiMalformedJson）
 * - 断言"未调用接口"（createCallCounter，ET-FORM-003/004）
 */
import type { Page, Response } from "@playwright/test";

/**
 * 等待匹配的 API 响应。
 * @param page Page 实例
 * @param matcher 匹配条件（url 子串或正则，可选 method）
 * @param timeoutMs 超时毫秒（默认 15000）
 */
export function waitForApi(
  page: Page,
  matcher: { url: string | RegExp; method?: string },
  timeoutMs: number = 15_000,
): Promise<Response> {
  return page.waitForResponse(
    (res) => {
      const urlMatch =
        typeof matcher.url === "string"
          ? res.url().includes(matcher.url)
          : matcher.url.test(res.url());
      const methodMatch =
        !matcher.method || res.request().method() === matcher.method;
      return urlMatch && methodMatch;
    },
    { timeout: timeoutMs },
  );
}

// ============================================================
// API Mock（ET 用例）
// ============================================================

/**
 * Mock API 返回失败（指定 HTTP 状态码）。
 */
export async function mockApiFailure(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 500,
  body?: unknown,
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: "application/json",
      body: body
        ? JSON.stringify(body)
        : '{"retCode":1,"retInfo":"mock failure"}',
    });
  });
}

/**
 * Mock API 返回成功（自定义响应体）。
 */
export async function mockApiSuccess(
  page: Page,
  urlPattern: string | RegExp,
  body: unknown,
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

/**
 * Mock API 超时（延迟后不响应，触发前端超时）。
 */
export async function mockApiTimeout(
  page: Page,
  urlPattern: string | RegExp,
  delayMs: number = 30_000,
): Promise<void> {
  await page.route(urlPattern, (route) => {
    setTimeout(() => route.abort(), delayMs);
  });
}

/**
 * Mock API 返回非法 JSON（ET-DETAIL-009：snapshotBefore/After 非法）。
 */
export async function mockApiMalformedJson(
  page: Page,
  urlPattern: string | RegExp,
  rawBody: string,
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: rawBody, // 非法 JSON 字符串
    });
  });
}

// ============================================================
// 调用计数（断言"未调用接口"，ET-FORM-003/004）
// ============================================================

export interface CallCounter {
  /** 当前调用次数 */
  count: number;
  /** 重置计数器 */
  reset: () => void;
  /** 取消路由监听 */
  cleanup: () => Promise<void>;
}

/**
 * 创建 API 调用计数器。
 * 用于断言"接口未被调用"（如 ET-FORM-003/004 验证不调用 /add 接口）。
 *
 * @example
 * const counter = await createCallCounter(page, addApiPattern);
 * await form.clickConfirm();
 * expect(counter.count).toBe(0); // 验证未调用新增接口
 * await counter.cleanup();
 */
export async function createCallCounter(
  page: Page,
  urlPattern: string | RegExp,
): Promise<CallCounter> {
  const counter: CallCounter = {
    count: 0,
    reset: () => {
      counter.count = 0;
    },
    cleanup: async () => {
      await page.unroute(urlPattern);
    },
  };

  await page.route(urlPattern, (route) => {
    counter.count++;
    // 继续放行请求（不阻断，仅计数）
    route.continue();
  });

  return counter;
}
