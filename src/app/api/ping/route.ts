import { NextResponse } from 'next/server';

const PROVIDER_PING_TARGETS: Record<string, string> = {
  Groq: 'https://api.groq.com/openai/v1/models',
  Mistral: 'https://api.mistral.ai/v1/models',
  OpenAI: 'https://api.openai.com/v1/models',
  DeepSeek: 'https://api.deepseek.com/v1/models',
  Gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
  OpenRouter: 'https://openrouter.ai/api/v1/models',
};

export async function GET() {
  try {
    const pingResults = await Promise.all(
      Object.entries(PROVIDER_PING_TARGETS).map(async ([name, url]) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const latencyMs = Date.now() - start;
          const reachable = res.status < 500;

          return {
            provider: name,
            url,
            latencyMs,
            status: res.status,
            reachable,
          };
        } catch (e: any) {
          return {
            provider: name,
            url,
            latencyMs: Date.now() - start,
            status: 0,
            reachable: false,
          };
        }
      })
    );

    return NextResponse.json({ success: true, pingResults });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
