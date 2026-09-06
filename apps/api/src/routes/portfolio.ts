import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db, userPositions, creatorMarkets, tradeHistory } from "@creator-capital/db";
import { eq, inArray, and } from "drizzle-orm";
const K_CONSTANT = 100_000n; // 0.0001 ETH in ethAmountWei

export const portfolioRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const network = process.env.RH_NETWORK as string;
  fastify.get("/:wallet", async (request, reply) => {
    const { wallet } = request.params as { wallet: string };
    
    if (!wallet) {
      return reply.status(400).send({ success: false, error: "Wallet address is required" });
    }

    try {
      const positions = await db.query.userPositions.findMany({
        where: and(eq(userPositions.network, network), eq(userPositions.walletAddress, wallet)),
      });

      if (positions.length === 0) {
        return reply.send({ success: true, portfolio: [] });
      }

      const marketIds = positions.map(p => p.marketId);
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), inArray(creatorMarkets.marketId, marketIds))
      });

      const marketMap = new Map();
      markets.forEach(m => marketMap.set(m.marketId, m));

      const portfolio = positions.map(pos => {
        const market = marketMap.get(pos.marketId);
        const supply = BigInt(market ? market.supply : 0);
        
        // Spot Price = K_CONSTANT * supply^2
        const spotPrice = K_CONSTANT * (supply ** 2n);
        
        // Auto-correct negative keyBalance in DB (self-heal corrupted data)
        const clampedKeyBalance = Math.max(0, pos.keyBalance);
        if (pos.keyBalance < 0) {
          db.update(userPositions)
            .set({ keyBalance: 0, updatedAt: new Date() })
            .where(eq(userPositions.id, pos.id))
            .then(() => console.log(`[Portfolio] Auto-fixed negative keyBalance for position ${pos.positionId}`))
            .catch(() => {});
        }

        const keyBalance = BigInt(clampedKeyBalance);
        const totalBought = BigInt(pos.totalBoughtWei);
        const totalSold = BigInt(pos.totalSoldWei);
        
        const currentValue = keyBalance * spotPrice;
        const pnl = currentValue + totalSold - totalBought;

        return {
          ...pos,
          keyBalance: clampedKeyBalance,
          currentValueWei: currentValue.toString(),
          pnlWei: pnl.toString(),
          marketDetails: market
        };
      });
      
      const { feeWithdrawals } = await import("@creator-capital/db");
      const withdrawals = await db.query.feeWithdrawals.findMany({
        where: and(eq(feeWithdrawals.network, network), eq(feeWithdrawals.creatorWallet, wallet)),
      });
      const totalFeesWei = withdrawals.reduce((acc, w) => acc + BigInt(w.amountWei), BigInt(0));
      
      return reply.send({ 
        success: true, 
        portfolio, 
        totalFeesWei: totalFeesWei.toString() 
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch portfolio" });
    }
  });

  fastify.get("/:wallet/trades", async (request, reply) => {
    const { wallet } = request.params as { wallet: string };
    
    if (!wallet) {
      return reply.status(400).send({ success: false, error: "Wallet address is required" });
    }

    try {
      const trades = await db.query.tradeHistory.findMany({
        where: and(eq(tradeHistory.network, network), eq(tradeHistory.traderWallet, wallet)),
        orderBy: (tradeHistory, { desc }) => [desc(tradeHistory.timestamp)],
      });
      
      if (trades.length === 0) {
        return reply.send({ success: true, trades: [] });
      }

      const marketIds = [...new Set(trades.map(t => t.marketId))];
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), inArray(creatorMarkets.marketId, marketIds))
      });
      
      const marketMap = new Map();
      markets.forEach(m => marketMap.set(m.marketId, m));
      
      const tradesWithMarket = trades.map(t => ({
        ...t,
        marketDetails: marketMap.get(t.marketId) || null
      }));

      return reply.send({ success: true, trades: tradesWithMarket });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch user trades" });
    }
  });

  fastify.get("/:wallet/withdrawals", async (request, reply) => {
    const { wallet } = request.params as { wallet: string };
    
    if (!wallet) {
      return reply.status(400).send({ success: false, error: "Wallet address is required" });
    }

    try {
      const { feeWithdrawals } = await import("@creator-capital/db");
      
      const withdrawals = await db.query.feeWithdrawals.findMany({
        where: and(eq(feeWithdrawals.network, network), eq(feeWithdrawals.creatorWallet, wallet)),
        orderBy: (feeWithdrawals, { desc }) => [desc(feeWithdrawals.timestamp)],
      });
      
      if (withdrawals.length === 0) {
        return reply.send({ success: true, withdrawals: [] });
      }

      const marketIds = [...new Set(withdrawals.map(w => w.marketId))];
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), inArray(creatorMarkets.marketId, marketIds))
      });
      
      const marketMap = new Map();
      markets.forEach(m => marketMap.set(m.marketId, m));
      
      const withdrawalsWithMarket = withdrawals.map(w => ({
        ...w,
        marketDetails: marketMap.get(w.marketId) || null
      }));

      return reply.send({ success: true, withdrawals: withdrawalsWithMarket });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch user withdrawals" });
    }
  });
};
