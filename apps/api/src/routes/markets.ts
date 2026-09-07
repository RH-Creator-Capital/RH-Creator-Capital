import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db, creatorMarkets, callouts } from "@creator-capital/db";
import { sql, desc, eq, and } from "drizzle-orm";

export const marketRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const network = process.env.RH_NETWORK as string;
  fastify.get("/", async (request, reply) => {
    try {
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.isActive, true)),
        orderBy: [desc(creatorMarkets.createdAt)],
        limit: 50,
      });

      // Force vladtenev to always be at the top
      const vladIndex = markets.findIndex(m => m.twitterHandle?.toLowerCase() === 'vladtenev');
      if (vladIndex > 0) {
        const vladMarket = markets.splice(vladIndex, 1)[0];
        markets.unshift(vladMarket);
      }

      const marketIds = markets.map(m => m.marketId);
      
      let holderCounts: Record<string, number> = {};
      let sparklines: Record<string, number[]> = {};
      
      if (marketIds.length > 0) {
        const inClause = sql.join(marketIds.map(p => sql`${p}`), sql`, `);
        
        // Fetch holder counts
        const counts = await db.execute(sql`
          SELECT market_id, COUNT(DISTINCT wallet_address) as count
          FROM user_positions
          WHERE market_id IN (${inClause}) AND network = ${network} AND key_balance > 0
          GROUP BY market_id
        `);
        for (const row of counts) {
          holderCounts[row.market_id as string] = Number(row.count);
        }

        // Fetch sparklines (last 20 candles of 1h resolution per market)
        const recentCandles = await db.execute(sql`
          SELECT market_id, close, timestamp
          FROM (
            SELECT market_id, close, timestamp,
                   ROW_NUMBER() OVER (PARTITION BY market_id ORDER BY timestamp DESC) as rn
            FROM price_candles
            WHERE market_id IN (${inClause}) AND network = ${network} AND resolution = '1h'
          ) sub
          WHERE rn <= 20
          ORDER BY timestamp ASC
        `);
        for (const row of recentCandles) {
          const marketId = row.market_id as string;
          if (!sparklines[marketId]) sparklines[marketId] = [];
          sparklines[marketId].push(Number(row.close) / 1e9);
        }
      }

      const marketsWithHolders = markets.map(m => ({
        ...m,
        holderCount: holderCounts[m.marketId] || 0,
        sparkline: sparklines[m.marketId] || []
      }));

      return reply.send({ success: true, markets: marketsWithHolders });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch markets" });
    }
  });

  fastify.get("/trending", async (request, reply) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await db.execute(sql`
        SELECT 
          t.market_id AS "marketId",
          SUM(t.ethAmountWei) AS volume_wei,
          COUNT(DISTINCT t.trader_wallet) AS unique_traders
        FROM trade_history t
        JOIN creator_markets m ON t.market_id = m.market_id
        WHERE t.timestamp >= ${oneDayAgo} AND m.is_active = true AND t.network = ${network} AND m.network = ${network}
        GROUP BY t.market_id
        ORDER BY volume_wei DESC
        LIMIT 20
      `);
      
      return reply.send({ success: true, trending: result }); 
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch trending markets" });
    }
  });
  fastify.get("/:marketId/candles", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      const query = request.query as { resolution?: string };
      const resolution = query.resolution || "1m";
      
      const candles = await db.query.priceCandles.findMany({
        where: (priceCandles, { eq, and }) => and(
          eq(priceCandles.network, network),
          eq(priceCandles.marketId, marketId),
          eq(priceCandles.resolution, resolution)
        ),
        orderBy: (priceCandles, { desc }) => [desc(priceCandles.timestamp)],
        limit: 100, // Fetch the last 100 candles
      });
      
      // Sort in chronological order for charting (oldest first)
      const sortedCandles = candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      return reply.send({ success: true, candles: sortedCandles });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch candles" });
    }
  });

  fastify.get("/:marketId/trades", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      
      // Fetch all trades for the market
      const trades = await db.query.tradeHistory.findMany({
        where: (tradeHistory, { eq, and }) => and(eq(tradeHistory.network, network), eq(tradeHistory.marketId, marketId)),
        orderBy: (tradeHistory, { desc }) => [desc(tradeHistory.timestamp)],
      });
      
      return reply.send({ success: true, trades });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch trades" });
    }
  });

  fastify.get("/:marketId/withdrawals", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      
      const withdrawals = await db.query.feeWithdrawals.findMany({
        where: (feeWithdrawals, { eq, and }) => and(eq(feeWithdrawals.network, network), eq(feeWithdrawals.marketId, marketId)),
        orderBy: (feeWithdrawals, { desc }) => [desc(feeWithdrawals.timestamp)],
      });
      
      return reply.send({ success: true, withdrawals });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch withdrawals" });
    }
  });

  fastify.get("/:marketId/callouts", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      
      const marketCallouts = await db.query.callouts.findMany({
        where: (callouts, { eq, and }) => and(eq(callouts.network, network), eq(callouts.marketId, marketId)),
        orderBy: (callouts, { desc }) => [desc(callouts.timestamp)],
      });
      
      return reply.send({ success: true, callouts: marketCallouts });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch callouts" });
    }
  });

  fastify.post("/:marketId/callouts", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      const body = request.body as { walletAddress: string, message: string };
      
      if (!body.walletAddress || !body.message) {
        return reply.status(400).send({ success: false, error: "Missing required fields" });
      }

      await db.insert(callouts).values({
        network,
        marketId,
        walletAddress: body.walletAddress,
        message: body.message,
      });

      return reply.send({ success: true, message: "Callout posted successfully" });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to post callout" });
    }
  });  fastify.get("/:marketId/analytics", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      
      const market = await db.query.creatorMarkets.findFirst({
        where: (creatorMarkets, { eq, and }) => and(eq(creatorMarkets.network, network), eq(creatorMarkets.marketId, marketId)),
      });

      if (!market) {
        return reply.status(404).send({ success: false, error: "Market not found" });
      }

      const holderCountResult = await db.execute(sql`
        SELECT COUNT(DISTINCT wallet_address) as count
        FROM user_positions
        WHERE market_id = ${marketId} AND network = ${network} AND key_balance > 0
      `);
      
      const holderCount = Number(holderCountResult[0]?.count || 0);

      return reply.send({ 
        success: true, 
        analytics: {
          totalVolumeWei: market.totalVolumeWei,
          holderCount
        }
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch analytics" });
    }
  });

  fastify.put("/:marketId/metadata", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      
      const body = request.body as { ticker?: string, websiteUrl?: string, telegramUrl?: string, description?: string, bannerUrl?: string, twitterName?: string, avatarUrl?: string, category?: string } | undefined;

      const updated = await db.update(creatorMarkets)
        .set({
          ...(body?.ticker !== undefined ? { ticker: body.ticker } : {}),
          ...(body?.websiteUrl !== undefined ? { websiteUrl: body.websiteUrl } : {}),
          ...(body?.telegramUrl !== undefined ? { telegramUrl: body.telegramUrl } : {}),
          ...(body?.description !== undefined ? { description: body.description } : {}),
          ...(body?.bannerUrl !== undefined ? { bannerUrl: body.bannerUrl } : {}),
          ...(body?.twitterName !== undefined ? { twitterName: body.twitterName } : {}),
          ...(body?.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
          ...(body?.category !== undefined ? { category: body.category } : {}),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(creatorMarkets.network, network),
            eq(creatorMarkets.marketId, marketId)
          )
        )
        .returning();

      if (!updated.length) {
        return reply.status(404).send({ success: false, error: "Market not found in database." });
      }

      return reply.send({ success: true, message: "Market metadata updated.", market: updated[0] });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to update market metadata." });
    }
  });

  fastify.get("/check/:handle", async (request, reply) => {
    try {
      const { handle } = request.params as { handle: string };
      const market = await db.query.creatorMarkets.findFirst({
        where: (creatorMarkets, { sql, eq, and }) => and(eq(creatorMarkets.network, network), sql`lower(${creatorMarkets.twitterHandle}) = lower(${handle})`)
      });
      return reply.send({ exists: !!market });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to check handle" });
    }
  });
  fastify.post("/:marketId/sync", async (request, reply) => {
    try {
      const { marketId } = request.params as { marketId: string };
      const body = request.body as any;
      
      let market = await db.query.creatorMarkets.findFirst({
        where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.marketId, marketId))
      });

      if (!market) {
        if (body && body.twitterHandle && body.createdBy) {
          await db.insert(creatorMarkets).values({
            network,
            marketId,
            creatorIdHex: marketId,
            twitterHandle: body.twitterHandle,
            creatorWallet: body.createdBy,
            createdBy: body.createdBy,
            ticker: body.ticker || "",
            description: body.description,
            websiteUrl: body.websiteUrl,
            telegramUrl: body.telegramUrl,
            bannerUrl: body.bannerUrl,
            twitterName: body.twitterName,
            avatarUrl: body.avatarUrl,
            category: body.category || "Regular User",
            createTxHash: body.createTxSignature,
            isActive: true,
          });
          market = await db.query.creatorMarkets.findFirst({
            where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.marketId, marketId))
          });
        } else {
          return reply.status(404).send({ success: false, error: "Market not found and missing initial data" });
        }
      } else if (body && Object.keys(body).length > 0) {
         await db.update(creatorMarkets)
          .set({
            ...(body.ticker !== undefined ? { ticker: body.ticker } : {}),
            ...(body.websiteUrl !== undefined ? { websiteUrl: body.websiteUrl } : {}),
            ...(body.telegramUrl !== undefined ? { telegramUrl: body.telegramUrl } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.bannerUrl !== undefined ? { bannerUrl: body.bannerUrl } : {}),
            ...(body.twitterName !== undefined ? { twitterName: body.twitterName } : {}),
            ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
            ...(body.category !== undefined ? { category: body.category } : {}),
            ...(body.createdBy !== undefined ? { createdBy: body.createdBy } : {}),
            ...(body.createTxSignature !== undefined ? { createTxHash: body.createTxSignature } : {}),
            ...(body.claimTxSignature !== undefined ? { claimTxHash: body.claimTxSignature, claimed: true } : {}),
            ...(body.creatorWallet !== undefined ? { creatorWallet: body.creatorWallet } : {}),
            updatedAt: new Date()
          })
          .where(
            and(
              eq(creatorMarkets.network, network),
              eq(creatorMarkets.marketId, marketId)
            )
          );
      }

      return reply.send({ success: true, message: "Market synced." });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to sync market." });
    }
  });
};
