import { FastifyInstance } from "fastify";
import { db, creatorMarkets, feeWithdrawals, users } from "@creator-capital/db";
import { desc, eq, and, or, sql } from "drizzle-orm";

export const usersRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/:address/markets", async (request, reply) => {
    try {
      const { address } = request.params as { address: string };
      const network = (request.query as any).network || "devnet";

      if (!address) {
        return reply.status(400).send({ success: false, error: "Address is required" });
      }

      // Fetch user profile from the users table
      const userProfile = await db.query.users.findFirst({
        where: eq(users.walletAddress, address),
      });

      // Fetch all markets created/owned by this wallet
      const markets = await db.query.creatorMarkets.findMany({
        where: and(
          eq(creatorMarkets.network, network),
          or(
            eq(creatorMarkets.creatorWallet, address),
            eq(creatorMarkets.createdBy, address)
          )
        ),
        orderBy: [desc(creatorMarkets.createdAt)],
      });

      // Fetch total withdrawn fees for this user
      const totalFeesResult = await db
        .select({ total: sql`sum(cast(${feeWithdrawals.amountWei} as numeric))` })
        .from(feeWithdrawals)
        .where(
          and(
            eq(feeWithdrawals.network, network),
            eq(feeWithdrawals.creatorWallet, address)
          )
        );
        
      const totalFeesWei = totalFeesResult[0]?.total ? Number(totalFeesResult[0].total) : 0;
      
      // Fetch recent withdrawal history
      const withdrawals = await db.query.feeWithdrawals.findMany({
        where: and(
          eq(feeWithdrawals.network, network),
          eq(feeWithdrawals.creatorWallet, address)
        ),
        orderBy: [desc(feeWithdrawals.timestamp)],
        limit: 10,
      });

      return reply.send({
        success: true,
        userProfile,
        markets,
        stats: {
          totalFeesWithdrawn: totalFeesWei / 1e18 // Convert to ETH
        },
        withdrawals
      });
    } catch (e: any) {
      console.error("Error fetching user markets:", e);
      return reply.status(500).send({ success: false, error: e.message || "Failed to fetch user markets" });
    }
  });

  fastify.put("/:address/me", async (request, reply) => {
    const { address } = request.params as { address: string };
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ success: false, error: "Missing authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return reply.status(500).send({ success: false, error: "JWT_SECRET is not configured" });
    }

    let decoded: any;
    try {
      const jwt = await import("jsonwebtoken");
      decoded = jwt.default.verify(token, jwtSecret);
    } catch (e) {
      return reply.status(401).send({ success: false, error: "Invalid token" });
    }

    const wallet = decoded.wallet;
    if (wallet !== address) {
      return reply.status(403).send({ success: false, error: "Wallet mismatch. Please disconnect and re-authenticate your wallet." });
    }
    
    const { username, avatarUrl, bio } = request.body as { username?: string, avatarUrl?: string, bio?: string };

    try {
      // Validate inputs
      const updateData: any = {};
      
      if (username !== undefined) {
        if (username.length > 50) return reply.status(400).send({ success: false, error: "Username too long" });
        updateData.username = username;
      }
      
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
      }
      
      if (bio !== undefined) {
        if (bio.length > 160) return reply.status(400).send({ success: false, error: "Bio must be 160 characters or less" });
        updateData.bio = bio;
      }
      
      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ success: false, error: "No update data provided" });
      }

      await db.update(users)
        .set(updateData)
        .where(eq(users.walletAddress, wallet));

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, wallet)
      });

      return reply.send({ success: true, userProfile: updatedUser });
    } catch (e: any) {
      console.error("Error updating user profile:", e);
      return reply.status(500).send({ success: false, error: e.message || "Failed to update profile" });
    }
  });
}
