/**
 * errors.ts — 错误消息收集（经验 §1.1：toast + form-item__error 双查）
 *
 * Element Plus 配额行校验错误出现在 .el-message__content（toast），
 * 必填字段校验出现在 .el-form-item__error（行内）。
 * 两种都必须检查，否则会遗漏。
 */
import type { Page } from '@playwright/test';

export interface CollectedErrors {
  /** toast 消息列表（.el-message__content） */
  toasts: string[];
  /** 行内错误列表（.el-form-item__error） */
  formErrors: string[];
  /** 合并去重后的所有错误 */
  all: string[];
}

/**
 * 收集页面所有错误消息（toast + 行内）。
 */
export async function collectErrors(page: Page): Promise<CollectedErrors> {
  return page.evaluate(() => {
    const toasts = Array.from(
      document.querySelectorAll('.el-message__content'),
    ).map((m) => m.textContent?.trim() || '');

    const formErrors = Array.from(
      document.querySelectorAll('.el-form-item__error'),
    ).map((e) => e.textContent?.trim() || '');

    return {
      toasts,
      formErrors,
      all: [...toasts, ...formErrors],
    };
  });
}

/**
 * 断言错误消息包含指定文本（toContain 语义）。
 */
export async function expectErrorContains(
  page: Page,
  text: string,
): Promise<boolean> {
  const errors = await collectErrors(page);
  return errors.all.some((e) => e.includes(text));
}

/**
 * 断言错误消息精确匹配指定文本（完整文案匹配，skill §8.1）。
 */
export async function expectErrorExact(
  page: Page,
  text: string,
): Promise<boolean> {
  const errors = await collectErrors(page);
  return errors.all.includes(text);
}

/**
 * 断言页面无任何错误消息。
 */
export async function expectNoErrors(page: Page): Promise<boolean> {
  const errors = await collectErrors(page);
  return errors.all.length === 0;
}

/**
 * 等待错误消息出现（带超时）。
 * @param timeoutMs 超时毫秒（默认 3000）
 */
export async function waitForError(
  page: Page,
  text: string,
  timeoutMs: number = 3000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await expectErrorContains(page, text)) return true;
    await page.waitForTimeout(200);
  }
  return false;
}
