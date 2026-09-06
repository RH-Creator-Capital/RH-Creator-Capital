import { createConfig } from "@ponder/core";
import { http } from "viem";
import { rhCreatorCapitalAbi } from "./abis/rhCreatorCapital";

const chainId = Number(process.env.PONDER_CHAIN_ID) || Number(process.env.CHAIN_ID) || 4663;
const rpcUrl = process.env.PONDER_RPC_URL || process.env.RH_CHAIN_RPC_URL || "";

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
      address: (process.env.PONDER_RH_CREATOR_CAPITAL_ADDRESS || process.env.RH_CREATOR_CAPITAL_ADDRESS) as `0x${string}`,
      startBlock: 56080800,
    },
  },
});
