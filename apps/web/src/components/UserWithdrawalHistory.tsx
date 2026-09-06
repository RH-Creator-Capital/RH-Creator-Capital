"use client";

import React, { useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import Link from 'next/link';

interface UserWithdrawal {
  id: string;
  signature: string;
  marketId: string;
  creatorWallet: string;
  amount: number;
  timestamp: string;
  marketDetails?: {
    twitterHandle: string;
  };
}

export const UserWithdrawalHistoryComponent = ({ address }: { address?: string }) => {
  const { address: publicKey } = useAppKitAccount();
  const targetAddress = address || publicKey;
  const [withdrawals, setWithdrawals] = useState<UserWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!targetAddress) {
      setLoading(false);
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
    
    // Fetch user withdrawals
    fetch(`${API_URL}/api/portfolio/${targetAddress}/withdrawals`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.withdrawals) {
          setWithdrawals(data.withdrawals);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load user withdrawals:", err);
        setError(true);
        setLoading(false);
      });
  }, [targetAddress]);

  if (!targetAddress) return null;

  if (loading) {
    return (
      <div className="overflow-x-auto mt-12 bg-color-card rounded-xl border border-color-border p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Withdrawal History</h2>
        <div className="overflow-x-auto animate-pulse mt-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-color-muted border-b border-color-border">
                <th className="pb-4"><div className="h-4 w-12 bg-white/5 rounded"></div></th>
                <th className="pb-4"><div className="h-4 w-16 bg-white/5 rounded"></div></th>
                <th className="pb-4"><div className="h-4 w-24 bg-white/5 rounded"></div></th>
                <th className="pb-4"><div className="h-4 w-20 bg-white/5 rounded"></div></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-[#1A1F2B]">
                  <td className="py-4"><div className="h-4 w-12 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-10 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-20 bg-white/5 rounded"></div></td>
                  <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-x-auto mt-12 bg-color-card rounded-xl border border-color-border p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Withdrawal History</h2>
        <div className="text-center py-12 text-color-sell">Error loading withdrawal history</div>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="overflow-x-auto mt-12 bg-color-card rounded-xl border border-color-border p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Withdrawal History</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-color-border text-color-muted text-sm uppercase">
              <th className="py-3 font-semibold">Time</th>
              <th className="py-3 font-semibold">Amount (ETH)</th>
              <th className="py-3 font-semibold">Market Address</th>
              <th className="py-3 font-semibold">Transaction</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-color-border flex items-center justify-center text-color-muted mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg">No Withdrawals Yet</h3>
                  <p className="text-color-muted text-sm max-w-sm">
                    Creator fees that you withdraw from your markets will appear here.
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
    <div className="overflow-x-auto mt-12 bg-color-card rounded-xl border border-color-border p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Withdrawal History</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-color-border text-color-muted text-sm uppercase">
            <th className="py-3 font-semibold">Time</th>
            <th className="py-3 font-semibold">Amount (ETH)</th>
            <th className="py-3 font-semibold">Market Address</th>
            <th className="py-3 font-semibold">Transaction</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {withdrawals.map((w: any) => {
            const amountSol = (Number(w.amount) / 1e18).toFixed(4);
            const timeAgo = new Date(w.timestamp).toLocaleTimeString();
            const shortMarket = `${w.marketId.slice(0, 4)}...${w.marketId.slice(-4)}`;
            const marketName = w.marketDetails?.twitterHandle || "Unknown Creator";

            return (
              <tr key={w.signature} className="border-b border-[#1A1F2B] hover:bg-[#161A22] transition-colors">
                <td className="py-3 text-white whitespace-nowrap">{timeAgo}</td>
                <td className="py-3 font-medium text-green-400">+{amountSol}</td>
                <td className="py-3 font-semibold hover:underline">
                  <Link href={`/creator/${w.marketId}`} className="flex flex-col">
                    <span className="text-white text-base">{marketName}</span>
                    <span className="text-color-buy text-xs font-normal mt-0.5">{shortMarket}</span>
                  </Link>
                </td>
                <td className="py-3 text-color-muted">
                  <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${w.signature}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    {w.signature.slice(0, 4)}...{w.signature.slice(-4)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
