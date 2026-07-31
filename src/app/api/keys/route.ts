import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detectProviderFromKey, fetchModelsForProvider } from '@/lib/providerDetector';

// GET /api/keys - Retrieve all API keys
export async function GET() {
  try {
    const keys = await db.providerKey.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const parsedKeys = keys.map((k) => ({
      ...k,
      modelsList: k.models ? JSON.parse(k.models) : [],
    }));

    return NextResponse.json({ success: true, keys: parsedKeys });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/keys - Add key(s) with Deduplication & Live Key Validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, name, apiKey, rawKeys, priority, baseUrl, autoImportModels = true } = body;

    // Bulk insertion handling
    if (rawKeys && typeof rawKeys === 'string') {
      const lines = rawKeys
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const createdList = [];
      const skippedList = [];
      const invalidList = [];
      let idx = 1;

      for (const line of lines) {
        let keyProvider = (provider || 'auto').toLowerCase();
        let keyLabel = name ? `${name} #${idx}` : undefined;
        let keyVal = line;

        // Support formats: "nama|apikey" OR "provider|nama|apikey"
        if (line.includes('|')) {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 3) {
            keyProvider = parts[0].toLowerCase();
            keyLabel = parts[1];
            keyVal = parts[2];
          } else if (parts.length === 2) {
            keyLabel = parts[0];
            keyVal = parts[1];
          }
        } else if (line.includes(':') && !line.startsWith('sk-') && !line.startsWith('gsk_')) {
          const parts = line.split(':');
          keyProvider = parts[0].trim().toLowerCase();
          keyVal = parts.slice(1).join(':').trim();
        }

        if (!keyVal) continue;

        // 1. DEDUPLICATION CHECK: Skip if key already exists in DB
        const existing = await db.providerKey.findFirst({
          where: { apiKey: keyVal.trim() },
        });

        if (existing) {
          skippedList.push({ name: existing.name, key: keyVal });
          continue; // Skip duplicate key!
        }

        const finalProvider = detectProviderFromKey(keyVal, keyProvider);

        // 2. LIVE KEY VALIDATION & MODEL IMPORT
        let importedModels: string[] = [];
        if (autoImportModels) {
          importedModels = await fetchModelsForProvider(finalProvider, keyVal, baseUrl);
        }

        const newKey = await db.providerKey.create({
          data: {
            name: keyLabel || `${finalProvider.toUpperCase()} Key #${idx}`,
            provider: finalProvider,
            apiKey: keyVal.trim(),
            baseUrl: baseUrl || null,
            models: importedModels.length > 0 ? JSON.stringify(importedModels) : null,
            priority: priority ? Number(priority) : 1,
            status: 'ACTIVE',
          },
        });

        createdList.push({ ...newKey, modelsList: importedModels });
        idx++;
      }

      return NextResponse.json({
        success: true,
        summary: {
          addedCount: createdList.length,
          skippedCount: skippedList.length,
          invalidCount: invalidList.length,
        },
        keys: createdList,
        skipped: skippedList,
      });
    }

    // Single key insertion
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key wajib diisi' }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();

    // Deduplication check for single key
    const existing = await db.providerKey.findFirst({
      where: { apiKey: trimmedKey },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `API Key '${existing.name}' sudah ada di dalam database (Duplikat).` },
        { status: 400 }
      );
    }

    const finalProvider = detectProviderFromKey(trimmedKey, provider);

    let importedModels: string[] = [];
    if (autoImportModels) {
      importedModels = await fetchModelsForProvider(finalProvider, trimmedKey, baseUrl);
    }

    const created = await db.providerKey.create({
      data: {
        name: name || `${finalProvider.toUpperCase()} Key`,
        provider: finalProvider,
        apiKey: trimmedKey,
        baseUrl: baseUrl || null,
        models: importedModels.length > 0 ? JSON.stringify(importedModels) : null,
        priority: priority ? Number(priority) : 1,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, key: { ...created, modelsList: importedModels } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/keys - Update key (toggle status, reset cooldown, update priority, refresh models)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, priority, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Key ID wajib diisi' }, { status: 400 });
    }

    if (action === 'reset_cooldown') {
      const updated = await db.providerKey.update({
        where: { id },
        data: { status: 'ACTIVE', cooldownUntil: null, errorCount: 0 },
      });
      return NextResponse.json({ success: true, key: updated });
    }

    if (action === 'refresh_models') {
      const keyObj = await db.providerKey.findUnique({ where: { id } });
      if (!keyObj) {
        return NextResponse.json({ success: false, error: 'Key tidak ditemukan' }, { status: 404 });
      }

      const fetchedModels = await fetchModelsForProvider(keyObj.provider, keyObj.apiKey, keyObj.baseUrl);

      const updated = await db.providerKey.update({
        where: { id },
        data: {
          models: fetchedModels.length > 0 ? JSON.stringify(fetchedModels) : null,
        },
      });

      return NextResponse.json({
        success: true,
        modelsCount: fetchedModels.length,
        modelsList: fetchedModels,
        key: updated,
      });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority !== undefined) updateData.priority = Number(priority);

    const updated = await db.providerKey.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/keys - Delete key
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id === 'all') {
      await db.providerKey.deleteMany();
      return NextResponse.json({ success: true, message: 'Semua API Key berhasil dihapus' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Key ID wajib diisi' }, { status: 400 });
    }

    await db.providerKey.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Key berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
