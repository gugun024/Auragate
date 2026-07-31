/**
 * RTK Token Saver & Context Optimizer for AgentRouter
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | string;
  content: string | any;
}

export interface OptimizationResult {
  optimizedBody: any;
  savedCharsEstimate: number;
  tokensSavedEstimate: number;
}

// In-Memory LRU Response Cache for Identical Requests
const responseCache = new Map<string, { body: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
const MAX_CACHE_SIZE = 200;

/**
 * Optimizes chat completion request payload to minimize token consumption
 */
export function optimizeRequestPayload(body: any): OptimizationResult {
  if (!body || typeof body !== 'object') {
    return { optimizedBody: body, savedCharsEstimate: 0, tokensSavedEstimate: 0 };
  }

  const cleanedBody = JSON.parse(JSON.stringify(body));
  let originalChars = JSON.stringify(body).length;

  if (Array.isArray(cleanedBody.messages)) {
    const cleanedMessages: ChatMessage[] = [];

    for (let i = 0; i < cleanedBody.messages.length; i++) {
      const msg = cleanedBody.messages[i];
      if (!msg) continue;

      if (typeof msg.content === 'string') {
        let content = msg.content;

        // 1. Sanitize excessive blank lines (3+ newlines -> 2 newlines)
        content = content.replace(/\n{3,}/g, '\n\n');

        // 2. Trim trailing spaces on each line
        content = content
          .split('\n')
          .map((line: string) => line.trimEnd())
          .join('\n');

        msg.content = content.trim();
      }

      cleanedMessages.push(msg);
    }

    // 3. Deduplicate multiple consecutive system prompts if any
    const deduplicatedMessages: ChatMessage[] = [];
    let lastSystemIndex = -1;

    for (let i = 0; i < cleanedMessages.length; i++) {
      const msg = cleanedMessages[i];
      if (msg.role === 'system') {
        if (lastSystemIndex !== -1 && deduplicatedMessages[lastSystemIndex]) {
          // Merge consecutive system messages into one
          deduplicatedMessages[lastSystemIndex].content += '\n' + msg.content;
          continue;
        }
        lastSystemIndex = deduplicatedMessages.length;
      }
      deduplicatedMessages.push(msg);
    }

    cleanedBody.messages = deduplicatedMessages;
  }

  const optimizedChars = JSON.stringify(cleanedBody).length;
  const savedCharsEstimate = Math.max(0, originalChars - optimizedChars);
  // Estimate ~4 characters per token
  const tokensSavedEstimate = Math.round(savedCharsEstimate / 4);

  return {
    optimizedBody: cleanedBody,
    savedCharsEstimate,
    tokensSavedEstimate,
  };
}

/**
 * Generates a deterministic hash key for response caching
 */
export function generateRequestHash(body: any): string {
  try {
    const model = body?.model || '';
    const messages = body?.messages || [];
    const keyString = `${model}:${JSON.stringify(messages)}`;
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `rtk_cache_${Math.abs(hash)}`;
  } catch (e) {
    return '';
  }
}

/**
 * Gets cached response if valid
 */
export function getCachedResponse(hashKey: string): any | null {
  if (!hashKey || !responseCache.has(hashKey)) return null;

  const cached = responseCache.get(hashKey)!;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    responseCache.delete(hashKey);
    return null;
  }

  return cached.body;
}

/**
 * Sets response in cache
 */
export function setCachedResponse(hashKey: string, body: any): void {
  if (!hashKey || !body) return;

  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }

  responseCache.set(hashKey, { body, timestamp: Date.now() });
}
