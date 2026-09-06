import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db, protocolFees, pscBuybacks, pscBurns, activityLogs } from "@creator-capital/db";
import { sum, desc, eq, and, sql } from "drizzle-orm";
export const protocolRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const network = process.env.RH_NETWORK || "devnet";
  fastify.get("/stats", async (request, reply) => {
    try {
      // Aggregate Protocol Fees
      const feeResult = await db.select({
        totalFees: sql`sum(cast(${protocolFees.amountWei} as numeric))`
      }).from(protocolFees).where(eq(protocolFees.network, network));

      // Aggregate Buybacks
      const buybackResult = await db.select({
        totalSolSpent: sum(pscBuybacks.solSpent),
        totalPscReceived: sum(pscBuybacks.pscReceived)
      }).from(pscBuybacks).where(eq(pscBuybacks.network, network));

      // Aggregate Burns
      const burnResult = await db.select({
        totalPscBurned: sum(pscBurns.amount)
      }).from(pscBurns).where(eq(pscBurns.network, network));

      return reply.send({
        success: true,
        stats: {
          totalProtocolFeesWei: feeResult[0]?.totalFees || 0,
          totalBuybackEthSpentWei: buybackResult[0]?.totalSolSpent || 0,
          totalPscBought: buybackResult[0]?.totalPscReceived || 0,
          totalPscBurned: burnResult[0]?.totalPscBurned || 0,
        }
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch protocol stats" });
    }
  });

  fastify.get("/logs", async (request, reply) => {
    try {
      // Get last 50 fee collections
      const recentFees = await db.query.protocolFees.findMany({
        where: eq(protocolFees.network, network),
        orderBy: [desc(protocolFees.timestamp)],
        limit: 50
      });

      // Get last 50 keeper logs
      const keeperLogs = await db.query.activityLogs.findMany({
        where: and(eq(activityLogs.network, network), eq(activityLogs.action, "KEEPER_EXECUTION")),
        orderBy: [desc(activityLogs.createdAt)],
        limit: 50
      });

      return reply.send({
        success: true,
        recentFees,
        keeperLogs
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to fetch protocol logs" });
    }
  });
};
