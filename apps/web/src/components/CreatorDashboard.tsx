"use client";

import React, { useEffect, useState } from "react";
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import { useCreatorCapital } from "../hooks/useCreatorCapital";

import toast from "react-hot-toast";


import dynamic from "next/dynamic";
const WalletMultiButton = ({ className }: { className?: string }) => {
    const { open } = useAppKit();
    return <button onClick={() => open()} className={className}>Connect Wallet</button>;
  };

interface CreatorDashboardProps {
  marketId: string;
  creatorWallet: string;
  claimed: boolean;
  twitterHandle: string;
}

export const CreatorDashboard = ({ marketId, creatorWallet, claimed, twitterHandle }: CreatorDashboardProps) => {
  const { address: publicKey } = useAppKitAccount();
  const { signMessageAsync: signMessage } = useSignMessage();
  
  const sdk = useCreatorCapital();
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<{ totalVolumeWei: string, holderCount: number } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [linkedHandle, setLinkedHandle] = useState<string | null>(null);

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawModalStatus, setWithdrawModalStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [withdrawModalMessage, setWithdrawModalMessage] = useState('');
  const [withdrawModalSignature, setWithdrawModalSignature] = useState('');

  // Check if connected wallet is the creator (for claimed markets)
  const isCreator = publicKey === creatorWallet;

  // For unclaimed markets, check if the connected user's linked Twitter matches the market's twitterHandle
  const isUnclaimedOwner = !claimed && linkedHandle && twitterHandle && linkedHandle.toLowerCase() === twitterHandle.toLowerCase();

  // Should show the dashboard at all?
  const shouldShow = isCreator || !claimed;

  // Check linked Twitter handle from OAuth Token
  useEffect(() => {
    if (!publicKey || claimed) return;
    
    const checkLinkedHandle = () => {
      const oauthToken = localStorage.getItem("oauthToken");
      if (!oauthToken) {
        setLinkedHandle(null);
        return;
      }

      try {
        // Decode JWT payload
        const payload = JSON.parse(atob(oauthToken.split('.')[1]));
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setLinkedHandle(payload.twitterHandle);
        } else {
          // Token expired
          localStorage.removeItem("oauthToken");
          setLinkedHandle(null);
        }
      } catch (e) {
        setLinkedHandle(null);
      }
    };
    
    checkLinkedHandle();
    
    // Periodically check in case it expires
    const interval = setInterval(checkLinkedHandle, 60000);
    return () => clearInterval(interval);
  }, [publicKey, claimed]);

  useEffect(() => {
    const handleOAuthUpdated = () => {
      // Just re-check token since TopNav handled the API calls and toasts
      const oauthToken = localStorage.getItem("oauthToken");
      if (oauthToken) {
        try {
          const payload = JSON.parse(atob(oauthToken.split('.')[1]));
          if (payload.exp && payload.exp * 1000 > Date.now()) {
            setLinkedHandle(payload.twitterHandle);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    
    window.addEventListener("oauth_updated", handleOAuthUpdated);
    return () => window.removeEventListener("oauth_updated", handleOAuthUpdated);
  }, []);

  useEffect(() => {
    if (!shouldShow || !sdk) return;

    const fetchDashboardData = async () => {
      try {
        const address = marketId;
        const feeVaultPda = sdk.getMarketId("some_twitter_handle_fallback");
        
        // Fetch vault balance directly from chain (or fallback to 0 for now since we removed connection)
        const balance = 0;
        setVaultBalance(balance);

        // Fetch analytics and withdrawals from API
        const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
        
        const [resAnalytics, resWithdrawals] = await Promise.all([
          fetch(`${API_URL}/api/markets/${marketId}/analytics`),
          fetch(`${API_URL}/api/markets/${marketId}/withdrawals`)
        ]);
        
        const dataAnalytics = await resAnalytics.json();
        if (dataAnalytics.success && dataAnalytics.analytics) {
          setAnalytics(dataAnalytics.analytics);
        }

        const dataWithdrawals = await resWithdrawals.json();
        if (dataWithdrawals.success && dataWithdrawals.withdrawals) {
          setWithdrawals(dataWithdrawals.withdrawals);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };

    fetchDashboardData();
    // Set up an interval to poll for updates
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, marketId]);

  if (!shouldShow) return null;

  const handleWithdraw = async () => {
    if (!sdk) return;
    
    try {
      setIsWithdrawing(true);
      setWithdrawModalStatus('loading');
      setWithdrawModalMessage('Requesting withdrawal from wallet...');
      setWithdrawModalSignature('');
      setShowWithdrawModal(true);
      
      const marketState = await sdk.getMarketState(marketId);
      const creatorId = marketState?.xUserId;

      setWithdrawModalMessage('Withdrawing fees... Please approve in your wallet.');
      const signature = await sdk.claimCreatorRewards(creatorId);
      
      // Success
      setWithdrawModalStatus('success');
      setWithdrawModalMessage('Fees withdrawn successfully!');
      setWithdrawModalSignature(signature);
      
      // Optimistically update balance
      setVaultBalance(0);

      // Dual-write fallback: record withdrawal via API in case webhook is delayed/missing
      const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
      try {
        await fetch(`${API_URL}/api/markets/${marketId}/record-withdrawal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature })
        });
      } catch (recordErr) {
        console.warn("Failed to record withdrawal via API (webhook may still capture it):", recordErr);
      }

      // Refresh withdrawal history after a short delay to reflect the new entry
      setTimeout(async () => {
        try {
          const res = await fetch(`${API_URL}/api/markets/${marketId}/withdrawals`);
          const data = await res.json();
          if (data.success && data.withdrawals) {
            setWithdrawals(data.withdrawals);
          }
        } catch (e) {
          console.warn("Failed to refresh withdrawal history:", e);
        }
      }, 2000);
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "Failed to withdraw fees";
      if (errorMsg.includes("User rejected") || errorMsg.includes("cancelled")) {
        errorMsg = "Transaction was cancelled by user.";
      }
      setWithdrawModalStatus('error');
      setWithdrawModalMessage(errorMsg);
      setWithdrawModalSignature('');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleTwitterLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const redirectUrl = encodeURIComponent(window.location.origin + window.location.pathname + "?popup=true");

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      `${apiUrl}/api/oauth/twitter/login?redirect_to=${redirectUrl}`,
      `TwitterLogin_${Date.now()}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`
    );
  };

  const handleDisconnectX = () => {
    localStorage.removeItem("oauthToken");
    setLinkedHandle(null);
  };

  const copyWithdrawSignature = () => {
    if (withdrawModalSignature) {
      navigator.clipboard.writeText(withdrawModalSignature);
      const prevMsg = withdrawModalMessage;
      setWithdrawModalMessage('Signature copied to clipboard!');
      setTimeout(() => setWithdrawModalMessage(prevMsg), 2000);
    }
  };

  const handleClaimMarket = async () => {
    if (!sdk || !publicKey || !signMessage) return;

    if (!linkedHandle) {
      toast.error("Please connect your X (Twitter) account first to claim this market.");
      return;
    }

    if (linkedHandle.toLowerCase() !== twitterHandle.toLowerCase()) {
      toast.error(`Your connected X account (@${linkedHandle}) does not match the market creator (@${twitterHandle}).`);
      return;
    }

    const oauthToken = localStorage.getItem("oauthToken");
    if (!oauthToken) {
      toast.error("Twitter session expired. Please reconnect your X account.");
      return;
    }

    let loadingId: string | undefined;

    try {
      setIsClaiming(true);
      loadingId = toast.loading("Checking on-chain status...");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;

      // Pre-check: verify on-chain if market is already claimed
      const onChainState = await sdk.getMarketState(marketId);
      if (onChainState?.claimed) {
        toast.loading("Market already claimed on-chain! Syncing database...", { id: loadingId });
        try {
          await fetch(`${apiUrl}/api/markets/${marketId}/sync`, { method: "POST" });
        } catch (e) {
          console.error("Sync failed:", e);
        }
        toast.success("Database synced! Reloading...", { id: loadingId });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      toast.loading("Authenticating wallet...", { id: loadingId });

      // Step 1: Get or reuse wallet token
      let walletToken = localStorage.getItem("walletToken");
      if (!walletToken) {
        // Challenge → Sign → Verify
        const challengeRes = await fetch(`${apiUrl}/api/auth/challenge?wallet=${publicKey}`);
        const challengeData = await challengeRes.json();
        if (!challengeData.success) throw new Error(challengeData.error || "Failed to get challenge");

        toast.loading("Please sign the message in your wallet...", { id: loadingId });
        const signature = await signMessage({ message: challengeData.message });

        const verifyRes = await fetch(`${apiUrl}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey,
            message: challengeData.message,
            signature: signature
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) throw new Error(verifyData.error || "Failed to verify");
        walletToken = verifyData.token;
        localStorage.setItem("walletToken", walletToken!);
      }

      // Step 2: Request claim signature from backend
      toast.loading("Requesting claim signature from server...", { id: loadingId });
      const sigRes = await fetch(`${apiUrl}/api/auth/claim-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${walletToken}`
        },
        body: JSON.stringify({ marketId, oauthToken })
      });

      const sigData = await sigRes.json();
      if (!sigData.success) throw new Error(sigData.error || "Failed to fetch claim signature");

      // Step 3: Build and send claim transaction
      toast.loading("Approve claim transaction in wallet...", { id: loadingId });

      const marketState = await sdk.getMarketState(marketId);

      
      const claimTxSig = await sdk.claimMarket(marketId, twitterHandle, sigData.deadline || Math.floor(Date.now()/1000) + 3600, sigData.signature);

      // Step 4: Sync to backend with claim TX signature
      try {
        await fetch(`${apiUrl}/api/markets/${marketId}/sync`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            claimTxSignature: typeof claimTxSig === 'string' ? claimTxSig : undefined,
            creatorWallet: publicKey
          })
        });
      } catch (e) {
        console.error("Failed to sync after claim:", e);
      }

      toast.success("Market claimed successfully! You are now the verified creator.", { id: loadingId });
      
      // Reload after a short delay to reflect changes
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error("Claim error:", err);
      let msg = err.message || "Failed to claim market";
      if (msg.includes("User rejected") || msg.includes("cancelled")) {
        msg = "Transaction was cancelled by user.";
      }
      if (typeof loadingId !== 'undefined') {
        toast.error(msg, { id: loadingId });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const formattedBalance = vaultBalance !== null ? (vaultBalance / 1e18).toFixed(4) : "...";
  const formattedVolume = analytics ? (Number(analytics.totalVolumeWei) / 1e18).toFixed(4) : "...";
  const holderCount = analytics ? analytics.holderCount : "...";

  // === UNCLAIMED MARKET UI ===
  if (!claimed) {
    return (
      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-6 rounded-xl shadow-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
              Unclaimed Market
            </h2>
            <p className="text-amber-200/70 text-sm mt-1">This market was created for your X account but hasn't been claimed yet. Claim it to become the verified creator.</p>
          </div>
        </div>

        <div className="bg-[#07090c]/50 rounded-lg p-4 border border-amber-500/20 mb-4">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-amber-500/10">
                <td className="py-2 text-amber-200/70">Market Address</td>
                <td className="py-2 text-white font-mono text-xs text-right">{marketId.slice(0, 8)}...{marketId.slice(-8)}</td>
              </tr>
              <tr className="border-b border-amber-500/10">
                <td className="py-2 text-amber-200/70">Twitter Handle</td>
                <td className="py-2 text-white text-right">@{twitterHandle}</td>
              </tr>
              <tr className="border-b border-amber-500/10">
                <td className="py-2 text-amber-200/70">Status</td>
                <td className="py-2 text-right"><span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>PENDING CLAIM</span></td>
              </tr>
              <tr>
                <td className="py-2 text-amber-200/70">Creator Wallet</td>
                <td className="py-2 text-amber-400/60 italic text-xs text-right">Not set (will be your wallet)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {!publicKey ? (
          <WalletMultiButton className="!w-full !justify-center !bg-white hover:!opacity-90 !text-[#07090c] !px-6 !py-3 !rounded-lg !font-bold !shadow-lg !transition-all" />
        ) : !linkedHandle ? (
          <button
            onClick={handleTwitterLogin}
            className="w-full bg-white hover:opacity-90 text-[#07090c] px-6 py-3 rounded-lg font-bold shadow-lg shadow-white/20 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Connect X (Twitter)
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={`text-xs px-4 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 ${linkedHandle.toLowerCase() === twitterHandle.toLowerCase() ? 'bg-white/5 border-white/10 text-white/90' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <div className="flex items-center gap-2">
                <span>Connected to X as <strong>@{linkedHandle}</strong></span>
                <button 
                  onClick={handleDisconnectX}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-wider"
                  title="Disconnect X account"
                >
                  Unlink
                </button>
              </div>
              {linkedHandle.toLowerCase() !== twitterHandle.toLowerCase() && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <span className="text-red-300/80">Does not match market creator (@{twitterHandle}).</span>
                  <button 
                    onClick={handleTwitterLogin} 
                    className="px-4 py-2 bg-white hover:opacity-90 text-[#07090c] rounded-lg font-semibold transition-all flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Switch X Account
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClaimMarket}
              disabled={isClaiming || linkedHandle.toLowerCase() !== twitterHandle.toLowerCase()}
              className="w-full bg-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-[#07090c] px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isClaiming ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                "Claim Ownership"
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // === CLAIMED MARKET UI (original Creator Dashboard) ===
  return (
    <div className="flex flex-col gap-4 text-sm mt-2">
      <div className="flex justify-between border-b border-color-border/50 pb-3">
        <span className="text-color-muted">Accumulated Fees</span>
        <span className="font-semibold text-emerald-400">{formattedBalance} ETH</span>
      </div>
      <div className="flex justify-between border-b border-color-border/50 pb-3">
        <span className="text-color-muted">Total Volume</span>
        <span className="font-semibold text-white">{formattedVolume} ETH</span>
      </div>
      <div className="flex justify-between border-b border-color-border/50 pb-3">
        <span className="text-color-muted">Unique Holders</span>
        <span className="font-semibold text-white">{holderCount}</span>
      </div>
      
      <div className="mt-2">
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || vaultBalance === 0 || vaultBalance === null}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
        >
          {isWithdrawing ? "Withdrawing..." : "Withdraw Fees"}
        </button>
      </div>

      {withdrawals.length > 0 && (
        <div className="mt-2 pt-4 border-t border-color-border/30">
          <div className="text-color-muted text-xs font-semibold uppercase mb-3">Withdrawal History</div>
          <div className="flex flex-col gap-3">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex justify-between text-xs items-center">
                <span className="text-gray-400">{new Date(w.timestamp).toLocaleDateString()}</span>
                <span className="text-emerald-400 font-medium">+{Number(w.amount / 1e18).toFixed(4)}</span>
                <a 
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${w.signature}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Tx <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw Result Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07090c]/80 backdrop-blur-sm px-4">
          <div className="bg-background border border-color-border p-6 rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
              withdrawModalStatus === 'error' 
                ? 'from-red-500 to-orange-500' 
                : withdrawModalStatus === 'success' 
                  ? 'from-emerald-500 to-cyan-500' 
                  : 'from-indigo-500 to-purple-500'
            } opacity-70`} />
            
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                withdrawModalStatus === 'error' 
                  ? 'bg-red-500/20 text-red-400' 
                  : withdrawModalStatus === 'success' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {withdrawModalStatus === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                ) : withdrawModalStatus === 'loading' ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {withdrawModalStatus === 'error' ? 'Withdrawal Failed' : withdrawModalStatus === 'success' ? 'Withdrawal Success' : 'Processing Withdrawal'}
              </h3>
            </div>

            <p className="text-color-muted text-sm mb-4 pl-11 break-all">{withdrawModalMessage}</p>

            {withdrawModalSignature && (
              <div className="ml-11 mb-6 flex items-center gap-2">
                <span className="text-color-foreground font-mono text-xs break-all flex-1">{withdrawModalSignature}</span>
                <a 
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${withdrawModalSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on Blockscout"
                  className="p-2 bg-[#161A22] border border-color-border rounded-lg text-white hover:text-emerald-400 transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
                <button
                  onClick={copyWithdrawSignature}
                  title="Copy Signature"
                  className="p-2 bg-[#161A22] border border-color-border rounded-lg text-white hover:text-emerald-400 transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                </button>
              </div>
            )}

            {withdrawModalStatus !== 'loading' && (
              <button 
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawModalSignature('');
                }} 
                className="w-full bg-[#161A22] border border-color-border text-white py-2.5 rounded-lg hover:bg-white/10 transition-colors font-semibold mt-2"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
