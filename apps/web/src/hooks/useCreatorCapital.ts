import { useReadContract, useWriteContract, useSimulateContract, usePublicClient } from 'wagmi';
import { rhCreatorCapitalAbi } from '../abis/rhCreatorCapital'; 
import { keccak256, toHex } from 'viem';

const contractAddress = process.env.NEXT_PUBLIC_RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`;

export function useCreatorCapital() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Helper to get market ID from twitter handle
  const getMarketId = (xUserId: string): `0x${string}` => {
    return keccak256(toHex(`X${xUserId}`));
  };

  const getMarketState = async (marketId: string) => {
    if (!publicClient) return null;
    try {
      const res: any = await publicClient.readContract({
        address: contractAddress,
        abi: rhCreatorCapitalAbi,
        functionName: 'markets',
        args: [marketId as `0x${string}`]
      });
      if (res && res[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return {
          marketId: res[0],
          xUserId: res[1],
          creatorWallet: res[2],
          claimed: res[3],
          listed: res[4],
          supply: res[5],
          reserve: res[6],
          totalVolume: res[7],
          lifetimeCreatorRewards: res[8],
          createdAt: res[9]
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const getUserPosition = async (marketId: string, userAddress: string) => {
    if (!publicClient) return { keys: BigInt(0) };
    try {
      const res = await publicClient.readContract({
        address: contractAddress,
        abi: rhCreatorCapitalAbi,
        functionName: 'keyBalances',
        args: [marketId as `0x${string}`, userAddress as `0x${string}`]
      });
      return { keys: res as bigint };
    } catch {
      return { keys: BigInt(0) };
    }
  };

  const getTotalKeys = async (userAddress: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const res = await fetch(`${apiUrl}/api/portfolio/${userAddress}`);
      const data = await res.json();
      if (data.success && data.portfolio) {
        let total = BigInt(0);
        for (const pos of data.portfolio) {
          total += BigInt(pos.keyBalance || 0);
        }
        return Number(total);
      }
      return 0;
    } catch (err) {
      console.error("Failed to fetch total keys:", err);
      return 0;
    }
  };

  const createMarket = async (xUserId: string) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      functionName: 'createMarket',
      args: [xUserId],
    });
  };

  const claimMarket = async (marketId: string, xUserId: string, deadline: number, signature: string) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      functionName: 'claimMarket',
      args: [marketId as `0x${string}`, xUserId, BigInt(deadline), signature as `0x${string}`],
    });
  };

  const claimCreatorRewards = async (marketId: string) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      functionName: 'claimCreatorRewards',
      args: [marketId as `0x${string}`],
    });
  };

  const buyKeys = async (marketId: string, amount: number, valueWei: bigint) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      functionName: 'buyKeys',
      args: [marketId as `0x${string}`, BigInt(amount), valueWei],
      value: valueWei,
    });
  };

  const sellKeys = async (marketId: string, amount: number, minEthOut: bigint) => {
    return await writeContractAsync({
      address: contractAddress,
      abi: rhCreatorCapitalAbi,
      functionName: 'sellKeys',
      args: [marketId as `0x${string}`, BigInt(amount), minEthOut],
    });
  };

  return {
    getMarketId,
    getMarketState,
    getUserPosition,
    getTotalKeys,
    createMarket,
    claimMarket,
    claimCreatorRewards,
    buyKeys,
    sellKeys,
    contractAddress,
    abi: rhCreatorCapitalAbi,
  };
}
