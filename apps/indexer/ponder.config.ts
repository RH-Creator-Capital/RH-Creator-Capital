import { createConfig } from "@ponder/core";
import { http } from "viem";
import { rhCreatorCapitalAbi } from "./abis/rhCreatorCapital";

export default createConfig({
  networks: {
    robinhood: {
      chainId: 46630,
      transport: http(process.env.PONDER_RPC_URL_46630),
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
