import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { defineChain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string;

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 46630;

export const robinhoodChain = defineChain({
  id: chainId,
  name: chainId === 4663 ? 'Robinhood Mainnet' : 'Robinhood Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL as string] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: process.env.NEXT_PUBLIC_EXPLORER_URL as string },
  }
});

export const networks = [robinhoodChain] as any;

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  networks,
  projectId
});

export const config = wagmiAdapter.wagmiConfig;
