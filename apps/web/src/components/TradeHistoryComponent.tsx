"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Trade {
  signature: string;
  marketId: string;
  traderWallet: string;
  tradeType: string;
  amount: number;
  wei: string;
  feeWei: string;
  timestamp: string;
}

export const TradeHistoryComponent = ({ marketId }: { marketId: string }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial trades
    const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
    fetch(`${API_URL}/api/markets/${marketId}/trades`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.trades) {
          setTrades(data.trades);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load historical trades:", err);
        setLoading(false);
      });

    // Connect WebSocket for live updates
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL as string;
    const WS_URL = baseUrl.endsWith('/ws') ? baseUrl : `${baseUrl}/ws`;
    if (!WS_URL || WS_URL === "/ws") return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      // Subscribe to the market trades
      ws.send(JSON.stringify({ type: "subscribe", marketId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "trade" && msg.data && msg.data.marketId === marketId) {
          setTrades(prev => [msg.data, ...prev].slice(0, 50));
        }
      } catch (e) {
        console.error("Failed to process websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [marketId]);

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left border-collapse">
          <thead>
            <tr className="border-b border-color-border text-color-muted text-sm uppercase">
              <th className="py-3 font-semibold">Type</th>
              <th className="py-3 font-semibold">Amount (KEYS)</th>
              <th className="py-3 font-semibold">Amount (SOL)</th>
              <th className="py-3 font-semibold">Trader</th>
              <th className="py-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-color-border">
                <td className="py-4"><div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div></td>
                <td className="py-4"><div className="h-4 w-8 bg-white/5 rounded animate-pulse"></div></td>
                <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded animate-pulse"></div></td>
                <td className="py-4"><div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div></td>
                <td className="py-4"><div className="h-4 w-20 bg-white/5 rounded animate-pulse"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left border-collapse">
          <thead>
            <tr className="border-b border-color-border text-color-muted text-sm uppercase">
              <th className="py-3 font-semibold">Type</th>
              <th className="py-3 font-semibold">Amount (KEYS)</th>
              <th className="py-3 font-semibold">Amount (SOL)</th>
              <th className="py-3 font-semibold">Trader</th>
              <th className="py-3 font-semibold">Time</th>
              <th className="py-3 font-semibold">Transaction</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-color-border flex items-center justify-center text-color-muted mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg">No Trades Yet</h3>
                  <p className="text-color-muted text-sm max-w-sm">
                    Be the first to trade! Keys are available to buy from the bonding curve.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left border-collapse">
        <thead>
          <tr className="border-b border-color-border text-color-muted text-sm uppercase">
            <th className="py-3 font-semibold">Type</th>
            <th className="py-3 font-semibold">Amount (KEYS)</th>
            <th className="py-3 font-semibold">Amount (SOL)</th>
            <th className="py-3 font-semibold">Trader</th>
            <th className="py-3 font-semibold">Time</th>
            <th className="py-3 font-semibold">Transaction</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {trades.map((trade) => {
            const isBuy = trade.tradeType === "buy";
            const rawEth = Number(trade.wei) / 1e18;
            const amountSol = rawEth < 0.0001 && rawEth > 0
              ? rawEth.toFixed(6)
              : rawEth.toFixed(4);
            const timeAgo = new Date(trade.timestamp).toLocaleTimeString();
            const shortWallet = `${trade.traderWallet.slice(0, 4)}...${trade.traderWallet.slice(-4)}`;

            return (
              <tr key={trade.signature} className="border-b border-color-border hover:bg-white/5 transition-colors">
                <td className={`py-3 font-semibold ${isBuy ? 'text-color-buy' : 'text-color-sell'}`}>
                  {isBuy ? 'BUY' : 'SELL'}
                </td>
                <td className="py-3 text-white font-medium">{trade.amount}</td>
                <td className="py-3 text-white font-medium">{amountSol}</td>
                <td className="py-3 text-color-muted font-mono">
                  <Link href={`/profile/${trade.traderWallet}`} className="hover:text-white hover:text-color-buy transition-colors">
                    {shortWallet}
                  </Link>
                </td>
                <td className="py-3 text-color-muted whitespace-nowrap">
                  {timeAgo}
                </td>
                <td className="py-3 text-color-muted">
                  {trade.signature ? (
                    <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${trade.signature}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {trade.signature.slice(0, 4)}...{trade.signature.slice(-4)}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
