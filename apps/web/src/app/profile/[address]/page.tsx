"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import { UserTradeHistoryComponent } from "@/components/UserTradeHistory";
import { Tabs } from "@/components/Tabs";
import { ProfileHeaderCard } from "@/components/profile/ProfileHeaderCard";
import { PortfolioStatsCard } from "@/components/profile/PortfolioStatsCard";
import { MarketsCreatedList } from "@/components/profile/MarketsCreatedList";
import { TokensHeldTable } from "@/components/profile/TokensHeldTable";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

interface PageProps {
  params: Promise<{ address: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProfilePage({ params }: PageProps) {
  const { address } = use(params);
  const { address: publicKey } = useAppKitAccount();
  const isOwner = publicKey === address;
  
  const [activeTab, setActiveTab] = useState<"keys" | "trades">("keys");
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
  const network = 'robinhood';
  
  const { data, error, isLoading: profileLoading, mutate: mutateProfile } = useSWR(
    `${API_URL}/api/users/${address}/markets?network=${network}`, 
    fetcher
  );

  const { data: portfolioData, isLoading: portfolioLoading } = useSWR(
    `${API_URL}/api/portfolio/${address}?network=${network}`,
    fetcher
  );

  const isLoading = profileLoading || portfolioLoading;

  const markets = data?.markets || [];
  const success = data?.success;
  const userProfile = data?.userProfile;
  const withdrawals = data?.withdrawals || [];
  const positions = portfolioData?.portfolio || [];
  const totalFeesWei = portfolioData?.totalFeesWei ? BigInt(portfolioData.totalFeesWei) : BigInt(0);

  const formatEth = (wei: bigint | number | string) => {
    const eth = Number(wei) / 1e18;
    if (eth === 0) return "0.0000";
    return Math.abs(eth) < 0.0001 ? eth.toFixed(6) : eth.toFixed(4);
  };

  // Calculate aggregates
  const totalValueWei = positions.reduce((acc: bigint, pos: any) => acc + BigInt(pos.currentValueWei), BigInt(0));
  const totalValueEth = formatEth(totalValueWei);
  
  const totalPnLWei = positions.reduce((acc: bigint, pos: any) => acc + BigInt(pos.pnlWei), BigInt(0));
  const totalPnLEth = formatEth(totalPnLWei);
  
  const totalKeys = positions.reduce((acc: number, pos: any) => acc + pos.keyBalance, 0);

  const totalFeesSol = formatEth(totalFeesWei);
  const netProfitWei = totalPnLWei + totalFeesWei;
  const netProfitEth = formatEth(netProfitWei);

  const getAvatarStyle = (seed: string) => {
    const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
    let hash = 0;
    for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
    return styles[hash % styles.length];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-0 pb-12 lg:pb-0 lg:-my-6 lg:min-h-[85vh] animate-pulse">
        {/* Left Sidebar Skeleton */}
        <div className="lg:col-span-3 flex flex-col gap-6 lg:border-r lg:border-color-border/30 lg:pr-8 lg:py-6">
          <div className="bg-background p-8 rounded-xl border border-color-border shadow-lg h-[360px]">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left min-w-0">
              <div className="w-24 h-24 rounded-full bg-white/5 mb-5 border-4 border-[#161A22]"></div>
              <div className="h-6 w-32 bg-white/5 rounded mb-2"></div>
              <div className="h-4 w-24 bg-white/5 rounded mb-4"></div>
              <div className="h-4 w-full max-w-[200px] bg-white/5 rounded"></div>
            </div>
          </div>

          <div className="w-full bg-background rounded-xl p-6 border border-color-border shadow-lg">
            <div className="h-5 w-32 bg-white/10 rounded mb-6"></div>
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between border-b border-white/5 pb-3">
                  <div className="h-4 w-24 bg-white/10 rounded"></div>
                  <div className="h-4 w-16 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full mt-2">
            <div className="h-5 w-32 bg-white/10 rounded mb-4"></div>
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-background border border-color-border/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column Skeleton */}
        <div className="lg:col-span-6 flex flex-col gap-6 lg:px-8 lg:py-6">
          <div className="flex gap-4 border-b border-color-border/50 pb-2">
            <div className="h-8 w-24 bg-white/5 rounded-full"></div>
            <div className="h-8 w-24 bg-white/5 rounded-full"></div>
          </div>
          <div className="h-[400px] bg-background border-y border-color-border -mx-4 lg:-mx-8"></div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-3 flex flex-col gap-6 lg:border-l lg:border-color-border/30 lg:pl-8 lg:py-6">
          <div>
            <div className="h-5 w-32 bg-white/10 rounded mb-4"></div>
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-background border border-color-border/50 rounded-xl p-3"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (data && !success)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-bold text-red-400 mb-2">Error Loading Profile</h1>
        <p className="text-color-muted">Failed to fetch creator history.</p>
      </div>
    );
  }

