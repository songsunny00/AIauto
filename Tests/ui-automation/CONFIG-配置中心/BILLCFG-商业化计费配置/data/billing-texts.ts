/**
 * billing-texts.ts — 文案常量（精确匹配，skill §8.1）
 *
 * 所有校验提示、状态文案、toast 消息必须与前端实际文案完全一致。
 * 修改时须从 03-测试用例文档.md 或页面实际展示复制，禁止从记忆/SKILL 取。
 */

/** 合同状态文案与颜色映射（FT-LIST-008） */
export const STATUS_TEXTS = {
  NORMAL: "正常",
  EXPIRING_SOON: "即将到期",
  EXPIRED: "已到期",
  DISABLED: "已停用",
  TERMINATED: "已终止",
} as const;

/** Element Plus tag 类型 → 颜色语义（用于状态颜色断言） */
export const STATUS_TAG_TYPE: Record<string, string> = {
  正常: "success", // 绿色
  即将到期: "warning", // 橙色
  已到期: "info", // 灰色
  已停用: "danger", // 红色
};

/** 校验提示文案（FT-FORM-002/003/009/010/011，FT-FORM-016） */
export const VALIDATION_TEXTS = {
  // 必填校验（form-item__error，FT-FORM-002）
  orgRequired: "请选择机构名称",
  contractNoRequired: "请输入合同编号",
  contractRangeRequired: "请选择合同周期",
  storageDaysRequired: "请输入数据存储期限",

  // 格式校验（FT-FORM-003）
  contractNoInvalid: "合同编号仅支持字母、数字、-或_",

  // 配额行校验（toast，FT-FORM-009/010/011）
  quotaProjectRequired: (row: number) => `第 ${row} 行检测项目及产品套餐必填`,
  quotaValueRequired: (row: number) => `第 ${row} 行样本分析次数配额必填`,
  quotaIntegerOnly: (row: number) => `第 ${row} 行样本分析次数配额仅支持整数`,

  // 重复校验（FT-FORM-016）
  contractNoDuplicate: "合同编号已存在",

  // 产品套餐组合唯一校验（ET-FORM-019/020，动态文案前缀，含实际 projectCode/productNo）
  quotaComboDuplicate: "同一合同内产品套餐不可重复配置",
} as const;

/** 成功 toast 消息（FT-FORM-004/006，FT-LIST-009/010） */
export const TOAST_TEXTS = {
  addSuccess: "新增成功",
  editSuccess: "保存成功！",
  disableSuccess: "禁用成功",
  enableSuccess: "启用成功",
} as const;

/** 行操作按钮文案（FT-LIST-009/010） */
export const BUTTON_TEXTS = {
  disable: "禁用",
  enable: "启用",
  edit: "编辑",
  detail: "明细",
  addTenant: "新增计费方案",
  confirm: "确定",
  cancel: "取消",
  addRow: "添加一行",
  removeRow: "删除",
  close: "关闭",
  search: "查询",
  reset: "重置",
} as const;
