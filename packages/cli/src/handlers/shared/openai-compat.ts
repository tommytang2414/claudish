/**
 * Re-export shim for backwards compatibility.
 * All implementations have moved to focused modules:
 * - format/openai-messages.ts  — message conversion
 * - format/openai-tools.ts     — tool schema conversion
 * - format/identity-filter.ts  — identity filtering
 * - stream-parsers/openai-sse.ts — SSE stream parser
 */

export { convertMessagesToOpenAI } from "./format/openai-messages.js";
export { convertToolsToOpenAI } from "./format/openai-tools.js";
export { filterIdentity } from "./format/identity-filter.js";
export {
  createStreamingResponseHandler,
  createStreamingState,
  validateToolArguments,
  estimateTokens,
  type StreamingState,
  type ToolState,
} from "./stream-parsers/openai-sse.js";
