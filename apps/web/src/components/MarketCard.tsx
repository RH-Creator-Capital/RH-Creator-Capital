import Link from "next/link";
import { FC } from "react";

export interface Market {
  id: string;
  marketId: string;
  twitterHandle: string;
  supply: number;
  reserveWei: number;
  totalVolumeWei: string;
  currentPriceWei: string;
  marketCapWei: string;
  holderCount: number;
  creatorFeeBps: number;
  username?: string;
  avatarUrl?: string;
  sparkline?: number[];
  ticker?: string;
  websiteUrl?: string;
  telegramUrl?: string;
  description?: string;
  bannerUrl?: string;
  claimed?: boolean;
  createdAt?: string;
  category?: string;
}

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export const MarketCard: FC<{ market: Market }> = ({ market }) => {
  // Convert wei to ETH for display
  const volumeSol = (Number(market.totalVolumeWei) / 1e18).toFixed(2);
  const reserveSol = (market.reserveWei / 1e18).toFixed(2);
  const rawPriceSol = Number(market.currentPriceWei) / 1e18;
  const priceSol = rawPriceSol < 0.0001 && rawPriceSol > 0 
    ? rawPriceSol.toFixed(6) 
    : rawPriceSol.toFixed(4);
  const mcapSol = (Number(market.marketCapWei) / 1e18).toFixed(2);
  const feePercent = (market.creatorFeeBps / 100).toFixed(1);
  const initialLetter = (market.username || market.ticker || "U").charAt(0).toUpperCase();

  return (
    <Link href={`/creator/${market.marketId}`} className="block h-full">
      <div className="bg-background rounded-xl p-5 hover:bg-white/5 transition-colors border border-color-border/50 hover:border-color-border group flex flex-col justify-between h-full shadow-lg relative overflow-hidden">
        
        {market.bannerUrl && (
          <>
            <div 
              className="absolute inset-0 z-0 opacity-30 mix-blend-luminosity group-hover:opacity-50 transition-opacity"
              style={{ 
                backgroundImage: `url(${market.bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        )}

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Header: Avatar, Name, Followers, Action Button */}
          <div className="flex items-start justify-between gap-2 mb-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {market.avatarUrl ? (
                    <img src={market.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    initialLetter
                  )}
                </div>
                {/* X (Twitter) Logo Badge */}
                {market.twitterHandle && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full border border-color-border flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-color-foreground text-base leading-tight truncate">{market.ticker || market.username || "Unknown"}</h3>
                  {market.websiteUrl && (
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(market.websiteUrl, '_blank'); }} className="text-color-muted hover:text-white transition-colors shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    </button>
                  )}
                  {market.telegramUrl && (
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(market.telegramUrl, '_blank'); }} className="text-[#0088cc] hover:text-blue-400 transition-colors shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.62-.2-1.12-.31-1.09-.66.02-.18.27-.36.77-.55 3.02-1.31 5.03-2.18 6.04-2.6.28-.11 3.23-1.33 3.86-1.33.14 0 .45.03.62.17.14.12.18.28.19.4z"></path></svg>
                    </button>
                  )}
                </div>
                <div className="text-color-muted text-xs mt-0.5 truncate">@{market.twitterHandle}</div>
                <div className="flex flex-wrap items-center text-color-muted text-[11px] sm:text-xs mt-1 gap-x-1.5 gap-y-0.5">
                  <div className="flex items-center shrink-0">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                    {market.holderCount || 0} Holders
                  </div>
                  {market.createdAt && (
                    <div className="flex items-center shrink-0 text-color-muted/80">
                      <span className="mr-1.5 opacity-40">•</span>
                      <span>{getRelativeTime(market.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
            {market.claimed === false ? (
              <span className="bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">UNCLAIMED</span>
            ) : (
              <div className="text-color-buy" title="Verified Creator">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M15.616 3.268L12 .186L8.383 3.268l-4.737.378l-.378 4.737L.186 12l3.082 3.617l.378 4.737l4.737.378l3.616 3.082l3.617-3.082l4.737-.378l.378-4.737L23.813 12l-3.082-3.617l-.378-4.737zM11 16.414L6.585 12L8 10.586l3 3l5.5-5.5L17.914 9.5z"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* Main Metric & Sparkline */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="text-color-muted text-xs mb-1">Price (SOL)</div>
            <div className="text-2xl font-bold text-color-foreground">{priceSol}</div>
            <div className="text-color-buy text-xs mt-1">{mcapSol} Market Cap</div>
          </div>
          
          <div className="h-8 w-24 flex items-end">
            {market.sparkline && market.sparkline.length > 0 ? (
              <svg viewBox="0 0 100 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#7CFF6B" // color-buy / Pump Green
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={(market.sparkline.length === 1 ? [market.sparkline[0], market.sparkline[0]] : market.sparkline).map((price, i, arr) => {
                    const min = Math.min(...arr);
                    const max = Math.max(...arr);
                    const range = max - min || 1;
                    const x = (i / (arr.length - 1)) * 100;
                    const y = 32 - ((price - min) / range) * 32;
                    return `${x},${y}`;
                  }).join(" ")}
                />
              </svg>
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30 text-[10px] text-color-muted">
                No recent data
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </Link>
  );
};
