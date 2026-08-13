/**
 * element-plus.ts — Element Plus 组件通用交互封装
 *
 * 沉淀测试过程问题经验总结 §1 的解决方案：
 * - el-select：force click 容器 + 键盘导航（经验 §1.2）
 * - el-cascader：offsetParent !== null 过滤可见菜单（经验 §2.1）
 * - el-date-range-picker：force click + evaluate 点击面板日期（经验 §1.3）
 * - MessageBox：page.evaluate 原生 btn.click()（经验 §1.4）
 */
import type { Page, Locator } from "@playwright/test";

// ============================================================
// el-select（经验 §1.2：placeholder 拦截 input 点击）
// ============================================================

/**
 * 通过文案选择 el-select 选项。
 * 策略：force click 容器展开下拉 → evaluate 点击匹配文案的选项。
 */
export async function selectElOptionByText(
  page: Page,
  selectTestId: string,
  optionText: string,
): Promise<void> {
  // force click 容器（绕过 placeholder 拦截）
  await page.locator(`[data-testid=${selectTestId}]`).click({ force: true });
  await page.waitForTimeout(800);

  // 在可见下拉中点击匹配选项
  await page.evaluate((text) => {
    const dropdowns = Array.from(
      document.querySelectorAll(".el-select-dropdown"),
    ).filter((d) => (d as HTMLElement).offsetParent !== null); // 过滤可见下拉
    for (const dropdown of dropdowns) {
      const items = dropdown.querySelectorAll(".el-select-dropdown__item");
      for (const item of items) {
        if (item.textContent?.trim() === text) {
          (item as HTMLElement).click();
          return;
        }
      }
    }
  }, optionText);
  await page.waitForTimeout(500);
}

/**
 * 通过索引选择 el-select 选项（第一个非禁用项）。
 */
export async function selectElOptionByIndex(
  page: Page,
  selectTestId: string,
  index: number = 0,
): Promise<void> {
  await page.locator(`[data-testid=${selectTestId}]`).click({ force: true });
  await page.waitForTimeout(800);

  await page.evaluate((idx) => {
    const dropdowns = Array.from(
      document.querySelectorAll(".el-select-dropdown"),
    ).filter((d) => (d as HTMLElement).offsetParent !== null);
    if (dropdowns.length === 0) return;
    const items = dropdowns[0].querySelectorAll(
      ".el-select-dropdown__item:not(.is-disabled)",
    );
    if (items[idx]) (items[idx] as HTMLElement).click();
  }, index);
  await page.waitForTimeout(500);
}

/**
 * 清除 el-select 已选值（点击标签上的 x）。
 */
export async function clearElSelect(
  page: Page,
  selectTestId: string,
): Promise<void> {
  await page
    .locator(`[data-testid=${selectTestId}]`)
    .locator(".el-tag__close")
    .click()
    .catch(() => {});
  await page.waitForTimeout(300);
}

// ============================================================
// el-cascader（经验 §2.1：残留菜单干扰 + offsetParent 过滤）
// ============================================================

export interface CascaderPickResult {
  tagCount: number;
  tagTexts: string[];
}

/**
 * 选择级联节点（单选）。
 * @param cascaderLocator 级联组件 Locator
 * @param level1Idx 第一级菜单索引（默认第一个非禁用项）
 * @param level2Idx 第二级菜单索引（默认第一个非禁用项）
 */
export async function pickCascaderNode(
  page: Page,
  cascaderLocator: Locator,
  level1Idx: number = 0,
  level2Idx: number = 0,
): Promise<CascaderPickResult> {
  // force click 打开级联面板
  await cascaderLocator.locator("input").click({ force: true });
  await page.waitForTimeout(1500);

  // 第一级：offsetParent 过滤可见菜单（经验 §2.1）
  await page.evaluate((idx) => {
    const menus = Array.from(
      document.querySelectorAll(".el-cascader-menu"),
    ).filter((m) => (m as HTMLElement).offsetParent !== null);
    if (menus.length > 0) {
      const nodes = menus[0].querySelectorAll(
        ".el-cascader-node:not(.is-disabled)",
      );
      if (nodes[idx]) (nodes[idx] as HTMLElement).click();
    }
  }, level1Idx);
  await page.waitForTimeout(1000);

  // 第二级
  await page.evaluate((idx) => {
    const menus = Array.from(
      document.querySelectorAll(".el-cascader-menu"),
    ).filter((m) => (m as HTMLElement).offsetParent !== null);
    if (menus.length > 1) {
      const nodes = menus[1].querySelectorAll(
        ".el-cascader-node:not(.is-disabled)",
      );
      if (nodes[idx]) (nodes[idx] as HTMLElement).click();
    }
  }, level2Idx);
  await page.waitForTimeout(500);

  // 选完节点后收起级联浮层，避免 popper 拦截后续点击（经验 §2.1 升级，FORM-004）
  await dismissCascaderPopper(page);

  return getCascaderTags(page, cascaderLocator);
}

