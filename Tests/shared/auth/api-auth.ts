import { APIRequestContext, apiRequest } from "@playwright/test";
import { resolveAuthStatePath, readAuthState } from "./auth-state";

/**
 * 创建一个已携带登录态的接口请求上下文。
 *
 * 复用与 UI 完全相同的 Tests/shared/.auth/<一级模块>/domain-state.json，
 * 接口测试因此无需再登录、也无需再过图片拖拽验证码。
 *
 * 鉴权方式说明：
 * - cookie 鉴权（最常见）：storageState 会自动把 cookie 随每个请求发出，无需额外处理。
 * - localStorage 里的 token 鉴权：cookie 带不出去，需通过 extraHTTPHeaders 传入，
 *   例如 { Authorization: `Bearer ${token}` }，token 可用 getTokenFromAuthState() 读取。
 */
export async function createAuthedApiContext(options?: {
  domain?: string;
  baseURL?: string;
  extraHTTPHeaders?: Record<string, string>;
}): Promise<APIRequestContext> {
  const statePath = resolveAuthStatePath(options?.domain);

  const contextOptions: Parameters<typeof apiRequest.newContext>[0] = {
    baseURL:
      options?.baseURL || process.env.TEST_BASE_URL || "http://localhost:30080",
    storageState: statePath,
  };
  if (options?.extraHTTPHeaders) {
    contextOptions.extraHTTPHeaders = options.extraHTTPHeaders;
  }
  return apiRequest.newContext(contextOptions);
}

/**
 * 从已导出登录态的 localStorage 中读取某个 token key（用于 Bearer 鉴权场景）。
 */
export function getTokenFromAuthState(
  tokenKey: string,
  domain?: string,
): string | undefined {
  const state = readAuthState(domain);
  const origin = Object.keys(state.origins ?? {})[0];
  if (!origin) return undefined;
  const entries: Array<{ name: string; value: string }> =
    state.origins[origin].localStorage ?? [];
  const found = entries.find((e) => e.name === tokenKey);
  return found?.value;
}
