/**
 * OpenAI tool schema conversion utilities.
 *
 * Converts Claude/Anthropic tool definitions to OpenAI function format.
 */

import { removeUriFormat } from "../../../transform.js";

/**
 * Convert Claude tools to OpenAI function format
 */
export function convertToolsToOpenAI(req: any, summarize = false): any[] {
  return (
    req.tools?.map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name,
        description: summarize
          ? summarizeToolDescription(tool.name, tool.description)
          : tool.description,
        parameters: summarize
          ? summarizeToolParameters(tool.input_schema)
          : removeUriFormat(tool.input_schema),
      },
    })) || []
  );
}

/**
 * Summarize tool description to reduce token count
 * Keeps first sentence or first 150 chars, whichever is shorter
 */
function summarizeToolDescription(name: string, description: string): string {
  if (!description) return name;

  // Remove markdown, examples, and extra whitespace
  let clean = description
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/<[^>]+>/g, "") // Remove HTML/XML tags
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  // Get first sentence
  const firstSentence = clean.match(/^[^.!?]+[.!?]/)?.[0] || clean;

  // Limit to 150 chars
  if (firstSentence.length > 150) {
    return firstSentence.slice(0, 147) + "...";
  }

  return firstSentence;
}

/**
 * Summarize tool parameters schema to reduce token count
 * Keeps required fields and simplifies descriptions
 */
function summarizeToolParameters(schema: any): any {
  if (!schema) return schema;

  const summarized = removeUriFormat({ ...schema });

  // Summarize property descriptions
  if (summarized.properties) {
    for (const [key, prop] of Object.entries(summarized.properties)) {
      const p = prop as any;
      if (p.description && p.description.length > 80) {
        // Keep first sentence or truncate
        const firstSentence = p.description.match(/^[^.!?]+[.!?]/)?.[0] || p.description;
        p.description =
          firstSentence.length > 80 ? firstSentence.slice(0, 77) + "..." : firstSentence;
      }
      // Remove examples from enum descriptions
      if (p.enum && Array.isArray(p.enum) && p.enum.length > 5) {
        p.enum = p.enum.slice(0, 5); // Limit enum values
      }
    }
  }

  return summarized;
}
