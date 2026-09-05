import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db, creatorMarkets } from "@social-capital/db";
import { sql, desc, eq, and } from "drizzle-orm";

const network = process.env.SOLANA_NETWORK as string;

export const marketRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/", async (request, reply) => {
    try {
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.isActive, true)),
        orderBy: [desc(creatorMarkets.createdAt)],
        limit: 50,
      });
      const pdas = markets.map(m => m.marketId);
      
      let holderCounts: Record<string, number> = {};
      let sparklines: Record<string, number[]> = {};
      
      if (pdas.length > 0) {
        const inClause = sql.join(pdas.map(p => sql`${p}`), sql`, `);
        
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



  fastify.get("/:marketId/analytics", async (request, reply) => {
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
};
