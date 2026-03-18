/**
 * Adapter manager for selecting model-specific adapters
 *
 * This allows us to handle different model quirks:
 * - Grok: XML function calls
 * - Gemini: Thought signatures in reasoning_details
 * - Deepseek: (future)
 * - Others: (future)
 */

import { BaseModelAdapter, DefaultAdapter } from "./base-adapter";
import { GrokAdapter } from "./grok-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { CodexAdapter } from "./codex-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { QwenAdapter } from "./qwen-adapter";
import { MiniMaxAdapter } from "./minimax-adapter";
import { DeepSeekAdapter } from "./deepseek-adapter";
import { GLMAdapter } from "./glm-adapter";

export class AdapterManager {
  private adapters: BaseModelAdapter[];
  private defaultAdapter: DefaultAdapter;

  constructor(modelId: string) {
    // Register all available adapters
    this.adapters = [
      new GrokAdapter(modelId),
      new GeminiAdapter(modelId),
      new CodexAdapter(modelId), // Must be before OpenAIAdapter (codex matches first)
      new OpenAIAdapter(modelId),
      new QwenAdapter(modelId),
      new MiniMaxAdapter(modelId),
      new DeepSeekAdapter(modelId),
      new GLMAdapter(modelId),
    ];
    this.defaultAdapter = new DefaultAdapter(modelId);
  }

  /**
   * Get the appropriate adapter for the current model
   */
  getAdapter(): BaseModelAdapter {
    for (const adapter of this.adapters) {
      if (adapter.shouldHandle(this.defaultAdapter["modelId"])) {
        return adapter;
      }
    }
    return this.defaultAdapter;
  }

  /**
   * Check if current model needs special handling
   */
  needsTransformation(): boolean {
    return this.getAdapter() !== this.defaultAdapter;
  }
}
