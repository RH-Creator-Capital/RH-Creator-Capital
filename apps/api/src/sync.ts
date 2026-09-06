import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(__dirname, "../../../.env") });
import { viemClient } from "./indexer";
import { rhCreatorCapitalAbi } from "./abis/rhCreatorCapital";

async function run() {
  const contractAddress = process.env.RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`;
  
  // Try to find the market created event in the last 10000 blocks with chunking
  const latestBlock = await viemClient.getBlockNumber();
  console.log("Searching backwards from", latestBlock);
  let found = false;
  for (let i = 0n; i < 10000n; i += 9n) {
    const toBlock = latestBlock - i;
    const fromBlock = toBlock - 9n;
    try {
      const logs = await viemClient.getContractEvents({
        address: contractAddress,
        abi: rhCreatorCapitalAbi,
        eventName: "CreatorMarketCreated",
        fromBlock,
        toBlock
      });
      if (logs.length > 0) {
        console.log("Found market creations at block:", fromBlock, logs.map(l => l.args));
        const { handleCreatorMarketCreated } = require('./indexer');
        for (const log of logs) {
          await handleCreatorMarketCreated(log);
          console.log("Synced market.");
        }
        found = true;
        break;
      }
    } catch (e) {}
  }
  if (!found) {
    console.log("No market creation events found in the last 10000 blocks.");
  }
  process.exit(0);
}

run();
