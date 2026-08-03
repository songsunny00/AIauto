/**
 * billing.fixture.ts — 计费配置模块夹具
 *
 * 组合 3 个 Page Object + 写操作数据清理上下文。
 * 所有计费配置 spec 继承此 fixture。
 */
import { test as baseTest, expect } from '../../../fixtures/base.fixture';
import { BillingListPage } from '../pages/billing-list.page';
import { BillingFormPage } from '../pages/billing-form.page';
import { BillingDetailPage } from '../pages/billing-detail.page';

export const test = baseTest.extend<{
  billingList: BillingListPage;
  billingForm: BillingFormPage;
  billingDetail: BillingDetailPage;
  billingContext: { createdContractNos: string[] };
}>({
  billingList: async ({ authedPage }, use) => {
    await use(new BillingListPage(authedPage));
  },
  billingForm: async ({ authedPage }, use) => {
    await use(new BillingFormPage(authedPage));
  },
  billingDetail: async ({ authedPage }, use) => {
    await use(new BillingDetailPage(authedPage));
  },
  billingContext: async ({}, use) => {
    const ctx = { createdContractNos: [] as string[] };
    await use(ctx);
    // afterEach: 可在此清理写操作产生的数据（如有清理接口）
  },
});

export { expect };
