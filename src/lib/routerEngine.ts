import { db } from './db';
import { ProviderKey } from '@prisma/client';
import { optimizeRequestPayload } from './tokenSaver';

export const DEFAULT_PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  anthropic: 'https://api.anthropic.com/v1',
  mistral: 'https://api.mistral.ai/v1',
};

export interface RouteRequestOptions {
  model?: string;
  provider?: string;
  body: any;
  headers?: Record<string, string>;
}

export interface RouteResult {
  response: Response;
  keyUsed: ProviderKey;
  retryCount: number;
}

/**
 * Normalizes provider base URL and target endpoint
 */
export function getEndpointUrl(provider: string, customBaseUrl?: string | null, path: string = '/chat/completions'): string {
  let baseUrl = customBaseUrl || DEFAULT_PROVIDER_URLS[provider.toLowerCase()] || 'https://api.openai.com/v1';
  baseUrl = baseUrl.replace(/\/+$/, ''); // Trim trailing slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Gets candidate keys from DB sorted by priority and round-robin usage
 */
export async function getCandidateKeys(requestedProvider?: string): Promise<ProviderKey[]> {
  const now = new Date();

  // Find all keys that are ACTIVE or COOLDOWN whose cooldown has expired
  const allKeys = await db.providerKey.findMany({
    where: {
      status: { not: 'DISABLED' },
      ...(requestedProvider && requestedProvider !== 'auto'
        ? { provider: { equals: requestedProvider.toLowerCase() } }
        : {}),
    },
    orderBy: [
      { priority: 'asc' },
      { lastUsedAt: 'asc' },
    ],
  });

  const validKeys: ProviderKey[] = [];

  for (const key of allKeys) {
    if (key.status === 'COOLDOWN') {
      if (key.cooldownUntil && key.cooldownUntil <= now) {
        // Cooldown has expired, reactivate key
        const updated = await db.providerKey.update({
          where: { id: key.id },
          data: { status: 'ACTIVE', cooldownUntil: null, errorCount: 0 },
        });
        validKeys.push(updated);
      } else {
        // Still in cooldown, skip
        continue;
      }
    } else {
      validKeys.push(key);
    }
  }

  return validKeys;
}

/**
 * Core Router Executer with Automatic Failover, Key Rotation, System Prompt Injection & RTK Token Saver
 */
export async function executeChatCompletions(options: RouteRequestOptions): Promise<RouteResult> {
  const startTime = Date.now();
  const requestedModel = options.body?.model || 'gpt-3.5-turbo';
  
  // Deduce provider from requested model or provider parameter
  let targetProvider = options.provider;
  if (!targetProvider && requestedModel.includes('/')) {
    targetProvider = requestedModel.split('/')[0];
  }

  const candidateKeys = await getCandidateKeys(targetProvider);

  if (candidateKeys.length === 0) {
    throw new Error(
      `Tidak ada API Key aktif yang tersedia untuk provider '${targetProvider || 'semua'}'. Silakan tambahkan API Key di Dashboard.`
    );
  }

  // Check & inject Centralized System Prompt if enabled
  const globalSetting = await db.systemSetting.findUnique({ where: { id: 'global' } });
  let payloadToProcess = { ...options.body };

  if (
    globalSetting &&
    globalSetting.enableSystemPrompt &&
    globalSetting.customSystemPrompt &&
    globalSetting.customSystemPrompt.trim().length > 0
  ) {
    if (Array.isArray(payloadToProcess.messages)) {
      const injectedSystemMsg = {
        role: 'system',
        content: globalSetting.customSystemPrompt.trim(),
      };
      payloadToProcess.messages = [injectedSystemMsg, ...payloadToProcess.messages];
    }
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  for (const key of candidateKeys) {
    const endpoint = getEndpointUrl(key.provider, key.baseUrl, '/chat/completions');

    // Clean up payload model if provider prefix was included
    const cleanedBody = { ...payloadToProcess };
    if (cleanedBody.model && cleanedBody.model.includes('/') && !key.baseUrl) {
      cleanedBody.model = cleanedBody.model.split('/').slice(1).join('/');
    }

    // Apply RTK Token Saver optimization
    const { optimizedBody } = optimizeRequestPayload(cleanedBody);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.apiKey}`,
    };

    // Anthropic-specific header handling if needed
    if (key.provider.toLowerCase() === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
      headers['x-api-key'] = key.apiKey;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(optimizedBody),
      });

      const latency = Date.now() - startTime;

      // Check if response is NOT OK (HTTP Status outside 2xx)
      if (!response.ok) {
        // 429 Rate Limit or 401/403 Auth Error -> Put key in COOLDOWN and rotate
        if (response.status === 429 || response.status === 401 || response.status === 403) {
          const cooldownMinutes = response.status === 429 ? 10 : 30;
          const cooldownUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000);

          await db.providerKey.update({
            where: { id: key.id },
            data: {
              status: 'COOLDOWN',
              cooldownUntil,
              errorCount: { increment: 1 },
            },
          });

          await db.requestLog.create({
            data: {
              provider: key.provider,
              model: requestedModel,
              keyId: key.id,
              keyName: key.name,
              statusHttp: response.status,
              success: false,
              retryCount,
              latencyMs: latency,
              errorMessage: `HTTP ${response.status}: Key bermasalah/rate-limit. Otomatis masuk cooldown ${cooldownMinutes}m.`,
            },
          });

          console.warn(`[KeyRotator] Key '${key.name}' (${key.provider}) hit HTTP ${response.status}. Rotating to next key...`);
          retryCount++;
          lastError = new Error(`HTTP ${response.status} on key ${key.name}`);
          continue;
        }

        // Server errors (500, 502, 503) -> Log & rotate to next key
        if (response.status >= 500) {
          await db.requestLog.create({
            data: {
              provider: key.provider,
              model: requestedModel,
              keyId: key.id,
              keyName: key.name,
              statusHttp: response.status,
              success: false,
              retryCount,
              latencyMs: latency,
              errorMessage: `HTTP ${response.status} Server Error dari Provider`,
            },
          });

          retryCount++;
          lastError = new Error(`HTTP ${response.status} server error on key ${key.name}`);
          continue;
        }

        // Client errors (HTTP 400 Bad Request, 404 Not Found, 422 Invalid Model, etc.) -> Log as FAILURE (success: false)
        await db.providerKey.update({
          where: { id: key.id },
          data: {
            errorCount: { increment: 1 },
          },
        });

        await db.requestLog.create({
          data: {
            provider: key.provider,
            model: requestedModel,
            keyId: key.id,
            keyName: key.name,
            statusHttp: response.status,
            success: false,
            retryCount,
            latencyMs: latency,
            errorMessage: `HTTP ${response.status}: Request ditolak oleh provider (Model/Parameter tidak valid).`,
          },
        });

        return {
          response,
          keyUsed: key,
          retryCount,
        };
      }

      // SUCCESS (HTTP 2xx)
      await db.providerKey.update({
        where: { id: key.id },
        data: {
          lastUsedAt: new Date(),
          successCount: { increment: 1 },
        },
      });

      await db.requestLog.create({
        data: {
          provider: key.provider,
          model: requestedModel,
          keyId: key.id,
          keyName: key.name,
          statusHttp: response.status,
          success: true,
          retryCount,
          latencyMs: latency,
        },
      });

      return {
        response,
        keyUsed: key,
        retryCount,
      };

    } catch (err: any) {
      console.error(`[KeyRotator] Network error on key '${key.name}':`, err.message);
      retryCount++;
      lastError = err;
    }
  }

  throw new Error(
    `Semua (${candidateKeys.length}) API Key yang dicoba gagal/rate-limited. Last error: ${lastError?.message}`
  );
}
