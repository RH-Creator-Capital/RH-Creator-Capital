import Fastify from "fastify";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { db, activityLogs } from "@creator-capital/db";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCors from "@fastify/cors";
// Indexer logic removed (now using Ponder)
import { authRoutes } from "./routes/auth";
import { marketRoutes } from "./routes/markets";
import { oauthRoutes } from "./routes/oauth";
import { portfolioRoutes } from "./routes/portfolio";
import { protocolRoutes } from "./routes/protocol";
import { websocketRoutes } from "./routes/websocket";
import { usersRoutes } from "./routes/users";
import { startIndexer } from "./indexer";
import { startTradingBot } from "./services/bot";

dotenv.config({ path: resolve(__dirname, "../../../.env") });

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCors, {
  origin: "*", // Adjust for production
});

fastify.register(fastifyRateLimit, {
  max: 100, // default limit 100 requests per windowMs
  timeWindow: '1 minute'
});

fastify.register(fastifyWebsocket);

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(oauthRoutes, { prefix: "/api/oauth" });
fastify.register(marketRoutes, { prefix: "/api/markets" });
fastify.register(portfolioRoutes, { prefix: "/api/portfolio" });
fastify.register(protocolRoutes, { prefix: "/api/protocol" });
fastify.register(usersRoutes, { prefix: "/api/users" });
fastify.register(websocketRoutes, { prefix: "/ws" });

// Webhooks for EVM (if any) can be added here, but Ponder handles most indexing directly to DB.

const start = async () => {
  try {
    if (!process.env.PORT) throw new Error("PORT is required");
    const port = parseInt(process.env.PORT);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${port}`);

    // Start blockchain indexer background service
    startIndexer().catch(err => {
      fastify.log.error("Indexer failed to start:", err);
    });

    // Start trading bot (if ENABLE_TRADING_BOT=true)
    startTradingBot();

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
