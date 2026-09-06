import { createConfig } from "@ponder/core";
import { http } from "viem";
import { rhCreatorCapitalAbi } from "./abis/rhCreatorCapital";

const chainId = Number(process.env.PONDER_CHAIN_ID) || 46630;
const rpcUrl = process.env.PONDER_RPC_URL || process.env.PONDER_RPC_URL_46630;

export default createConfig({
  networks: {
    robinhood: {
      chainId: chainId,
      transport: http(rpcUrl),
    },
  },
  contracts: {
    RHCreatorCapital: {
      abi: rhCreatorCapitalAbi,
      network: "robinhood",
      address: process.env.PONDER_RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`,
      startBlock: 0,
    },
  },
});
