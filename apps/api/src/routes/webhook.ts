import { FastifyInstance } from "fastify";
import { createPublicClient, http, decodeEventLog } from 'viem';
import { rhCreatorCapitalAbi } from "../abis/rhCreatorCapital";
import { handleKeysBought, handleKeysSold, handleCreatorMarketCreated } from "../indexer";

export const webhookRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/sync-tx", async (request, reply) => {
    try {
      const { signature } = request.body as { signature: string };
      if (!signature) {
        return reply.status(400).send({ error: "Missing signature (txHash)" });
      }

      fastify.log.info(`[Webhook] Manual sync requested for tx: ${signature}`);
      
      const rpcUrl = process.env.RH_CHAIN_RPC_URL as string;
      const client = createPublicClient({ transport: http(rpcUrl) });
      
      const receipt = await client.getTransactionReceipt({ hash: signature as `0x${string}` });
      if (!receipt) {
        return reply.status(404).send({ error: "Transaction not found on chain" });
      }

      let processed = 0;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: rhCreatorCapitalAbi, data: log.data, topics: log.topics });
          if (decoded.eventName === 'KeysBought') {
            await handleKeysBought({ ...log, args: decoded.args, transactionHash: signature });
            processed++;
          } else if (decoded.eventName === 'KeysSold') {
            await handleKeysSold({ ...log, args: decoded.args, transactionHash: signature });
            processed++;
          } else if (decoded.eventName === 'CreatorMarketCreated') {
            await handleCreatorMarketCreated({ ...log, args: decoded.args, transactionHash: signature });
            processed++;
          }
        } catch(e) {
          // ignore logs from other contracts or unparseable events
        }
      }

      return reply.send({ success: true, message: `Processed ${processed} events from tx` });
    } catch (err: any) {
      fastify.log.error(`[Webhook] Error syncing tx: ${err.message}`);
      return reply.status(500).send({ error: "Internal Server Error", details: err.message });
    }
  });
};
