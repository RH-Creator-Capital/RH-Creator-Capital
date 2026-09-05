import { db } from "./src/index";
import { priceCandles } from "./src/schema";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`TRUNCATE TABLE price_candles;`);
  console.log("Truncated price_candles");
}
main().catch(console.error).finally(() => process.exit(0));
