import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const isInternalDashboard = req.headers.get('x-internal-dashboard') === 'true';

    // Multi-Client Access Key Validation (Skip for internal Dashboard UI)
    if (!isInternalDashboard) {
      const clientKeyCount = await db.clientKey.count();
      const masterEnvKey = process.env.MASTER_API_KEY;

      if (clientKeyCount > 0 || (masterEnvKey && masterEnvKey.trim().length > 0)) {
        const authHeader = req.headers.get('authorization') || '';
        const clientToken = authHeader.replace(/^Bearer\s+/i, '').trim() || req.headers.get('x-api-key') || '';
        
        let isValid = false;

        if (masterEnvKey && masterEnvKey.trim().length > 0 && clientToken === masterEnvKey.trim()) {
          isValid = true;
        } else if (clientToken) {
          const foundKey = await db.clientKey.findFirst({
            where: { token: clientToken, status: 'ACTIVE' },
          });

          if (foundKey) {
            isValid = true;
          }
        }

        if (!isValid) {
          return NextResponse.json(
            { error: { message: 'Client Access Key tidak valid. Akses ditolak.', type: 'authentication_error' } },
            { status: 401 }
          );
        }
      }
    }

    const activeKeys = await db.providerKey.findMany({
      where: { status: { not: 'DISABLED' } },
    });

    const modelsSet = new Map<string, { id: string; object: string; created: number; owned_by: string }>();

    for (const key of activeKeys) {
      const providerName = key.provider.toLowerCase();
      
      // Parse imported models if available
      if (key.models) {
        try {
          const importedList: string[] = JSON.parse(key.models);
          for (const modelId of importedList) {
            if (!modelsSet.has(modelId)) {
              modelsSet.set(modelId, {
                id: modelId,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: providerName,
              });
            }
          }
        } catch (e) {
          // Fallback ignore parse error
        }
      }

      // Also include standard default models if key has no models imported yet
      if (providerName === 'groq') {
        ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'].forEach((m) => {
          if (!modelsSet.has(m)) modelsSet.set(m, { id: m, object: 'model', created: Date.now(), owned_by: 'groq' });
        });
      } else if (providerName === 'deepseek') {
        ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'].forEach((m) => {
          if (!modelsSet.has(m)) modelsSet.set(m, { id: m, object: 'model', created: Date.now(), owned_by: 'deepseek' });
        });
      } else if (providerName === 'openai') {
        ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'].forEach((m) => {
          if (!modelsSet.has(m)) modelsSet.set(m, { id: m, object: 'model', created: Date.now(), owned_by: 'openai' });
        });
      } else if (providerName === 'gemini') {
        ['gemini-2.5-flash', 'gemini-1.5-pro'].forEach((m) => {
          if (!modelsSet.has(m)) modelsSet.set(m, { id: m, object: 'model', created: Date.now(), owned_by: 'google' });
        });
      } else if (providerName === 'mistral') {
        ['mistral-large-latest', 'codestral-latest', 'mistral-small-latest'].forEach((m) => {
          if (!modelsSet.has(m)) modelsSet.set(m, { id: m, object: 'model', created: Date.now(), owned_by: 'mistral' });
        });
      }
    }

    // Default fallback if no models were found
    if (modelsSet.size === 0) {
      modelsSet.set('gpt-4o-mini', { id: 'gpt-4o-mini', object: 'model', created: Date.now(), owned_by: 'system' });
      modelsSet.set('llama-3.3-70b-versatile', { id: 'llama-3.3-70b-versatile', object: 'model', created: Date.now(), owned_by: 'system' });
    }

    return NextResponse.json({
      object: 'list',
      data: Array.from(modelsSet.values()),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
