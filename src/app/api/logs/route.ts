import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const logs = await db.requestLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalRequests = await db.requestLog.count();
    const successfulRequests = await db.requestLog.count({
      where: { success: true },
    });

    const successRate = totalRequests > 0
      ? `${Math.round((successfulRequests / totalRequests) * 100)}%`
      : '100%';

    const activeKeysCount = await db.providerKey.count({
      where: { status: 'ACTIVE' },
    });

    const cooldownKeysCount = await db.providerKey.count({
      where: { status: 'COOLDOWN' },
    });

    const totalKeysCount = await db.providerKey.count({
      where: { status: { not: 'DISABLED' } },
    });

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        totalRequests,
        successfulRequests,
        successRate,
        activeKeysCount,
        cooldownKeysCount,
        totalKeysCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.requestLog.deleteMany({});
    return NextResponse.json({
      success: true,
      message: 'Semua riwayat transaksi log berhasil dihapus.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
