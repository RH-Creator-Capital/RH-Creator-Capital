import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(__dirname, "../../../.env") });
import { db } from "@creator-capital/db";

async function run() {
  const markets = await db.query.creatorMarkets.findMany();
  console.log("Markets in DB:", markets);
  process.exit(0);
}

run();
