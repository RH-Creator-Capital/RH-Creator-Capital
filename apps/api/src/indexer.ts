import { createPublicClient, http, parseAbiItem, Log } from "viem";
import { db, creatorMarkets, userPositions, tradeHistory, priceCandles, protocolFees, feeWithdrawals } from "@creator-capital/db";
import { eq, and, sql } from "drizzle-orm";
import { rhCreatorCapitalAbi } from "./abis/rhCreatorCapital";
import { randomUUID } from "crypto";
import { realtimeEmitter } from "./services/emitter";

const rpcUrl = process.env.RH_CHAIN_RPC_URL as string;
const contractAddress = process.env.RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`;
const network = process.env.RH_NETWORK as string;

const customRobinhood = {
  id: 46630,
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
};

export const viemClient = createPublicClient({
  chain: customRobinhood,
  transport: http(rpcUrl),
});

export async function startIndexer() {
  console.log(`[Indexer] Starting indexer on network ${network} for contract ${contractAddress}`);

  // 1. CreatorMarketCreated
  viemClient.watchContractEvent({
    address: contractAddress,
    abi: rhCreatorCapitalAbi,
    eventName: "CreatorMarketCreated",
    onLogs: logs => logs.forEach(handleCreatorMarketCreated)
  });

  // 2. KeysBought
  viemClient.watchContractEvent({
    address: contractAddress,
    abi: rhCreatorCapitalAbi,
    eventName: "KeysBought",
    onLogs: logs => logs.forEach(handleKeysBought)
  });

  // 3. KeysSold
  viemClient.watchContractEvent({
    address: contractAddress,
    abi: rhCreatorCapitalAbi,
    eventName: "KeysSold",
    onLogs: logs => logs.forEach(handleKeysSold)
  });

  // 4. CreatorClaimed
  viemClient.watchContractEvent({
    address: contractAddress,
    abi: rhCreatorCapitalAbi,
    eventName: "CreatorClaimed",
    onLogs: logs => logs.forEach(handleCreatorClaimed)
  });

  // 5. CreatorRewardsClaimed
  viemClient.watchContractEvent({
    address: contractAddress,
    abi: rhCreatorCapitalAbi,
    eventName: "CreatorRewardsClaimed",
    onLogs: logs => logs.forEach(handleCreatorRewardsClaimed)
  });
}

// ================= Event Handlers =================

export async function handleCreatorMarketCreated(log: any) {
  try {
    const { marketId, xUserId, timestamp } = log.args;
    const txHash = log.transactionHash;

    console.log(`[Indexer] Market Created: ${marketId} for ${xUserId}`);

    const existing = await db.query.creatorMarkets.findFirst({
      where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.marketId, marketId))
    });

    if (!existing) {
      await db.insert(creatorMarkets).values({
        network,
        marketId,
        twitterHandle: xUserId, 
        creatorIdHex: xUserId, 
        creatorWallet: "0x0000000000000000000000000000000000000000",
        ticker: xUserId.substring(0, 5).toUpperCase(),
        supply: 0,
        reserveWei: "0",
        totalVolumeWei: "0",
        claimed: false,
        createTxHash: txHash,
        createdAt: new Date(Number(timestamp) * 1000)
      });
    }
  } catch (err) {
    console.error("[Indexer] Error handling CreatorMarketCreated:", err);
  }
}

function getSpotPriceWei(supply: number): string {
  const s = BigInt(supply);
  const a = 1n;
  const sum1 = s === 0n ? 0n : (s - 1n) * s * (2n * s - 1n) / 6n;
  const sum2 = s === 0n && a === 1n ? 0n : (s - 1n + a) * (s + a) * (2n * (s + a) - 1n) / 6n;
  const summation = sum2 - sum1;
  const ether = 1000000000000000000n;
  return ((summation * ether) / 16000n).toString();
}

async function updateCandles(marketId: string, supply: number, volumeWei: string, date: Date) {
  const priceWei = getSpotPriceWei(supply);
  const resolutions = [
    { name: "1m", ms: 60 * 1000 },
    { name: "5m", ms: 5 * 60 * 1000 },
    { name: "15m", ms: 15 * 60 * 1000 },
    { name: "1h", ms: 60 * 60 * 1000 },
    { name: "1d", ms: 24 * 60 * 60 * 1000 },
  ];

  for (const res of resolutions) {
    const periodStart = new Date(Math.floor(date.getTime() / res.ms) * res.ms);
    
    const existing = await db.query.priceCandles.findFirst({
      where: and(
        eq(priceCandles.network, network),
        eq(priceCandles.marketId, marketId),
        eq(priceCandles.resolution, res.name),
        eq(priceCandles.timestamp, periodStart)
      )
    });

    if (existing) {
      const high = BigInt(priceWei) > BigInt(existing.high) ? priceWei : existing.high;
      const low = BigInt(priceWei) < BigInt(existing.low) ? priceWei : existing.low;
      await db.update(priceCandles)
        .set({
          high,
          low,
          close: priceWei,
          volumeWei: (BigInt(existing.volumeWei) + BigInt(volumeWei)).toString()
        })
        .where(eq(priceCandles.id, existing.id));

      if (res.name === "1m") {
        realtimeEmitter.emit("candle_update", {
          marketId,
          resolution: res.name,
          timestamp: periodStart.toISOString(),
          open: existing.open,
          high,
          low,
          close: priceWei,
          volumeWei: (BigInt(existing.volumeWei) + BigInt(volumeWei)).toString()
        });
      }
    } else {
      await db.insert(priceCandles).values({
        network,
        marketId,
        timestamp: periodStart,
        resolution: res.name,
        open: priceWei,
        high: priceWei,
        low: priceWei,
        close: priceWei,
        volumeWei
      });
      if (res.name === "1m") {
        realtimeEmitter.emit("candle_update", {
          marketId,
          resolution: res.name,
          timestamp: periodStart.toISOString(),
          open: priceWei,
          high: priceWei,
          low: priceWei,
          close: priceWei,
          volumeWei
        });
      }
    }
  }
}

export async function handleKeysBought(log: any) {
  try {
    const { marketId, buyer, keyAmount, ethAmount, protocolFee, newSupply } = log.args;
    const txHash = log.transactionHash;
    console.log(`[Indexer] Keys Bought: ${marketId} by ${buyer}`);

    const positionId = `${marketId}-${buyer}`;
    const existingPos = await db.query.userPositions.findFirst({
      where: and(eq(userPositions.network, network), eq(userPositions.positionId, positionId))
    });

    if (existingPos) {
      await db.update(userPositions)
        .set({ 
          keyBalance: existingPos.keyBalance + Number(keyAmount),
          totalBoughtWei: (BigInt(existingPos.totalBoughtWei) + BigInt(ethAmount)).toString(),
          updatedAt: new Date()
        })
        .where(eq(userPositions.id, existingPos.id));
    } else {
      await db.insert(userPositions).values({
        network,
        walletAddress: buyer,
        marketId,
        positionId,
        keyBalance: Number(keyAmount),
        totalBoughtWei: ethAmount.toString(),
      });
    }

    await db.insert(tradeHistory).values({
      network,
      txHash,
      marketId,
      traderWallet: buyer,
      tradeType: "buy",
      amount: Number(keyAmount),
      ethAmountWei: ethAmount.toString(),
      feeWei: protocolFee.toString()
    }).onConflictDoNothing();

    realtimeEmitter.emit("trade", {
      marketId,
      txHash,
      traderWallet: buyer,
      tradeType: "buy",
      amount: Number(keyAmount),
      ethAmountWei: ethAmount.toString(),
      feeWei: protocolFee.toString(),
      timestamp: new Date().toISOString()
    });

    await db.execute(sql`
      UPDATE creator_markets 
      SET supply = ${Number(newSupply)}, 
          total_volume_wei = (CAST(total_volume_wei AS NUMERIC) + ${ethAmount.toString()}),
          reserve_wei = (CAST(reserve_wei AS NUMERIC) + ${ethAmount.toString()}),
          updated_at = NOW()
      WHERE market_id = ${marketId} AND network = ${network}
    `);

    await updateCandles(marketId, Number(newSupply), ethAmount.toString(), new Date());

    if (protocolFee > 0n) {
      await db.insert(protocolFees).values({
        network,
        txHash,
        amountWei: protocolFee.toString()
      }).onConflictDoNothing();
    }

  } catch (err) {
    console.error("[Indexer] Error handling KeysBought:", err);
  }
}

export async function handleKeysSold(log: any) {
  try {
    const { marketId, seller, keyAmount, ethReceived, protocolFee, newSupply } = log.args;
    const txHash = log.transactionHash;
    console.log(`[Indexer] Keys Sold: ${marketId} by ${seller}`);

    const positionId = `${marketId}-${seller}`;
    const existingPos = await db.query.userPositions.findFirst({
      where: and(eq(userPositions.network, network), eq(userPositions.positionId, positionId))
    });

    if (existingPos) {
      await db.update(userPositions)
        .set({ 
          keyBalance: existingPos.keyBalance - Number(keyAmount),
          totalSoldWei: (BigInt(existingPos.totalSoldWei) + BigInt(ethReceived)).toString(),
          updatedAt: new Date()
        })
        .where(eq(userPositions.id, existingPos.id));
    }

    await db.insert(tradeHistory).values({
      network,
      txHash,
      marketId,
      traderWallet: seller,
      tradeType: "sell",
      amount: Number(keyAmount),
      ethAmountWei: ethReceived.toString(),
      feeWei: protocolFee.toString()
    }).onConflictDoNothing();

    realtimeEmitter.emit("trade", {
      marketId,
      txHash,
      traderWallet: seller,
      tradeType: "sell",
      amount: Number(keyAmount),
      ethAmountWei: ethReceived.toString(),
      feeWei: protocolFee.toString(),
      timestamp: new Date().toISOString()
    });

    await db.execute(sql`
      UPDATE creator_markets 
      SET supply = ${Number(newSupply)}, 
          total_volume_wei = (CAST(total_volume_wei AS NUMERIC) + ${ethReceived.toString()}),
          reserve_wei = GREATEST(0, (CAST(reserve_wei AS NUMERIC) - ${ethReceived.toString()})),
          updated_at = NOW()
      WHERE market_id = ${marketId} AND network = ${network}
    `);

    await updateCandles(marketId, Number(newSupply), ethReceived.toString(), new Date());

    if (protocolFee > 0n) {
      await db.insert(protocolFees).values({
        network,
        txHash,
        amountWei: protocolFee.toString()
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error("[Indexer] Error handling KeysSold:", err);
  }
}

async function handleCreatorClaimed(log: any) {
  try {
    const { marketId, creatorWallet } = log.args;
    const txHash = log.transactionHash;
    console.log(`[Indexer] Creator Claimed: ${marketId} by ${creatorWallet}`);

    await db.update(creatorMarkets)
      .set({ 
        claimed: true,
        creatorWallet,
        claimTxHash: txHash,
        updatedAt: new Date()
      })
      .where(and(eq(creatorMarkets.marketId, marketId), eq(creatorMarkets.network, network)));

  } catch (err) {
    console.error("[Indexer] Error handling CreatorClaimed:", err);
  }
}

async function handleCreatorRewardsClaimed(log: any) {
  try {
    const { marketId, creator, amount } = log.args;
    const txHash = log.transactionHash;
    console.log(`[Indexer] Creator Rewards Claimed: ${amount} by ${creator}`);

    await db.insert(feeWithdrawals).values({
      network,
      txHash,
      marketId,
      creatorWallet: creator,
      amountWei: amount.toString()
    }).onConflictDoNothing();

  } catch (err) {
    console.error("[Indexer] Error handling CreatorRewardsClaimed:", err);
  }
}

export async function syncPastEvents(fromBlock: bigint) {
  console.log(`[Indexer] Syncing past events from block ${fromBlock}...`);
  try {
    const toBlock = "latest";
    
    // 1. CreatorMarketCreated
    const marketCreatedLogs = await viemClient.getContractEvents({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      eventName: "CreatorMarketCreated",
      fromBlock,
      toBlock
    });
    for (const log of marketCreatedLogs) {
      await handleCreatorMarketCreated(log);
    }

    // 2. KeysBought
    const keysBoughtLogs = await viemClient.getContractEvents({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      eventName: "KeysBought",
      fromBlock,
      toBlock
    });
    for (const log of keysBoughtLogs) {
      await handleKeysBought(log);
    }

    // 3. KeysSold
    const keysSoldLogs = await viemClient.getContractEvents({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      eventName: "KeysSold",
      fromBlock,
      toBlock
    });
    for (const log of keysSoldLogs) {
      await handleKeysSold(log);
    }

    // 4. CreatorClaimed
    const claimedLogs = await viemClient.getContractEvents({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      eventName: "CreatorClaimed",
      fromBlock,
      toBlock
    });
    for (const log of claimedLogs) {
      await handleCreatorClaimed(log);
    }

    // 5. CreatorRewardsClaimed
    const rewardsLogs = await viemClient.getContractEvents({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      eventName: "CreatorRewardsClaimed",
      fromBlock,
      toBlock
    });
    for (const log of rewardsLogs) {
      await handleCreatorRewardsClaimed(log);
    }

    console.log("[Indexer] Past events sync complete.");
  } catch (err) {
    console.error("[Indexer] Error syncing past events:", err);
  }
}
