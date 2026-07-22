/**
 * 付费配额配置 - 测试数据
 * 对应 03-测试用例文档.md §2 测试数据准备
 */

/** 新增合同 - 合法基础信息 */
export const VALID_CONTRACT = {
  orgName: "华大基因",
  contractNo: "HT-UI-AUTO-001",
  dateRange: ["2026-01-01 00:00:00", "2027-12-31 23:59:59"] as [string, string],
  storageDays: 90,
  downloadTimes: 2,
};

/** 新增合同 - 配额行 */
export const QUOTA_ROWS = {
  single: {
    selections: [["CNV-seq", "STANDARD"]] as [string, string][],
    quota: 100,
  },
  multi: {
    selections: [
      ["CNV-seq", "STANDARD"],
      ["NIFTY", "STANDARD"],
    ] as [string, string][],
    quota: 200,
  },
};

/** 非法合同编号 - 包含非法字符 */
export const INVALID_CONTRACT_NO = "HT@#$%";

/** 非法配额值 */
export const INVALID_QUOTA = {
  decimal: "3.5",
  nonNumeric: "abc",
  empty: "",
};

/** 合同状态枚举 */
export const CONTRACT_STATUS = {
  NORMAL: "正常",
  EXPIRING_SOON: "即将到期",
  EXPIRED: "已到期",
  DISABLED: "已停用",
} as const;

/** 状态标签颜色映射 */
export const STATUS_TAG_TYPE: Record<string, string> = {
  正常: "success",
  即将到期: "warning",
  已到期: "info",
  已停用: "danger",
};

/** 默认新增弹窗预期值 */
export const DEFAULT_DIALOG_VALUES = {
  storageDays: "90",
  downloadTimes: "2",
  totalQuota: "",
};

/** 等待超时配置（毫秒） */
export const TIMEOUTS = {
  short: 5_000,
  medium: 10_000,
  long: 15_000,
  network: 20_000,
};