/**
 * 选择级联节点（多选）。
 * @param picks 多组 { level1, level2 } 索引
 */
export async function pickCascaderMulti(
  page: Page,
  cascaderLocator: Locator,
  picks: Array<{ level1: number; level2: number }>,
): Promise<CascaderPickResult> {
  for (const pick of picks) {
    await cascaderLocator.locator("input").click({ force: true });
    await page.waitForTimeout(1500);

    await page.evaluate(
      ({ l1, l2 }) => {
        const menus = Array.from(
          document.querySelectorAll(".el-cascader-menu"),
        ).filter((m) => (m as HTMLElement).offsetParent !== null);
        if (menus.length > 0) {
          const nodes = menus[0].querySelectorAll(
            ".el-cascader-node:not(.is-disabled)",
          );
          if (nodes[l1]) (nodes[l1] as HTMLElement).click();
        }
      },
      { l1: pick.level1, l2: pick.level2 },
    );
    await page.waitForTimeout(1000);

    await page.evaluate(
      ({ l1, l2 }) => {
        const menus = Array.from(
          document.querySelectorAll(".el-cascader-menu"),
        ).filter((m) => (m as HTMLElement).offsetParent !== null);
        if (menus.length > 1) {
          const nodes = menus[1].querySelectorAll(
            ".el-cascader-node:not(.is-disabled)",
          );
          if (nodes[l2]) (nodes[l2] as HTMLElement).click();
        }
      },
      { l1: pick.level1, l2: pick.level2 },
    );
    await page.waitForTimeout(500);
  }

  // 多选完毕后收起级联浮层，避免 popper 拦截后续点击（FORM-004）
  await dismissCascaderPopper(page);

  return getCascaderTags(page, cascaderLocator);
}

/** 读取级联组件已选标签（兼容不同 Element Plus 版本的 tag 渲染结构） */
async function getCascaderTags(
  page: Page,
  cascaderLocator: Locator,
): Promise<CascaderPickResult> {
  // 优先匹配 .el-cascader__tags-text（标准结构），回退到 .el-tag 内文本
  let tags = await cascaderLocator
    .locator(".el-cascader__tags-text")
    .allTextContents();
  if (tags.length === 0) {
    tags = await cascaderLocator.locator(".el-tag").allInnerTexts();
  }
  return { tagCount: tags.length, tagTexts: tags };
}

/**
 * 收起 el-cascader 浮层（选完节点后调用，避免 popper 拦截后续点击）。
 *
 * 经验 §2.1 升级：单选选中末级后浮层通常自动关闭，但 checkStrictly / 多选模式下
 * 浮层保持展开，会拦截确定按钮的点击（FORM-004/008、ET-019：el-popper-container 拦截
 * confirmButton / removeRowButton）。
 *
 * 策略：向 body 派发完整指针事件序列（pointerdown→pointerup + mousedown→mouseup→click），
 * 触发 el-cascader 的 onClickOutside 关闭浮层。
 *
 * 关键修复（2026-08-10 ET-019 调试）：原实现仅派发 pointerdown + mousedown，但
 * element-plus 的 clickoutside（基于 @vueuse/core 的 onClickOutside）需要 pointerdown +
 * pointerup 配对（或 mousedown + mouseup + click）才判定为完整外部点击。缺少配对的
 * up/click 事件导致浮层不关闭。补充完整序列后浮层正常收起。
 *
 * 不点击任何真实元素，无副作用（不会误触按钮、不会关闭对话框）。
 * 相比按 Escape（可能触发 el-dialog 的 closeOnPressEscape 关闭对话框），更安全。
 */
