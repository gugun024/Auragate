import { db } from './db';
import crypto from 'crypto';

async function main() {
  try {
    const token = `ar-sk-${crypto.randomBytes(16).toString('hex')}`;
    console.log('Testing db.clientKey.create with token:', token);
    const created = await db.clientKey.create({
      data: {
        name: 'Test OpenCode Key',
        token,
        status: 'ACTIVE',
      },
    });
    console.log('Successfully created ClientKey:', created);
  } catch (err: any) {
    console.error('Error creating ClientKey:', err);
  }
}

main().finally(async () => {
  await db.$disconnect();
});
