"use client";

import React, { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";

interface UserTrade {
  txHash: string;
  marketId: string;
  traderWallet: string;
  tradeType: string;
  amount: number;
  wei: string;
  feeWei: string;
  timestamp: string;
}

export const UserTradeHistoryComponent = ({ address }: { address?: string }) => {
  const { address: publicKey } = useAppKitAccount();
  const targetAddress = address || publicKey;
  const [trades, setTrades] = useState<UserTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
    
    // Fetch user trades
    fetch(`${API_URL}/api/portfolio/${targetAddress}/trades`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.trades) {
          setTrades(data.trades);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch trades:", err);
        setError(true);
        setLoading(false);
      });
  }, [targetAddress]);

  if (!targetAddress) return null;

  if (loading) {
    return (
      <section className="bg-background border-y border-color-border py-6 shadow-lg transition-colors group overflow-x-auto -mx-4 lg:-mx-8">
        <div className="overflow-x-auto animate-pulse">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="text-color-muted border-b border-color-border">
                <th className="pb-4 pl-4 lg:pl-8 font-medium"><div className="h-4 w-12 bg-white/5 rounded"></div></th>
                <th className="pb-4 font-medium"><div className="h-4 w-16 bg-white/5 rounded"></div></th>
                <th className="pb-4 font-medium"><div className="h-4 w-20 bg-white/5 rounded"></div></th>
                <th className="pb-4 font-medium"><div className="h-4 w-24 bg-white/5 rounded"></div></th>
                <th className="pb-4 font-medium"><div className="h-4 w-16 bg-white/5 rounded"></div></th>
                <th className="pb-4 pr-4 lg:pr-8 font-medium"><div className="h-4 w-20 bg-white/5 rounded"></div></th>
              </tr>
            </thead>
            <tbody className="text-white">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-color-border/50">
                  <td className="py-4 pl-4 lg:pl-8"><div className="h-4 w-10 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-12 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-24 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded"></div></td>
                  <td className="py-4 pr-4 lg:pr-8"><div className="h-4 w-20 bg-white/5 rounded"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-background border border-color-border p-6 rounded-xl shadow-lg hover:border-white/50 transition-colors group">
        <div className="text-center py-12 text-color-sell">Error loading trade history</div>
      </section>
    );
  }

  if (trades.length === 0) {
    return (
      <section className="bg-background border-y border-color-border py-6 shadow-lg transition-colors group overflow-x-auto -mx-4 lg:-mx-8">
        <div className="text-center py-12 px-4 text-color-muted">No trades found. <br/><a href="/" className="text-color-buy hover:underline mt-2 inline-block">Explore Markets</a></div>
      </section>
    );
  }

  return (
    <section className="bg-background border-y border-color-border py-6 shadow-lg transition-colors group overflow-x-auto -mx-4 lg:-mx-8">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead>
            <tr className="text-color-muted border-b border-color-border">
              <th className="pb-4 pl-4 lg:pl-8 font-medium">Type</th>
              <th className="pb-4 font-medium">Keys</th>
              <th className="pb-4 font-medium">SOL</th>
              <th className="pb-4 font-medium">Market</th>
              <th className="pb-4 font-medium">Time</th>
              <th className="pb-4 pr-4 lg:pr-8 font-medium">Transaction</th>
            </tr>
          </thead>
          <tbody className="text-white">
          {trades.map((trade: any) => {
            const isBuy = trade.tradeType === "buy";
            const rawAmountSol = Number(trade.wei) / 1e18;
            const amountSol = rawAmountSol < 0.0001 && rawAmountSol > 0 ? rawAmountSol.toFixed(6) : rawAmountSol.toFixed(4);
            const timeAgo = new Date(trade.timestamp).toLocaleTimeString();
            const shortMarket = `${trade.marketId.slice(0, 4)}...${trade.marketId.slice(-4)}`;
            const marketName = trade.marketDetails?.twitterHandle || "Unknown Creator";
            const avatarUrl = trade.marketDetails?.avatarUrl || `https://api.dicebear.com/10.x/bottts/svg?seed=${trade.marketId}`;

            return (
              <tr key={trade.txHash} className="border-b border-color-border/50 hover:bg-white/5 transition-colors">
                <td className={`py-3 pl-4 lg:pl-8 font-medium ${isBuy ? 'text-color-buy' : 'text-color-sell'}`}>
                  {isBuy ? 'BUY' : 'SELL'}
                </td>
                <td className="py-3 text-white">{trade.amount}</td>
                <td className="py-3 text-white">{amountSol}</td>
                <td className="py-3 font-semibold hover:underline">
                  <a href={`/creator/${trade.marketId}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-color-border/50 bg-[#161A22]">
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-white text-base truncate">{marketName}</span>
                      <span className="text-color-buy text-xs font-normal mt-0.5 truncate">{shortMarket}</span>
                    </div>
                  </a>
                </td>
                <td className="py-3 text-color-muted whitespace-nowrap">
                  {timeAgo}
                </td>
                <td className="py-3 pr-4 lg:pr-8 text-color-muted">
                  <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    {trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </a>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
