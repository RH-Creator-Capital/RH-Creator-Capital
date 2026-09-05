import React from 'react';
import Link from 'next/link';
import { ClaimBadge } from '@/components/ClaimBadge';

interface MarketsCreatedListProps {
  markets: any[];
}

export const MarketsCreatedList: React.FC<MarketsCreatedListProps> = ({ markets }) => {
  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">Markets Created</h2>
        <span className="text-color-muted text-xs font-semibold">{markets.length} total</span>
      </div>
      
      {markets.length === 0 ? (
        <div className="bg-background border border-color-border rounded-xl p-6 text-center shadow-lg hover:border-color-buy/50 transition-colors group text-sm">
          <p className="text-color-muted">No markets launched.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {markets.map((market: any) => (
            <div key={market.marketId} className="bg-background border border-color-border rounded-xl p-4 shadow-lg hover:border-color-buy/50 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#161A22] border border-color-border overflow-hidden shrink-0">
                    {market.avatarUrl ? (
                      <img src={market.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-indigo-600">
                        {market.twitterHandle.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">@{market.twitterHandle}</h3>
                    <p className="text-xs text-color-muted truncate">{market.ticker || market.twitterHandle}</p>
                  </div>
                </div>
                
                {market.claimed !== undefined && (
                  <ClaimBadge claimed={market.claimed} size="sm" />
                )}
              </div>
              
              <div className="flex justify-between text-xs text-color-muted mb-3">
                <span>{new Date(market.createdAt).toLocaleDateString()}</span>
                <span className="font-mono">{market.marketId.slice(0,4)}...{market.marketId.slice(-4)}</span>
              </div>
              
              <Link 
                href={`/creator/${market.marketId}`}
                className="block w-full text-center bg-white/5 hover:bg-color-buy border border-color-border hover:border-color-buy text-white hover:text-black text-xs font-semibold py-1.5 rounded-lg transition-all"
              >
                View Market
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
