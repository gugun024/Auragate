import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let setting = await db.systemSetting.findUnique({
      where: { id: 'global' },
    });

    if (!setting) {
      setting = await db.systemSetting.create({
        data: {
          id: 'global',
          customSystemPrompt: '',
          enableSystemPrompt: false,
        },
      });
    }

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customSystemPrompt, enableSystemPrompt } = body;

    const updated = await db.systemSetting.upsert({
      where: { id: 'global' },
      update: {
        customSystemPrompt: customSystemPrompt ?? '',
        enableSystemPrompt: Boolean(enableSystemPrompt),
      },
      create: {
        id: 'global',
        customSystemPrompt: customSystemPrompt ?? '',
        enableSystemPrompt: Boolean(enableSystemPrompt),
      },
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
