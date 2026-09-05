import { sql } from 'drizzle-orm';
import { db } from './src/index';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE creator_markets ADD COLUMN IF NOT EXISTS category text DEFAULT 'Regular User'`);
    console.log("Added category column");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
