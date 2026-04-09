/**
 * Anthropic SSE passthrough stream parser.
 *
 * For providers that speak native Anthropic format (MiniMax, Kimi, Z.AI),
 * this is a near-identity transform — the response is already in Claude SSE format.
 * Only light fixups are needed (e.g., ensuring message IDs, merging usage data).
 *
 * Will be extracted from anthropic-compat-handler.ts in Phase 3.
 */

import type { Context } from "hono";
import { log } from "../../../logger.js";

/**
 * Pass through an Anthropic-format SSE stream with minimal fixups.
 * The response body is already Claude-compatible SSE events.
 */
export function createAnthropicPassthroughStream(
  c: Context,
  response: Response,
  opts: {
    modelName: string;
    onTokenUpdate?: (input: number, output: number) => void;
  }
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let isClosed = false;

  return c.body(
    new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body!.getReader();
          let buffer = "";
          let inputTokens = 0;
          let cacheReadInputTokens = 0;
          let cacheCreationInputTokens = 0;
          let outputTokens = 0;

          let totalLines = 0;
          let textChunks = 0;
          let toolUseBlocks = 0;
          let stopReason: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

            // Split by \n\n to get complete SSE events (same pattern as other stream parsers).
            // This ensures each enqueued chunk is a complete event, which prevents
            // consumers from receiving partial events that cause parse failures.
            const eventChunks = buffer.split("\n\n");
            buffer = eventChunks.pop() || "";

            for (const eventChunk of eventChunks) {
              if (!eventChunk.trim()) continue;
              totalLines += eventChunk.split("\n").length;

              if (!isClosed) {
                // Pass through complete SSE event with double-newline terminator
                controller.enqueue(encoder.encode(eventChunk + "\n\n"));
              }

              // Extract usage and debug info from the data line of this event
              const dataLine = eventChunk.split("\n").find((l) => l.startsWith("data: "));
              if (dataLine) {
                log(`[SSE:anthropic] ${dataLine.slice(6).substring(0, 300)}`);

                try {
                  const data = JSON.parse(dataLine.slice(6));
                  if (data.message?.usage) {
                    inputTokens = data.message.usage.input_tokens || inputTokens;
                    outputTokens = data.message.usage.output_tokens || outputTokens;
                    cacheReadInputTokens =
                      data.message.usage.cache_read_input_tokens || cacheReadInputTokens;
                    cacheCreationInputTokens =
                      data.message.usage.cache_creation_input_tokens || cacheCreationInputTokens;
                  }
                  if (data.usage) {
                    inputTokens = data.usage.input_tokens || inputTokens;
                    outputTokens = data.usage.output_tokens || outputTokens;
                    cacheReadInputTokens =
                      data.usage.cache_read_input_tokens || cacheReadInputTokens;
                    cacheCreationInputTokens =
                      data.usage.cache_creation_input_tokens || cacheCreationInputTokens;
                  }
                  // Log text content for debugging
                  if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
                    const txt = data.delta.text || "";
                    textChunks++;
                    log(
                      `[AnthropicSSE] Text chunk: "${txt.substring(0, 30).replace(/\n/g, "\\n")}" (${txt.length} chars)`
                    );
                  }
                  // Track tool_use blocks
                  if (
                    data.type === "content_block_start" &&
                    data.content_block?.type === "tool_use"
                  ) {
                    toolUseBlocks++;
                    log(`[AnthropicSSE] Tool use: ${data.content_block.name}`);
                  }
                  // Track stop reason
                  if (data.type === "message_delta" && data.delta?.stop_reason) {
                    stopReason = data.delta.stop_reason;
                  }
                } catch {}
              }
            }
          }

          log(
            `[AnthropicSSE] Stream complete for ${opts.modelName}: ${totalLines} lines, ${textChunks} text chunks, ${toolUseBlocks} tool_use blocks, stop_reason=${stopReason}`
          );

          if (opts.onTokenUpdate) {
            const totalInputTokens =
              inputTokens + cacheReadInputTokens + cacheCreationInputTokens;
            if (cacheReadInputTokens > 0 || cacheCreationInputTokens > 0) {
              log(
                `[AnthropicSSE] Cache tokens: input=${inputTokens}, cache_read=${cacheReadInputTokens}, cache_creation=${cacheCreationInputTokens}, total=${totalInputTokens}, output=${outputTokens}`
              );
            }
            opts.onTokenUpdate(totalInputTokens, outputTokens);
          }

          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        } catch (e) {
          log(`[AnthropicSSE] Stream error: ${e}`);
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        }
      },
      cancel() {
        isClosed = true;
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}
