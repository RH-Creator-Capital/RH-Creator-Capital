import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '../../.env' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql`ALTER TABLE creator_markets ADD COLUMN twitter_name TEXT;`;
    console.log('Added twitter_name to creator_markets');
  } catch (e) {
    console.log(e.message);
  }
  try {
    await sql`ALTER TABLE users ADD COLUMN twitter_name TEXT;`;
    console.log('Added twitter_name to users');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}
run();
