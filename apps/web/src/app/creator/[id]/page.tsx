"use client";

import { TradingWidget } from "@/components/TradingWidget";
import { ChartComponent } from "@/components/ChartComponent";
import { TradeHistoryComponent } from "@/components/TradeHistoryComponent";
import { CreatorDashboard } from "@/components/CreatorDashboard";
import { use, useState, useEffect } from "react";
import useSWR from "swr";
import { useCreatorCapital } from "../../../hooks/useCreatorCapital";
import { useAppKitAccount } from "@reown/appkit/react";
import { ClaimBadge } from '@/components/ClaimBadge';

import Link from "next/link";
import toast from "react-hot-toast";

interface PageProps {
  params: Promise<{ id: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CreatorPage({ params }: PageProps) {
  const { id } = use(params);
  
  const getAvatarStyle = (seed: string) => {
    const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
    let hash = 0;
    for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
    return styles[hash % styles.length];
  };

  const sdk = useCreatorCapital();
  const { address: publicKey } = useAppKitAccount();
  const [onChainMarket, setOnChainMarket] = useState<any>(null);
  const [isChainLoading, setIsChainLoading] = useState(true);
  const [chartResolution, setChartResolution] = useState("5m");
  const [keyBalance, setKeyBalance] = useState<number>(0);

  useEffect(() => {
    if (!publicKey || !sdk || !id) return;
    const fetchBalance = async () => {
      try {
        const marketId = (id as string).startsWith('0x') ? (id as string) : sdk.getMarketId(id as string);
        const pos = await sdk.getUserPosition(marketId, publicKey as string);
        setKeyBalance(pos?.keys ? Number(pos.keys) : 0);
      } catch (e) {
        setKeyBalance(0);
      }
    };
    fetchBalance();
    
    // Set interval to poll for balance updates
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, id]);
  
  // Fetch from database API
  const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
  const { data, error, isLoading } = useSWR(
    `${API_URL}/api/markets`, 
    fetcher
  );

  const { data: tradesData } = useSWR(
    id ? `${API_URL}/api/markets/${id}/trades` : null, 
    fetcher
  );

  const dbMarket = data?.markets?.find((m: any) => m.marketId === id);
  const trades = tradesData?.trades || [];
  const lastTradeTime = trades.length > 0 ? trades[0].timestamp : null;

  // Fetch directly from blockchain (crucial for local devnet where webhooks might not fire)
  useEffect(() => {
    if (sdk && id) {
      try {
        const marketId = (id as string).startsWith('0x') ? (id as string) : sdk.getMarketId(id as string);
        sdk.getMarketState(marketId)
          .then((account: any) => {
            setOnChainMarket(account);
          })
          .catch((err: any) => {
            console.error("Failed to fetch onchain market:", err);
          })
          .finally(() => {
            setIsChainLoading(false);
          });
      } catch (e) {
        setIsChainLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isLoadingTotal = isLoading || (isChainLoading && !dbMarket);
  
  // Use DB market, or construct from on-chain data if DB sync failed
  const finalMarket = dbMarket || (onChainMarket ? {
    supply: Number(onChainMarket.supply),
    reserveWei: onChainMarket.reserve.toString(),
    claimed: onChainMarket.claimed,
    twitterHandle: onChainMarket.xUserId
  } : null);

  if (isLoadingTotal) {
    return (
      <div className="flex flex-col gap-6 pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-background p-6 rounded-xl border border-color-border shadow-lg flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/5 shrink-0"></div>
            <div className="flex-1">
              <div className="h-8 w-48 bg-white/5 rounded mb-2"></div>
              <div className="h-5 w-32 bg-white/5 rounded mb-3"></div>
              <div className="flex gap-2 mb-3">
                <div className="h-4 w-40 bg-white/5 rounded"></div>
                <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
              </div>
            </div>
          </div>
          <div className="h-4 w-2/3 bg-white/5 rounded mt-2"></div>
          <div className="flex gap-4 mt-2">
            <div className="h-8 w-32 bg-white/5 rounded-lg"></div>
            <div className="h-8 w-40 bg-white/5 rounded-lg"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Chart Skeleton */}
            <div className="bg-background rounded-xl border border-color-border p-5 h-[500px] flex flex-col gap-4">
               <div className="flex justify-between items-end">
                 <div>
                   <div className="h-5 w-24 bg-white/5 rounded mb-2"></div>
                   <div className="h-8 w-32 bg-white/5 rounded"></div>
                 </div>
                 <div className="flex gap-1.5">
                   <div className="h-6 w-8 bg-white/5 rounded-lg"></div>
                   <div className="h-6 w-8 bg-white/5 rounded-lg"></div>
                   <div className="h-6 w-10 bg-white/5 rounded-lg"></div>
                 </div>
               </div>
               <div className="flex-1 bg-white/5 rounded-lg"></div>
            </div>
            {/* Trade History Skeleton */}
            <div className="bg-background rounded-xl border border-color-border p-5 h-[300px]">
               <div className="h-6 w-32 bg-white/5 rounded mb-6"></div>
               <div className="space-y-4">
                 <div className="h-4 w-full bg-white/5 rounded"></div>
                 <div className="h-4 w-full bg-white/5 rounded"></div>
                 <div className="h-4 w-full bg-white/5 rounded"></div>
                 <div className="h-4 w-full bg-white/5 rounded"></div>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            {/* Trading Widget Skeleton */}
            <div className="bg-background rounded-xl border border-color-border p-6 h-[400px]">
               <div className="h-10 w-full bg-white/5 rounded-lg mb-5"></div>
               <div className="h-4 w-20 bg-white/5 rounded mb-2"></div>
               <div className="h-16 w-full bg-white/5 rounded-lg mb-5"></div>
               <div className="h-24 w-full bg-white/5 rounded-lg mb-5"></div>
               <div className="h-12 w-full bg-white/5 rounded-lg"></div>
            </div>
            
            {/* Creator Card Skeleton */}
            <div className="bg-background rounded-xl border border-color-border p-5">
              <div className="flex justify-between items-center mb-4">
                 <div className="h-5 w-32 bg-white/5 rounded"></div>
                 <div className="h-5 w-16 bg-white/5 rounded-full"></div>
              </div>
              <div className="flex gap-3">
                 <div className="h-12 w-12 rounded-full bg-white/5 shrink-0"></div>
                 <div className="flex-1">
                   <div className="h-4 w-24 bg-white/5 rounded mb-2"></div>
                   <div className="h-3 w-16 bg-white/5 rounded mb-2"></div>
                   <div className="h-6 w-24 bg-white/5 rounded-lg"></div>
                 </div>
              </div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="bg-background rounded-xl border border-color-border p-5">
              <div className="h-5 w-24 bg-white/5 rounded mb-4"></div>
              <div className="space-y-4">
                <div className="flex justify-between"><div className="h-4 w-20 bg-white/5 rounded"></div><div className="h-4 w-16 bg-white/5 rounded"></div></div>
                <div className="flex justify-between"><div className="h-4 w-24 bg-white/5 rounded"></div><div className="h-4 w-20 bg-white/5 rounded"></div></div>
                <div className="flex justify-between"><div className="h-4 w-16 bg-white/5 rounded"></div><div className="h-4 w-12 bg-white/5 rounded"></div></div>
                <div className="flex justify-between"><div className="h-4 w-20 bg-white/5 rounded"></div><div className="h-4 w-12 bg-white/5 rounded"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!finalMarket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold text-white mb-2">Market Not Found</h1>
        <p className="text-color-muted">This market does not exist or hasn't synced yet.</p>
      </div>
    );
  }

  const calculateNextKeyPrice = (currentSupply: number) => {
    const s = BigInt(currentSupply);
    const a = BigInt(1);
    const sum1 = s === BigInt(0) ? BigInt(0) : (s - BigInt(1)) * s * (BigInt(2) * s - BigInt(1)) / BigInt(6);
    const sum2 = s === BigInt(0) && a === BigInt(1) ? BigInt(0) : (s - BigInt(1) + a) * (s + a) * (BigInt(2) * (s + a) - BigInt(1)) / BigInt(6);
    const summation = sum2 - sum1;
    return Number(summation) / 16000;
  };

  const supply = finalMarket.supply || 0;
  const reserve = (Number(finalMarket.reserveWei || 0) / 1e18).toFixed(2);
  const spotPrice = calculateNextKeyPrice(supply);
  const mcap = (supply * spotPrice).toFixed(4); 
  const price = spotPrice.toFixed(6); 
  const creatorName = finalMarket.twitterName || finalMarket.twitterHandle || "Unknown";
  const handleUrl = finalMarket.twitterHandle || creatorName;
  
  const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  
  const getWebsiteIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('github.com')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
    }
    if (lowerUrl.includes('instagram.com')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
    }
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
    }
    if (lowerUrl.includes('discord.com') || lowerUrl.includes('discord.gg')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>;
    }
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    }
    if (lowerUrl.includes('tiktok.com')) {
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>;
    }
    // Default link
    return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>;
  };
  
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Profile */}
      <div className="bg-background p-6 rounded-xl border border-color-border shadow-lg flex flex-col gap-6 relative overflow-hidden group hover:border-color-buy/50 transition-colors">
        {finalMarket.bannerUrl && (
          <>
            <div 
              className="absolute inset-0 z-0 opacity-30 mix-blend-luminosity group-hover:opacity-40 transition-opacity"
              style={{ 
                backgroundImage: `url(${finalMarket.bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-background from-20% via-background/80 to-transparent pointer-events-none" />
          </>
        )}
        
        <div className="flex flex-col md:flex-row md:justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative shrink-0">
              <div className={`w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-inner overflow-hidden border-2 ${finalMarket.claimed ? 'border-color-buy shadow-[0_0_15px_rgba(46,204,113,0.3)]' : 'border-transparent'}`}>
                {finalMarket.avatarUrl ? (
                  <img src={finalMarket.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  creatorName.charAt(0).toUpperCase()
                )}
              </div>
              <a 
                href={`https://x.com/${handleUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title={`View @${handleUrl} on X`}
                className={`absolute -bottom-1 -right-1 bg-[#0B0D0A] p-1.5 rounded-full border-2 shadow-lg hover:scale-110 transition-transform ${finalMarket.claimed ? 'border-color-buy text-color-buy' : 'border-[#161A22] text-white'}`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
            </div>
            <div className="relative z-10 min-w-0">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {creatorName}
            <ClaimBadge claimed={finalMarket.claimed} />
          </h1>
          <div className="text-color-muted text-base mt-1 mb-2">@{handleUrl}</div>
          <div className="flex items-center gap-1.5 mt-1 mb-2">
            <a 
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              title="View on Blockscout"
              className="text-color-muted hover:text-color-buy transition-colors text-xs flex items-center gap-1"
            >
              <span>Market on Robinhood Chain</span>
              <span className="font-mono">{id ? `${(id as string).slice(0, 6)}...${(id as string).slice(-6)}` : ''}</span>
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(id as string)}
              title="Copy Address"
              className="text-color-muted hover:text-white transition-colors flex items-center justify-center ml-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="bg-white/5 border border-color-border px-3 py-1.5 rounded-lg text-white flex items-center text-xs font-semibold whitespace-nowrap">
              <span className="text-color-muted mr-1 font-medium">Holders:</span> {dbMarket?.holderCount || 0}
            </span>
            <span className="bg-white/5 border border-color-border px-3 py-1.5 rounded-lg text-white flex items-center text-xs font-semibold whitespace-nowrap">
              <span className="text-color-muted mr-1 font-medium">Circulating Keys:</span> {supply.toLocaleString()}
            </span>
            <span className="bg-color-buy/10 border border-color-buy/20 px-3 py-1.5 rounded-lg text-color-buy flex items-center text-xs font-bold whitespace-nowrap">
              <span className="text-color-buy/70 mr-1 font-medium">Price:</span> {price} ETH
            </span>
            <span className="bg-white/5 border border-color-border px-3 py-1.5 rounded-lg text-white flex items-center text-xs font-semibold whitespace-nowrap">
              <span className="text-color-muted mr-1 font-medium">MC:</span> {mcap} ETH
            </span>
            
            <div className="flex flex-wrap items-center gap-2">
              <a 
                href={`https://x.com/${handleUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/5 border border-color-border text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                title={`View @${handleUrl} on X`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
              {finalMarket.websiteUrl && (
                <a href={finalMarket.websiteUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-color-border text-color-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center" title="Website">
                  {getWebsiteIcon(finalMarket.websiteUrl)}
                </a>
              )}
              {finalMarket.telegramUrl && (
                <a href={finalMarket.telegramUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-color-border text-[#0088cc] hover:text-[#0088cc] hover:bg-[#0088cc]/10 rounded-lg transition-colors flex items-center justify-center" title="Telegram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.62-.2-1.12-.31-1.09-.66.02-.18.27-.36.77-.55 3.02-1.31 5.03-2.18 6.04-2.6.28-.11 3.23-1.33 3.86-1.33.14 0 .45.03.62.17.14.12.18.28.19.4z"></path></svg>
                </a>
              )}
              
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-color-muted sm:ml-2 sm:border-l border-color-border sm:pl-3 w-full sm:w-auto mt-2 sm:mt-0">
                {dbMarket?.createdAt && (
                  <span>opened {timeAgo(dbMarket.createdAt)}</span>
                )}
                {dbMarket?.createdAt && lastTradeTime && (
                  <span className="text-color-muted/40 hidden sm:inline">•</span>
                )}
                {lastTradeTime && (
                  <span>last trade {timeAgo(lastTradeTime)}</span>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      
      {finalMarket.description && (
        <div className="mt-4 md:mt-0 md:max-w-[300px] lg:max-w-sm md:text-right relative z-10">
          <p className="text-color-muted text-sm italic leading-relaxed border-l-2 md:border-l-0 md:border-r-2 border-color-buy/40 pl-3 md:pl-0 md:pr-4 py-1">
            "{finalMarket.description}"
          </p>
        </div>
      )}
      </div>
      
      {/* Watermark Ticker Overlay */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-end overflow-hidden px-4">
        <span 
          className="font-black italic tracking-tighter text-white/5 whitespace-nowrap text-right leading-none"
          style={{ fontSize: 'clamp(40px, 8vw, 160px)' }}
        >
          ${finalMarket.ticker ? finalMarket.ticker.toUpperCase() : handleUrl.toUpperCase()}
        </span>
      </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Chart */}
          <section className="bg-background border border-color-border pt-5 rounded-xl shadow-lg hover:border-color-buy/50 transition-colors group overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 px-5">
              <div className="flex items-center gap-3">
                <h2 className="text-[11px] font-bold text-color-muted uppercase tracking-[0.15em]">PRICE HISTORY</h2>
                {publicKey && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-color-border text-color-muted">
                    Keys Owned: <span className="text-white">{keyBalance}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setChartResolution("1m")}
                  className={chartResolution === "1m" ? "text-white font-semibold bg-black border border-color-border rounded-lg text-xs px-2.5 py-1" : "text-color-muted hover:bg-white/5 rounded-lg text-xs px-2.5 py-1 transition-colors"}
                >1M</button>
                <button 
                  onClick={() => setChartResolution("5m")}
                  className={chartResolution === "5m" ? "text-white font-semibold bg-black border border-color-border rounded-lg text-xs px-2.5 py-1" : "text-color-muted hover:bg-white/5 rounded-lg text-xs px-2.5 py-1 transition-colors"}
                >5M</button>
                <button 
                  onClick={() => setChartResolution("15m")}
                  className={chartResolution === "15m" ? "text-white font-semibold bg-black border border-color-border rounded-lg text-xs px-2.5 py-1" : "text-color-muted hover:bg-white/5 rounded-lg text-xs px-2.5 py-1 transition-colors"}
                >15M</button>
                <button 
                  onClick={() => setChartResolution("1h")}
                  className={chartResolution === "1h" ? "text-white font-semibold bg-black border border-color-border rounded-lg text-xs px-2.5 py-1" : "text-color-muted hover:bg-white/5 rounded-lg text-xs px-2.5 py-1 transition-colors"}
                >1H</button>
                <button 
                  onClick={() => setChartResolution("1d")}
                  className={chartResolution === "1d" ? "text-white font-semibold bg-black border border-color-border rounded-lg text-xs px-2.5 py-1" : "text-color-muted hover:bg-white/5 rounded-lg text-xs px-2.5 py-1 transition-colors"}
                >1D</button>
              </div>
            </div>
            <div className="w-full bg-[#07090c] border-t border-color-border h-[400px]">
              <ChartComponent marketId={id} resolution={chartResolution} />
            </div>
          </section>

          {/* Trade History */}
          <section className="bg-background border border-color-border p-5 rounded-xl shadow-lg hover:border-color-buy/50 transition-colors group">
            <h2 className="text-[11px] font-bold text-color-muted uppercase tracking-[0.15em] mb-5">RECENT TRADES</h2>
            <TradeHistoryComponent marketId={id} />
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          <TradingWidget marketId={id} twitterHandle={finalMarket.twitterHandle} />

          {/* Market Stats */}
          <div className="bg-background rounded-xl p-5 border border-color-border shadow-lg hover:border-color-buy/50 transition-colors group">
            <h2 className="text-[11px] font-bold text-color-muted uppercase tracking-[0.15em] mb-5">
              MARKET STATS
            </h2>
            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-color-muted">Market Cap</span>
                <span className="font-mono text-white">{mcap} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-color-muted">Total Reserve</span>
                <span className="font-mono text-white">{reserve} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-color-muted">Creator Fee</span>
                <span className="font-mono text-white">0.30%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-color-muted">Protocol Fee</span>
                <span className="font-mono text-white">0.95%</span>
              </div>
            </div>
          </div>

          {/* Creator Profile Card (Identity on Robinhood Chain) */}
          {onChainMarket?.creatorWallet && (
            <div className="bg-background border border-color-border p-5 rounded-xl shadow-lg hover:border-color-buy/50 transition-colors group">
              <h2 className="text-[11px] font-bold text-color-muted uppercase tracking-[0.15em] mb-5">
                IDENTITY ON ETHANA
              </h2>
              
              <div className="flex flex-col gap-3.5 text-sm mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-color-muted">Platform</span>
                  <span className="font-mono text-white">X (Twitter)</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-color-muted">Subject hash</span>
                  <button 
                    onClick={() => {
                      if (dbMarket?.creatorIdHex) {
                        navigator.clipboard.writeText(dbMarket.creatorIdHex);
                        toast.success("Subject hash copied!");
                      }
                    }}
                    className="font-mono text-white truncate max-w-[200px] hover:text-color-buy transition-colors" 
                    title={dbMarket?.creatorIdHex ? "Click to copy" : 'Unknown'}
                  >
                    {dbMarket?.creatorIdHex ? `${dbMarket.creatorIdHex.slice(0, 10)}...${dbMarket.creatorIdHex.slice(-8)}` : 'Unknown'}
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-color-muted">Curve Address</span>
                  <button 
                    onClick={() => {
                      if (id) {
                        navigator.clipboard.writeText(id as string);
                        toast.success("Curve Address copied!");
                      }
                    }}
                    className="font-mono text-white hover:text-color-buy transition-colors"
                    title="Click to copy"
                  >
                    {(id as string).slice(0, 8)}...{(id as string).slice(-8)}
                  </button>
                </div>
                
                {dbMarket?.createdBy && (
                  <div className="flex justify-between items-center">
                    <span className="text-color-muted">Created by</span>
                    <Link 
                      href={`/profile/${dbMarket.createdBy}`}
                      className="font-mono text-white hover:text-color-buy transition-colors"
                      title="View Profile"
                    >
                      {dbMarket.createdBy.slice(0, 6)}...{dbMarket.createdBy.slice(-6)}
                    </Link>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-color-muted">{finalMarket.claimed ? "Claimed by" : "Owner"}</span>
                  {finalMarket.claimed ? (
                    <Link 
                      href={`/profile/${onChainMarket.creatorWallet.toBase58()}`}
                      className="font-mono text-white hover:text-color-buy transition-colors"
                      title="View Profile"
                    >
                      {onChainMarket.creatorWallet.toBase58().slice(0, 6)}...{onChainMarket.creatorWallet.toBase58().slice(-6)}
                    </Link>
                  ) : (
                    <span className="font-mono text-color-muted">Unclaimed</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-color-muted">Status</span>
                  <span className={`font-mono text-right ${finalMarket.claimed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {finalMarket.claimed ? "Verified" : "Unverified"}
                  </span>
                </div>

                {dbMarket?.createTxSignature && (
                  <div className="flex justify-between items-center">
                    <span className="text-color-muted">Create TX</span>
                    <a 
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${dbMarket.createTxSignature}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-mono text-white hover:text-color-buy transition-colors"
                    >
                      {dbMarket.createTxSignature.slice(0, 6)}...{dbMarket.createTxSignature.slice(-6)}
                    </a>
                  </div>
                )}

                {dbMarket?.claimTxSignature && (
                  <div className="flex justify-between items-center">
                    <span className="text-color-muted">Claim TX</span>
                    <a 
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${dbMarket.claimTxSignature}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-mono text-white hover:text-color-buy transition-colors"
                    >
                      {dbMarket.claimTxSignature.slice(0, 6)}...{dbMarket.claimTxSignature.slice(-6)}
                    </a>
                  </div>
                )}
                
                {dbMarket?.createdAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-color-muted">Created at</span>
                    <span className="font-mono text-white text-right">
                      {new Date(dbMarket.createdAt).toISOString().replace('T', ' ').substring(0, 19)}Z
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-[11px] text-color-muted/60 leading-relaxed pt-4 border-t border-color-border/30 text-justify">
                RH Creator Capital only stores cryptographic hashes and bonding curve states on the Robinhood Chain blockchain. To protect user privacy, raw personal data—such as social handles, avatars, or follower counts—is never written to the immutable public ledger.
              </div>

              {/* Creator Dashboard (Only shows if connected wallet == creatorWallet, or unclaimed market owner) */}
              {finalMarket && (
                <div className="pt-4 mt-4 border-t border-color-border/30">
                  <CreatorDashboard 
                    marketId={id as string} 
                    creatorWallet={onChainMarket?.creatorWallet || ""} 
                    claimed={!!finalMarket.claimed} 
                    twitterHandle={finalMarket.twitterHandle || ""} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
