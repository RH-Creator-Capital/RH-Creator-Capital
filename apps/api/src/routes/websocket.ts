import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { RawData } from "ws";
import { realtimeEmitter } from "../services/emitter";

export const websocketRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/", { websocket: true }, (connection, req) => {
    fastify.log.info("Client connected to WebSocket");
    
    // Store subscribed market PDAs
    const subscriptions = new Set<string>();

    const onTrade = (data: any) => {
      if (subscriptions.has(data.marketId)) {
        connection.socket.send(JSON.stringify({ type: "trade", data }));
      }
    };

    const onCandleUpdate = (data: any) => {
      if (subscriptions.has(data.marketId)) {
        connection.socket.send(JSON.stringify({ type: "candle_update", data }));
      }
    };

    // Subscribe to internal events
    realtimeEmitter.on("trade", onTrade);
    realtimeEmitter.on("candle_update", onCandleUpdate);

    connection.socket.on("message", (message: RawData) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === "ping") {
          connection.socket.send(JSON.stringify({ type: "pong" }));
        } else if (msg.type === "subscribe" && msg.marketId) {
          subscriptions.add(msg.marketId);
          fastify.log.info(`Client subscribed to market: ${msg.marketId}`);
        } else if (msg.type === "unsubscribe" && msg.marketId) {
          subscriptions.delete(msg.marketId);
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    connection.socket.on("close", () => {
      fastify.log.info("Client disconnected from WebSocket");
      realtimeEmitter.off("trade", onTrade);
      realtimeEmitter.off("candle_update", onCandleUpdate);
    });
  });
};