  if (!isLoading && !userProfile && markets.length === 0 && positions.length === 0 && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-background rounded-xl border border-color-border shadow-lg hover:border-white/50 transition-colors">
        <svg className="w-16 h-16 text-color-muted mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
        <p className="text-color-muted max-w-md">This wallet has not registered a profile and has no market activity.</p>
        <Link href="/" className="mt-6 px-6 py-2 bg-color-buy text-[#07090c] font-bold rounded-lg hover:opacity-90 transition-opacity">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-0 pb-12 lg:pb-0 lg:-my-6 lg:min-h-[85vh]">
      {/* Left Sidebar */}
      <div className="lg:col-span-3 flex flex-col gap-6 lg:border-r lg:border-color-border/30 lg:pr-8 lg:py-6">
        <ProfileHeaderCard 
          userProfile={userProfile} 
          address={address} 
          isOwner={isOwner} 
          onEditOpen={() => setIsEditing(true)} 
        />
        
        <PortfolioStatsCard 
          totalValueEth={totalValueEth}
          totalKeys={totalKeys}
          totalPnLWei={totalPnLWei}
          totalPnLEth={totalPnLEth}
          totalFeesSol={totalFeesSol}
          netProfitWei={netProfitWei}
          netProfitEth={netProfitEth}
        />
        
        <MarketsCreatedList markets={markets} />
      </div>

      {/* Middle Column */}
      <div className="lg:col-span-6 flex flex-col gap-6 lg:px-8 lg:py-6">
        <Tabs
          tabs={[
            { id: 'keys', label: 'Keys Owned' },
            { id: 'trades', label: 'Trades' },
          ]}
          activeTab={activeTab}
          onTabChange={(id: string) => setActiveTab(id as any)}
        />

        {activeTab === 'keys' && (
          <TokensHeldTable positions={positions} />
        )}

        {activeTab === 'trades' && (
          <UserTradeHistoryComponent address={address} />
        )}
      </div>

      {/* Right Column (Withdrawals) */}
      <div className="lg:col-span-3 flex flex-col gap-6 lg:border-l lg:border-color-border/30 lg:pl-8 lg:py-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Withdrawals</h2>
            <span className="text-color-muted text-xs font-semibold">{withdrawals.length} total</span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="bg-background border border-color-border rounded-xl p-8 text-center shadow-lg flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-color-border flex items-center justify-center text-color-muted mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <h3 className="text-white font-semibold text-base">No Withdrawals Yet</h3>
              <p className="text-color-muted text-xs">Fees withdrawn from markets will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {withdrawals.map((w: any) => {
                const market = markets.find((m: any) => m.marketId === w.marketId);
                const avatar = market?.avatarUrl || userProfile?.avatarUrl || `https://api.dicebear.com/10.x/${getAvatarStyle(address)}/svg?seed=${address}`;
                const title = market?.twitterHandle ? `@${market.twitterHandle}` : "Fee Claim";
                
                return (
                  <div key={w.id} className="bg-background border border-color-border/50 rounded-xl p-3 shadow-lg hover:border-white/50 transition-colors group flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-color-border bg-[#161A22]">
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{title}</div>
                        <div className="text-[10px] text-color-muted">
                          {new Date(w.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 ml-2 flex flex-col items-end justify-center">
                      <div className="font-bold text-emerald-400 text-sm">
                        +{(w.amount / 1e18).toFixed(4)} ETH
                      </div>
                      <a 
                        href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${w.signature}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center justify-end gap-1 hover:bg-emerald-500/20 transition-colors mt-1 inline-flex"
                      >
                        Success <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-[#1FC782]/20 border border-[#1FC782]/50 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
          <svg className="w-5 h-5 text-[#1FC782]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <EditProfileModal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        userProfile={userProfile} 
        address={address} 
        mutateProfile={mutateProfile} 
        setSuccessMsg={setSuccessMsg} 
      />
    </div>
  );
}
