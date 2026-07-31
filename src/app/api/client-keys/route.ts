import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// GET /api/client-keys - List all client gateway tokens
export async function GET() {
  try {
    const clientKeys = await db.clientKey.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, clientKeys });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/client-keys - Generate a new Client Gateway Access Token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    const label = name ? name.trim() : 'OpenCode / Editor Access Key';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const token = `ar-sk-${randomHex}`; // Format: ar-sk-1234567890abcdef1234567890abcdef

    const created = await db.clientKey.create({
      data: {
        name: label,
        token,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, clientKey: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/client-keys - Toggle status (ACTIVE/DISABLED)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Client Key ID wajib diisi' }, { status: 400 });
    }

    const updated = await db.clientKey.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, clientKey: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/client-keys - Delete client key
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Client Key ID wajib diisi' }, { status: 400 });
    }

    await db.clientKey.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Client Key berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
