/**
 * Tests for the centralized model-catalog.ts lookupModel() function.
 */

import { describe, test, expect } from "bun:test";
import { lookupModel, DEFAULT_CONTEXT_WINDOW, DEFAULT_SUPPORTS_VISION } from "./model-catalog.js";

describe("lookupModel", () => {
  describe("MiniMax models", () => {
    test("MiniMax-M2.7 → contextWindow: 204_800, supportsVision: false", () => {
      const entry = lookupModel("MiniMax-M2.7");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(204_800);
      expect(entry!.supportsVision).toBe(false);
    });

    test("minimax-01 → contextWindow: 1_000_000, supportsVision: false", () => {
      const entry = lookupModel("minimax-01");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(1_000_000);
      expect(entry!.supportsVision).toBe(false);
    });

    test("minimax-m1 → contextWindow: 1_000_000, supportsVision: false", () => {
      const entry = lookupModel("minimax-m1");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(1_000_000);
      expect(entry!.supportsVision).toBe(false);
    });

    test("minimax catch-all has temperatureRange", () => {
      const entry = lookupModel("minimax-text-01");
      expect(entry).toBeDefined();
      expect(entry!.temperatureRange).toEqual({ min: 0.01, max: 1.0 });
    });
  });

  describe("Grok models", () => {
    test("grok-4 → contextWindow: 256_000", () => {
      const entry = lookupModel("grok-4");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(256_000);
    });

    test("grok-4-fast → contextWindow: 2_000_000", () => {
      const entry = lookupModel("grok-4-fast");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(2_000_000);
    });

    test("grok-code-fast → contextWindow: 256_000", () => {
      const entry = lookupModel("grok-code-fast");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(256_000);
    });

    test("grok-3 → contextWindow: 131_072", () => {
      const entry = lookupModel("grok-3");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(131_072);
    });
  });

  describe("GLM models", () => {
    test("glm-5 → contextWindow: 80_000, supportsVision: true", () => {
      const entry = lookupModel("glm-5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(80_000);
      expect(entry!.supportsVision).toBe(true);
    });

    test("glm-4v → contextWindow: 128_000, supportsVision: true", () => {
      const entry = lookupModel("glm-4v");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(128_000);
      expect(entry!.supportsVision).toBe(true);
    });

    test("glm-4v-plus → contextWindow: 128_000, supportsVision: true", () => {
      const entry = lookupModel("glm-4v-plus");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(128_000);
      expect(entry!.supportsVision).toBe(true);
    });

    test("glm-4-long → contextWindow: 1_000_000", () => {
      const entry = lookupModel("glm-4-long");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(1_000_000);
    });

    test("unknown glm variant falls through to glm- catch-all", () => {
      const entry = lookupModel("glm-99");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(131_072);
      expect(entry!.supportsVision).toBe(false);
    });
  });

  describe("Kimi models", () => {
    test("kimi-k2.5 → contextWindow: 262_144", () => {
      const entry = lookupModel("kimi-k2.5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(262_144);
    });

    test("kimi-k2-5 → contextWindow: 262_144", () => {
      const entry = lookupModel("kimi-k2-5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(262_144);
    });

    test("kimi-k2 → contextWindow: 131_000", () => {
      const entry = lookupModel("kimi-k2");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(131_000);
    });

    test("kimi catch-all → contextWindow: 131_072", () => {
      const entry = lookupModel("kimi");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(131_072);
    });
  });

  describe("OpenAI models", () => {
    test("gpt-4o → contextWindow: 128_000", () => {
      const entry = lookupModel("gpt-4o");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(128_000);
    });

    test("gpt-5 → contextWindow: 400_000", () => {
      const entry = lookupModel("gpt-5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(400_000);
    });

    test("o3 → contextWindow: 200_000", () => {
      const entry = lookupModel("o3");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(200_000);
    });
  });

  describe("Xiaomi/MiMo models", () => {
    test("xiaomi → toolNameLimit: 64", () => {
      const entry = lookupModel("xiaomi-model");
      expect(entry).toBeDefined();
      expect(entry!.toolNameLimit).toBe(64);
    });

    test("mimo → toolNameLimit: 64", () => {
      const entry = lookupModel("mimo-vl-7b");
      expect(entry).toBeDefined();
      expect(entry!.toolNameLimit).toBe(64);
    });
  });

  describe("Unknown model", () => {
    test("unknown-model → undefined", () => {
      expect(lookupModel("unknown-model")).toBeUndefined();
    });

    test("empty string → undefined", () => {
      expect(lookupModel("")).toBeUndefined();
    });
  });

  describe("Vendor-prefixed model IDs", () => {
    test("x-ai/grok-4-fast → contextWindow: 2_000_000", () => {
      const entry = lookupModel("x-ai/grok-4-fast");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(2_000_000);
    });

    test("zhipu/glm-5 → contextWindow: 80_000, supportsVision: true", () => {
      const entry = lookupModel("zhipu/glm-5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(80_000);
      expect(entry!.supportsVision).toBe(true);
    });

    test("openrouter/x-ai/grok-4 → contextWindow: 256_000", () => {
      const entry = lookupModel("openrouter/x-ai/grok-4");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(256_000);
    });
  });

  describe("Case insensitivity", () => {
    test("GLM-5 (uppercase) → contextWindow: 80_000", () => {
      const entry = lookupModel("GLM-5");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(80_000);
    });

    test("GROK-4 (uppercase) → contextWindow: 256_000", () => {
      const entry = lookupModel("GROK-4");
      expect(entry).toBeDefined();
      expect(entry!.contextWindow).toBe(256_000);
    });
  });

  describe("Constants", () => {
    test("DEFAULT_CONTEXT_WINDOW is 200_000", () => {
      expect(DEFAULT_CONTEXT_WINDOW).toBe(200_000);
    });

    test("DEFAULT_SUPPORTS_VISION is true", () => {
      expect(DEFAULT_SUPPORTS_VISION).toBe(true);
    });
  });
});
