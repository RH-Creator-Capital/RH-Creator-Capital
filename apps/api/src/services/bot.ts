import { createWalletClient, createPublicClient, http, formatEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db, creatorMarkets } from '@creator-capital/db';
import { eq, and } from 'drizzle-orm';
import { rhCreatorCapitalAbi } from '../abis/rhCreatorCapital';

// Setup Robinhood Chain dynamically based on env or default to testnet (46630)
const chainId = parseInt(process.env.CHAIN_ID || "46630");
const robinhoodChain = defineChain({
  id: chainId,
  name: chainId === 4663 ? 'Robinhood Mainnet' : 'Robinhood Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RH_CHAIN_RPC_URL || 'https://rpc.testnet.chain.robinhood.com'] },
  },
});

export const startTradingBot = () => {
  const isEnabled = process.env.ENABLE_TRADING_BOT === 'true';
  const botPrivateKey = process.env.BOT_PRIVATE_KEY;
  
  if (!isEnabled) {
    return;
  }

  // Safety check: Prevent running on Mainnet (Chain ID 4663)
  if (chainId === 4663) {
    console.warn("⚠️ Trading bot is DISABLED on Mainnet for safety. It will not start.");
    return;
  }

  if (!botPrivateKey) {
    console.warn("⚠️ BOT_PRIVATE_KEY not set. Trading bot will not start despite ENABLE_TRADING_BOT=true.");
    return;
  }

  // Ensure key format is correct for viem
  const formattedKey = botPrivateKey.startsWith('0x') ? botPrivateKey : `0x${botPrivateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: robinhoodChain,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http()
  });

  const contractAddress = process.env.RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`;
  const network = process.env.RH_NETWORK as string;

  console.log(`\n🤖 Trading Bot initialized on ${robinhoodChain.name}`);
  console.log(`🤖 Bot wallet address: ${account.address}`);
  console.log(`🤖 Trading on contract: ${contractAddress}\n`);

  setInterval(async () => {
    try {
      console.log(`\n--- 🤖 Bot Trading Iteration (${new Date().toLocaleTimeString()}) ---`);
      
      // Fetch all active markets for this network
      const markets = await db.query.creatorMarkets.findMany({
        where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.isActive, true))
      });

      if (markets.length === 0) {
        console.log("🤖 No active markets found to trade on.");
        return;
      }

      // Pick a random market
      const randomMarket = markets[Math.floor(Math.random() * markets.length)];
      console.log(`🤖 Selected Market: @${randomMarket.twitterHandle} (${randomMarket.marketId})`);

      // Pick a random amount between 1 and 20
      let amount = BigInt(Math.floor(Math.random() * 20) + 1);
      
      // FIX: If the market is brand new (supply = 0), force the bot to buy exactly 1 key
      // to avoid triggering the underflow bug in the smart contract.
      if (randomMarket.supply === 0) {
        amount = 1n;
        console.log(`🤖 Market is new (supply 0). Forcing amount to 1 key to avoid contract underflow.`);
      }
      
      // Decide BUY or SELL (e.g., 50% chance each)
      // Check if we have keys to sell first
      const keyBalance = await publicClient.readContract({
        address: contractAddress,
        abi: rhCreatorCapitalAbi,
        functionName: 'keyBalances',
        args: [randomMarket.marketId as `0x${string}`, account.address]
      });

      let isBuy = Math.random() > 0.5;
      
      // If we chose sell but have no keys, switch to buy
      if (!isBuy && keyBalance < amount) {
        isBuy = true;
      }

      if (isBuy) {
        console.log(`🤖 Action: BUY ${amount} keys`);
        
        // Get buy price
        const [priceWei, feeWei] = await publicClient.readContract({
          address: contractAddress,
          abi: rhCreatorCapitalAbi,
          functionName: 'getBuyPriceAfterFee',
          args: [randomMarket.marketId as `0x${string}`, amount]
        });

        const totalCostWei = priceWei + feeWei;
        // Add 5% slippage tolerance
        const maxEthIn = totalCostWei + (totalCostWei * 5n / 100n);

        console.log(`🤖 Cost: ~${formatEther(totalCostWei)} ETH (Max: ${formatEther(maxEthIn)} ETH)`);

        // Check our ETH balance
        const ethBalance = await publicClient.getBalance({ address: account.address });
        if (ethBalance < maxEthIn) {
          console.error(`🤖 Insufficient ETH balance. Have ${formatEther(ethBalance)}, need ${formatEther(maxEthIn)}`);
          return;
        }

        // Execute BUY
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: rhCreatorCapitalAbi,
          functionName: 'buyKeys',
          args: [randomMarket.marketId as `0x${string}`, amount, maxEthIn],
          account,
          value: maxEthIn
        });

        const hash = await walletClient.writeContract(request);
        console.log(`✅ BUY TX Broadcasted: ${hash}`);
        
      } else {
        console.log(`🤖 Action: SELL ${amount} keys`);

        // Get sell price
        const [priceWei, feeWei] = await publicClient.readContract({
          address: contractAddress,
          abi: rhCreatorCapitalAbi,
          functionName: 'getSellPriceAfterFee',
          args: [randomMarket.marketId as `0x${string}`, amount]
        });

        const netReceiveWei = priceWei - feeWei;
        // 5% slippage tolerance
        const minEthOut = netReceiveWei - (netReceiveWei * 5n / 100n);

        console.log(`🤖 Expected Return: ~${formatEther(netReceiveWei)} ETH (Min: ${formatEther(minEthOut)} ETH)`);

        // Execute SELL
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: rhCreatorCapitalAbi,
          functionName: 'sellKeys',
          args: [randomMarket.marketId as `0x${string}`, amount, minEthOut],
          account
        });

        const hash = await walletClient.writeContract(request);
        console.log(`✅ SELL TX Broadcasted: ${hash}`);
      }

    } catch (err) {
      console.error("🤖 Bot Error during execution:", err);
    }

  }, 60 * 1000); // Run every 60 seconds
};
