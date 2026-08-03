/**
 * visibility.ts — 可见性判断与残留清理
 *
 * 沉淀经验总结：
 * - §6.1：禁止 getComputedStyle(display) 判断 overlay/drawer/dialog 可见性
 * - §4.4：跨脚本残留弹窗导致点击超时
 * - §5.2：列表固定列导致单元格索引偏移
 */
import type { Page, Locator } from "@playwright/test";

/**
 * 安全的可见性判断（封装 isVisible，统一禁止 getComputedStyle）。
 *
 * Element Plus 的 overlay/drawer/dialog 关闭时，父级 .el-overlay display:none，
 * 子元素 display 仍为 flex → getComputedStyle 误判。必须用 isVisible。
 */
export async function isVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/**
 * 移除残留遮罩层（经验 §4.4）。
 * 跨脚本执行时弹窗可能未完全关闭，遮罩层拦截 pointer events 导致 click 超时。
 */
export async function removeResidualOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    // 原生 click 取消按钮（比 Escape 可靠）
    const cancelBtn = document.querySelector(
      "[data-testid=billing-cancel-btn]",
    );
    if (cancelBtn) (cancelBtn as HTMLElement).click();
  });
  await page.waitForTimeout(300);

  // 兜底：移除所有可见 overlay
  await page.evaluate(() => {
    document.querySelectorAll(".el-overlay").forEach((o) => {
      if ((o as HTMLElement).offsetParent !== null) o.remove();
    });
  });
  await page.waitForTimeout(200);
}

/**
 * 安全页面跳转：goto + 等待 + 清理残留遮罩 + 等列表就绪。
 * 每个 spec/test 开头推荐调用，确保干净状态。
 */
export async function safeGoto(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await removeResidualOverlays(page);
  // 等列表首行可见（不用 networkidle）
  await page
    .locator(".el-table__row")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => {});
}

// ============================================================
// 列表固定列偏移修正（经验 §5.2）
// ============================================================

/**
 * el-table 带 expand-column 时，td 实际数 = 表头数 + 1。
 * idx 0=序号, idx 1=展开列(空), idx 2 起=实际数据列。
 * 因此目标列的实际 td 索引 = 表头索引 + 1。
 */
export const EXPAND_COLUMN_OFFSET = 1;

/**
 * 将「表头逻辑列索引」转换为「实际 td 索引」。
 * @param logicalIndex 表头列索引（0=序号, 1=机构名称, 2=检测项目...）
 * @returns 实际 td 索引（已加展开列偏移）
 */
export function cellIndex(logicalIndex: number): number {
  return logicalIndex + EXPAND_COLUMN_OFFSET;
}

/** 列表表头逻辑列名 → 逻辑索引映射 */
export const LIST_COLUMN_INDEX = {
  seq: 0, // 序号
  orgName: 1, // 机构名称
  projectCodes: 2, // 检测项目
  totalQuota: 3, // 样本分析总次数
  storageDays: 4, // 数据存储期限
  downloadTimes: 5, // 单样本下载次数
  contractNo: 6, // 合同编号
  contractPeriod: 7, // 合同周期
  status: 8, // 合同状态
  actions: 9, // 操作
} as const;

export type ListColumnName = keyof typeof LIST_COLUMN_INDEX;

/**
 * 获取指定行的指定列文本（自动修正展开列偏移）。
 */
export async function getCellText(
  page: Page,
  rowIndex: number,
  column: ListColumnName,
): Promise<string> {
  const tdIndex = cellIndex(LIST_COLUMN_INDEX[column]);
  const text = await page
    .locator(".el-table__row")
    .nth(rowIndex)
    .locator("td")
    .nth(tdIndex)
    .textContent();
  return (text || "").trim();
}
