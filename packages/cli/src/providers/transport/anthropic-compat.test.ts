// REGRESSION: mm@MiniMax-M2.5 HTTP 401 — Fixed in /fix session dev-fix-20260306-023717-beb53cef
//
// Root cause: AnthropicCompatProvider.getHeaders() always sends "x-api-key" but
// MiniMax's /anthropic/v1/messages endpoint requires "Authorization: Bearer <key>".
// Fix: RemoteProvider.authScheme: "bearer" | "x-api-key" selects the correct auth header.

import { describe, it, expect } from "bun:test";
import { AnthropicCompatProvider } from "./anthropic-compat.js";
import type { RemoteProvider } from "../../../handlers/shared/remote-provider-types.js";

const BASE_CAPABILITIES = {
  supportsTools: true,
  supportsVision: true,
  supportsStreaming: true,
  supportsJsonMode: false,
  supportsReasoning: false,
};

const TEST_API_KEY = "test-key-abc123";

describe("AnthropicCompatProvider.getHeaders()", () => {
  it("returns Authorization: Bearer header when authScheme is 'bearer'", async () => {
    const provider: RemoteProvider = {
      name: "minimax",
      baseUrl: "https://api.minimax.io",
      apiPath: "/anthropic/v1/messages",
      apiKeyEnvVar: "MINIMAX_API_KEY",
      prefixes: ["mm@", "mmax@"],
      capabilities: BASE_CAPABILITIES,
      authScheme: "bearer",
    };

    const transport = new AnthropicCompatProvider(provider, TEST_API_KEY);
    const headers = await transport.getHeaders();

    expect(headers["Authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers["x-api-key"]).toBeUndefined();
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("returns x-api-key header when authScheme is 'x-api-key'", async () => {
    const provider: RemoteProvider = {
      name: "kimi",
      baseUrl: "https://api.moonshot.cn",
      apiPath: "/anthropic/v1/messages",
      apiKeyEnvVar: "KIMI_API_KEY",
      prefixes: ["kimi@", "moon@"],
      capabilities: BASE_CAPABILITIES,
      authScheme: "x-api-key",
    };

    const transport = new AnthropicCompatProvider(provider, TEST_API_KEY);
    const headers = await transport.getHeaders();

    expect(headers["x-api-key"]).toBe(TEST_API_KEY);
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("defaults to x-api-key when authScheme is undefined", async () => {
    const provider: RemoteProvider = {
      name: "zai",
      baseUrl: "https://api.z.ai",
      apiPath: "/anthropic/v1/messages",
      apiKeyEnvVar: "ZAI_API_KEY",
      prefixes: ["zai@"],
      capabilities: BASE_CAPABILITIES,
      // authScheme intentionally omitted — legacy / default behavior
    };

    const transport = new AnthropicCompatProvider(provider, TEST_API_KEY);
    const headers = await transport.getHeaders();

    expect(headers["x-api-key"]).toBe(TEST_API_KEY);
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });
});
