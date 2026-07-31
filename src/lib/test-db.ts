import { db } from './db';

async function main() {
  console.log("Testing SQLite Database connection...");
  const keysCount = await db.providerKey.count();
  console.log(`Current keys in DB: ${keysCount}`);
}

main()
  .catch((e) => {
    console.error("Database connection test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