async function dismissCascaderPopper(page: Page): Promise<void> {
  await page.evaluate(() => {
    const opts = { bubbles: true, cancelable: true, view: window };
    // PointerEvent 序列（现代浏览器优先路径）
    document.body.dispatchEvent(new PointerEvent("pointerdown", opts));
    document.body.dispatchEvent(new PointerEvent("pointerup", opts));
    // MouseEvent 序列（兜底 + clickoutside 的 click 判定）
    document.body.dispatchEvent(new MouseEvent("mousedown", opts));
    document.body.dispatchEvent(new MouseEvent("mouseup", opts));
    document.body.dispatchEvent(new MouseEvent("click", opts));
  });
  await page.waitForTimeout(300);
}

// ============================================================
// el-date-range-picker（经验 §1.3：日历单元格定位失败）
// ============================================================

/**
 * 选择日期范围（点左面板第一个可用日期 + 右面板第一个可用日期）。
 * @param dateEditorLocator 日期编辑器 Locator
 */
export async function pickDateRange(
  page: Page,
  dateEditorLocator: Locator,
): Promise<{ start: string; end: string }> {
  // force click 打开日历
  await dateEditorLocator.click({ force: true });
  await page.waitForTimeout(1500);

  // 左面板（开始日期）：.is-left 而非 :nth-child（经验 §1.3）
  await page.evaluate(() => {
    const left = document.querySelector(
      ".el-date-range-picker__content.is-left",
    );
    if (left) {
      const cell = left.querySelector("td.available");
      if (cell) (cell as HTMLElement).click();
    }
  });
  await page.waitForTimeout(500);

  // 右面板（结束日期）：.is-right
  await page.evaluate(() => {
    const right = document.querySelector(
      ".el-date-range-picker__content.is-right",
    );
    if (right) {
      const cell = right.querySelector("td.available");
      if (cell) (cell as HTMLElement).click();
    }
  });
  await page.waitForTimeout(500);

  // 读取填入的值
  const inputs = dateEditorLocator.locator(".el-range-input");
  const start = await inputs
    .nth(0)
    .inputValue()
    .catch(() => "");
  const end = await inputs
    .nth(1)
    .inputValue()
    .catch(() => "");

  return { start, end };
}

// ============================================================
// MessageBox（经验 §1.4 升级：定位器 + 时序 + Playwright 原生 click）
// ============================================================

/**
 * 等待 MessageBox 可见（带超时）。
 *
 * 解决 LIST-009 时序问题：点击启停按钮后 MessageBox 异步渲染，
 * 即时 isVisible() 可能在渲染前返回 false。本方法用 waitFor 等待可见。
 * 用 .first() 避免残留 MessageBox DOM 导致 strict mode 多匹配。
 */
export async function waitForMessageBox(
  page: Page,
  timeoutMs: number = 5000,
): Promise<boolean> {
  try {
    await page
      .locator(".el-messagebox")
      .first()
      .waitFor({ state: "visible", timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * 确认 MessageBox（点击指定按钮，默认"确定"）。
 *
 * 升级原因（LIST-010）：原实现用 evaluate 原生 click，在残留 DOM / 事件路径
 * 异常时不触发 Vue handler（快照显示确定按钮 [active] 仍可见）。
 * 现改为：先 waitFor MessageBox 可见（解决时序），再用 Playwright locator click
 * （自动等待可点击 + 真实触发事件），限定在 .el-messagebox 内避免误点对话框同名按钮。
 */
export async function confirmMessageBox(
  page: Page,
  buttonText: string = "确定",
): Promise<void> {
  const box = page.locator(".el-messagebox").first();
  await box.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  await box
    .locator("button")
    .filter({ hasText: buttonText })
    .first()
    .click({ timeout: 5000 });
  await page.waitForTimeout(500);
}

/** 取消 MessageBox（点击"取消"）。 */
export async function cancelMessageBox(page: Page): Promise<void> {
  await confirmMessageBox(page, "取消");
}

/**
 * MessageBox 是否可见（即时检查）。
 * 用 .first() 避免残留 MessageBox DOM 导致 strict mode 多匹配被 catch 吞成 false。
 * 禁止 getComputedStyle（经验 §6.1）。
 */
export async function isMessageBoxVisible(page: Page): Promise<boolean> {
  return page
    .locator(".el-messagebox")
    .first()
    .isVisible()
    .catch(() => false);
}
