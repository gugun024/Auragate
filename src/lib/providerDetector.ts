import { DEFAULT_PROVIDER_URLS } from './routerEngine';

/**
 * Automatically detects the provider name based on the API Key string format
 */
export function detectProviderFromKey(apiKey: string, selectedProvider?: string): string {
  const key = apiKey.trim();

  if (selectedProvider && selectedProvider !== 'auto' && selectedProvider !== 'custom') {
    return selectedProvider.toLowerCase();
  }

  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-or-v1-') || key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('AIzaSy')) return 'gemini';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  
  // Mistral API keys typically do not start with sk- and are 32 chars long
  if (key.length === 32 && !key.startsWith('sk-')) return 'mistral';

  return selectedProvider && selectedProvider !== 'auto' ? selectedProvider.toLowerCase() : 'openai';
}

/**
 * Fetches available models live from provider's /models API endpoint
 */
export async function fetchModelsForProvider(
  provider: string,
  apiKey: string,
  customBaseUrl?: string | null
): Promise<string[]> {
  try {
    let baseUrl = customBaseUrl || DEFAULT_PROVIDER_URLS[provider.toLowerCase()] || 'https://api.openai.com/v1';
    baseUrl = baseUrl.replace(/\/+$/, '');
    const modelsEndpoint = `${baseUrl}/models`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (provider.toLowerCase() === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
      headers['x-api-key'] = apiKey;
    }

    const res = await fetch(modelsEndpoint, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000), // 8 seconds timeout
    });

    if (!res.ok) {
      console.warn(`[ModelFetch] Failed to fetch models from ${modelsEndpoint}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    let modelIds: string[] = [];

    if (Array.isArray(data?.data)) {
      modelIds = data.data.map((m: any) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data?.models)) {
      modelIds = data.models.map((m: any) => m.id || m.name).filter(Boolean);
    } else if (Array.isArray(data)) {
      modelIds = data.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
    }

    return modelIds;
  } catch (err: any) {
    console.warn(`[ModelFetch] Exception fetching models for ${provider}:`, err.message);
    return [];
  }
}
