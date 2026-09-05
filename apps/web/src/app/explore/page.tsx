"use client";

import { MarketCard, Market } from "@/components/MarketCard";
import { useState } from "react";
import { Tabs } from "@/components/Tabs";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [activeTab, setActiveTab] = useState("overall");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = ["Crypto", "Streamers", "Influencers", "Athletes", "Business", "Actors", "Celebrities", "Politicians", "Musicians", "Creatives", "Companies"];
  
  const { data, error, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/markets`, 
    fetcher
  );

  const calculateNextKeyPriceWei = (currentSupply: number) => {
    const K_CONSTANT = 100_000;
    const s1 = BigInt(currentSupply || 0);
    const s2 = BigInt((currentSupply || 0) + 1);
    const cost = (BigInt(K_CONSTANT) * ((s2 ** BigInt(3)) - (s1 ** BigInt(3)))) / BigInt(3);
    return cost.toString();
  };

  // Map API response to the Market interface expected by MarketCard
  const rawMarkets: Market[] = data?.markets?.map((m: any) => {
    const currentPriceWei = m.currentPriceWei || calculateNextKeyPriceWei(m.supply);
    return {
      id: m.id,
      marketId: m.marketId,
      twitterHandle: m.twitterHandle,
      supply: m.supply,
      reserveWei: m.reserveWei,
      totalVolumeWei: m.totalVolumeWei,
      currentPriceWei, 
      marketCapWei: m.marketCapWei || (BigInt(m.supply || 0) * BigInt(currentPriceWei)).toString(),
      holderCount: m.holderCount || 0,
      creatorFeeBps: m.creatorFeeBps || 30, // 30 bps = 0.3%
      username: m.twitterName || m.twitterHandle || "Unknown",
      avatarUrl: m.avatarUrl,
      bannerUrl: m.bannerUrl,
      sparkline: m.sparkline,
      ticker: m.ticker,
      description: m.description,
      websiteUrl: m.websiteUrl,
      telegramUrl: m.telegramUrl,
      claimed: m.claimed,
      createdAt: m.createdAt,
      category: m.category,
    };
  }) || [];

  let markets = [...rawMarkets];
  
  if (selectedCategory) {
    markets = markets.filter(m => m.category === selectedCategory);
  }

  // Apply sorting based on activeTab
  if (activeTab === "volume") {
    markets.sort((a, b) => Number(b.totalVolumeWei) - Number(a.totalVolumeWei));
  } else if (activeTab === "newest") {
    markets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } else if (activeTab === "holders") {
    markets.sort((a, b) => (b.holderCount || 0) - (a.holderCount || 0));
  } else {
    // overall - sort by market cap (default)
    markets.sort((a, b) => Number(b.marketCapWei) - Number(a.marketCapWei));
  }

  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* Header and Tabs */}
      <section className="flex flex-col gap-6 mt-8">
        <div>
          <p className="text-[11px] font-bold text-color-muted tracking-widest uppercase mb-2">Explore</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Tokenized Creators.</h1>
          <p className="text-color-muted text-sm md:text-base max-w-2xl font-light leading-relaxed">
            Trade keys of your favorite personalities on the bonding curve. Discover emerging talent, back early believers, and build your social capital portfolio.
          </p>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 w-full gap-4 overflow-hidden">
          <div className="w-full md:w-auto overflow-x-auto hide-scrollbar pb-1">
            <Tabs
              tabs={[
                { id: 'overall', label: 'Overall Ranking' },
                { id: 'volume', label: 'Highest Volume' },
                { id: 'newest', label: 'Newest' },
                { id: 'holders', label: 'Most Holders' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto overflow-x-auto hide-scrollbar pb-1">
            {selectedCategory && (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-white border border-transparent rounded-lg text-[#0B0D0A] text-sm font-semibold shadow-sm shrink-0">
                {selectedCategory}
                <button onClick={() => setSelectedCategory(null)} className="hover:bg-black/10 rounded-md p-0.5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
            <div className="relative group shrink-0">
              <select 
                className="appearance-none bg-[#131711] border border-color-border text-color-muted text-sm py-2 pl-4 pr-8 rounded-lg focus:outline-none focus:border-color-muted hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                value={selectedCategory || ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
              >
                <option value="">+ Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-color-muted group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 mt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-background rounded-xl p-5 border border-color-border/50 flex flex-col justify-between h-[196px] animate-pulse shadow-lg">
                <div className="flex items-start justify-between gap-2 mb-6">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-white/10 shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-white/10 rounded mb-1.5"></div>
                      <div className="h-3 w-16 bg-white/10 rounded mb-1.5"></div>
                      <div className="h-2.5 w-20 bg-white/10 rounded"></div>
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-white/10 rounded-full shrink-0"></div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <div className="h-3 w-16 bg-white/10 rounded mb-1.5"></div>
                    <div className="h-6 w-24 bg-white/10 rounded mb-1.5"></div>
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-8 w-24 bg-white/10 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-24 text-color-sell">
            Error loading markets. Please check your connection or try again later.
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-24 text-color-muted border border-dashed border-color-border rounded-2xl mt-2">
            No live markets found on-chain. <br /> Be the first to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 mt-2">
            {markets.map((market: Market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
