"use client";

import { FC, useState, useEffect } from "react";
import { useSocialCapital } from "../hooks/useSocialCapital";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage } from "wagmi";
import { mutate } from "swr";
import toast from "react-hot-toast";

const K_CONSTANT = 100_000; // 0.0001 ETH in wei

export const TradingWidget: FC<{ marketId: string, twitterHandle?: string }> = ({ marketId, twitterHandle }) => {
  const sdk = useSocialCapital();
  const { address: publicKey } = useAppKitAccount();
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSignature, setModalSignature] = useState("");
  
  // Dynamic Market State
  const [supply, setSupply] = useState(0);
  const [keyBalance, setKeyBalance] = useState(0);
  const [loadingMarket, setLoadingMarket] = useState(true);

  // Fetch initial market state and setup websocket
  useEffect(() => {
    let ws: WebSocket;
    
    const fetchState = async () => {
      if (!sdk || !twitterHandle) return;
      try {
        const textBytes = new TextEncoder().encode(twitterHandle);
        const creatorIdArray = new Array(32).fill(0);
        for (let i = 0; i < textBytes.length && i < 32; i++) {
          creatorIdArray[i] = textBytes[i];
        }
        const creatorIdUint8 = marketId;
        
        // Fetch on-chain market supply
        const marketState = await sdk.getMarketState(creatorIdUint8);
        setSupply(Number(marketState?.supply || 0));
        
        // Fetch user balance if connected
        if (publicKey) {
          try {
            const pos = await sdk.getUserPosition(creatorIdUint8, publicKey);
            setKeyBalance(Number(pos?.keys || 0));
          } catch (e) {
            setKeyBalance(0); // Position doesn't exist yet
          }
        }
      } catch (e) {
        console.error("Failed to fetch state:", e);
      } finally {
        setLoadingMarket(false);
      }
    };
    
    fetchState();
    
    // Setup WebSocket for realtime updates
    if (marketId) {
      ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "subscribe", channel: `market:${marketId}` }));
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "trade") {
            // Refetch state or incrementally update
            fetchState();
          }
        } catch (e) {}
      };
    }
    
    return () => {
      if (ws) ws.close();
    };
  }, [sdk, twitterHandle, publicKey, marketId]);

  // Bonding Curve Math
  const calculateBuyCost = (currentSupply: number, buyAmount: number) => {
    if (buyAmount === 0) return 0;
    const s1 = BigInt(currentSupply);
    const s2 = BigInt(currentSupply + buyAmount);
    const cost = (BigInt(K_CONSTANT) * ((s2 ** BigInt(3)) - (s1 ** BigInt(3)))) / BigInt(3);
    return Number(cost) / 1e18; // Convert wei to ETH
  };

  const calculateSellReturn = (currentSupply: number, sellAmount: number) => {
    if (sellAmount === 0 || currentSupply < sellAmount) return 0;
    const s2 = BigInt(currentSupply);
    const s1 = BigInt(currentSupply - sellAmount);
    const ret = (BigInt(K_CONSTANT) * ((s2 ** BigInt(3)) - (s1 ** BigInt(3)))) / BigInt(3);
    return Number(ret) / 1e18;
  };

  const parsedAmount = parseInt(amount) || 0;
  
  let solValue = 0;
  if (tradeType === "buy") {
    solValue = calculateBuyCost(supply, parsedAmount);
  } else {
    solValue = calculateSellReturn(supply, parsedAmount);
  }
  
  const totalFee = solValue * 0.0125; // 1.25% Total Fee
  const creatorFee = totalFee * 0.95; // 95% of the fee goes to creator
  const protocolFee = totalFee * 0.05; // 5% of the fee goes to protocol buyback vault
  
  const totalEth = tradeType === "buy" 
    ? solValue + totalFee 
    : solValue - totalFee;

  const handleTrade = async () => {
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!twitterHandle) {
      setModalMessage("Error: Market handle not found.");
      setModalSignature("");
      setShowModal(true);
      return;
    }
    if (!publicKey) {
      setModalMessage("Error: Wallet not connected.");
      setModalSignature("");
      setShowModal(true);
      return;
    }
    
    if (tradeType === "sell" && parsedAmount > keyBalance) {
      toast.error("Insufficient key balance.");
      return;
    }
    
    const loadingToastId = toast.loading(`Processing ${tradeType.toUpperCase()} order for ${parsedAmount} keys...`);
    
    try {
      
      // amountBN was removed
      
      const textBytes = new TextEncoder().encode(twitterHandle);
      const creatorIdArray = new Array(32).fill(0);
      for (let i = 0; i < textBytes.length && i < 32; i++) {
        creatorIdArray[i] = textBytes[i];
      }
      const creatorIdUint8 = marketId;
      
      let sig;
      if (tradeType === "buy") {
        // Allow 20% slippage on total ETH cost (since bonding curve moves)
        const maxEthCostWei = Math.floor(totalEth * 1e18 * 1.20);
        const maxEthCostBN = BigInt(maxEthCostWei);
        sig = await sdk.buyKeys(creatorIdUint8, parsedAmount, maxEthCostBN);
      } else {
        // Allow 20% slippage on min ETH return
        const minEthOutputWei = Math.floor(totalEth * 1e18 * 0.80);
        const minEthOutputBN = BigInt(minEthOutputWei);
        sig = await sdk.sellKeys(creatorIdUint8, parsedAmount, minEthOutputBN);
      }
      
      toast.success("Order Success!", { id: loadingToastId });
      setModalSignature(sig);
      setModalMessage(`Successfully ${tradeType === "buy" ? "bought" : "sold"} ${parsedAmount} keys!`);
      setShowModal(true);
      setAmount("");
      
      // The websocket should pick up the trade and update state automatically
      // However, we manually fetch just in case the backend webhook isn't running locally yet
      try {
        if (typeof sig === 'string') {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhook/sync-tx`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signature: sig })
          });
        }
        
        const marketState = await sdk.getMarketState(creatorIdUint8);
        setSupply(Number(marketState?.supply || 0));
        if (publicKey) {
          const pos = await sdk.getUserPosition(creatorIdUint8, publicKey);
          setKeyBalance(Number(pos?.keys || 0));
        }
        // Force SWR to re-fetch global market stats so the parent page (MCAP/Reserve) updates instantly
        mutate(`${process.env.NEXT_PUBLIC_API_URL}/api/markets`);
      } catch (fetchErr) {
        console.error("Failed to sync balance post-trade:", fetchErr);
      }
    } catch (err: any) {
      console.error("Transaction Error:", err);
      if (err.logs) console.error("Logs:", err.logs);
      
      let cleanMessage = "Transaction failed. Please try again.";
      if (err.message) {
        if (err.message.includes("User rejected") || err.message.includes("cancelled")) {
          cleanMessage = "Transaction was cancelled by user.";
        } else if (err.message.includes("Blockhash not found")) {
          cleanMessage = "Transaction expired (Blockhash not found). Please approve the prompt in your wallet faster.";
        } else if (err.message.includes("Simulation failed")) {
          cleanMessage = "Transaction simulation failed. Check console for details.";
        } else {
          cleanMessage = err.message.length > 100 ? "Transaction failed. Check console for details." : err.message;
        }
      }
      
      toast.error(cleanMessage, { id: loadingToastId });
    }
  };

  const copyToClipboard = () => {
    if (modalSignature) {
      navigator.clipboard.writeText(modalSignature);
      setModalMessage("Signature copied to clipboard!");
      setTimeout(() => setModalMessage("Order Success!"), 2000);
    }
  };

  return (
    <>
      <div className="bg-background rounded-xl p-6 border border-color-border shadow-lg relative hover:border-color-buy/50 transition-colors group">
        {/* Toggle Buttons */}
        <div className="flex gap-1.5 mb-5 bg-[#07090c] p-1.5 rounded-lg border border-color-border">
          <button
            className={`flex-1 py-1.5 text-center font-semibold text-sm rounded-md transition-all ${
              tradeType === "buy" 
                ? "bg-color-buy text-[#07090c] shadow-sm" 
                : "text-color-muted hover:text-white"
            }`}
            onClick={() => setTradeType("buy")}
          >
            Buy
          </button>
          <button
            className={`flex-1 py-1.5 text-center font-semibold text-sm rounded-md transition-all ${
              tradeType === "sell" 
                ? "bg-color-sell text-white shadow-sm" 
                : "text-color-muted hover:text-white"
            }`}
            onClick={() => setTradeType("sell")}
          >
            Sell
          </button>
        </div>

        {/* Input Section */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-color-muted uppercase tracking-wide">
              Amount (KEYS)
            </label>
            {publicKey && (
              <button 
                onClick={() => setAmount(keyBalance.toString())}
                className="text-[11px] font-semibold text-color-muted hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                title="Click to max"
              >
                Balance: <span className="text-white">{keyBalance}</span> KEYS
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#07090c] border border-color-border rounded-lg p-3 text-2xl font-bold text-white focus:outline-none focus:border-color-buy focus:ring-1 focus:ring-color-buy transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-color-muted font-bold text-xs">KEYS</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[1, 5, 10, 15].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="flex-1 py-1 text-xs font-semibold rounded bg-[#07090c] border border-color-border text-color-muted hover:text-white hover:border-color-buy/50 transition-colors"
              >
                {val} {val === 1 ? 'KEY' : 'KEYS'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="p-3 bg-[#07090c] rounded-lg border border-color-border text-xs flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-color-muted font-medium">Base Cost/Return</span>
              <span className="font-semibold text-white">{parsedAmount > 0 ? solValue.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 9 }) : "--"} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-color-muted">Creator Reward (95% of Fee)</span>
              <span className="text-color-foreground">{parsedAmount > 0 ? creatorFee.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 9 }) : "--"} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-color-muted">Protocol Buyback (5% of Fee)</span>
              <span className="text-color-foreground">{parsedAmount > 0 ? protocolFee.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 9 }) : "--"} ETH</span>
            </div>
            <div className="border-t border-color-border pt-3 mt-1 flex justify-between font-semibold">
              <span className="text-white">Total {tradeType === "buy" ? "Cost" : "Return"}</span>
              <span className="text-white">{parsedAmount > 0 ? totalEth.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 9 }) : "--"} ETH</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-color-muted text-left px-2 flex items-start gap-1.5 opacity-80">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>All fees are precisely calculated in Wei (9 decimals) on the blockchain.</span>
          </div>
        </div>

        <button
          onClick={handleTrade}
          disabled={loadingMarket}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${
            tradeType === "buy" 
              ? "bg-color-buy text-[#07090c] hover:bg-opacity-90 shadow-color-buy/10" 
              : "bg-color-sell text-white hover:bg-opacity-90 shadow-color-sell/10"
          } disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide`}
        >
          {loadingMarket ? "Loading Market..." : (tradeType === "buy" ? "Place Buy Order" : "Place Sell Order")}
        </button>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07090c]/80 backdrop-blur-sm px-4">
          <div className="bg-background border border-color-border p-6 rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-color-buy to-color-sell opacity-70" />
             <div className="flex items-center gap-3 mb-3">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                 modalMessage.startsWith("Error") 
                   ? "bg-color-sell/20 text-color-sell" 
                   : !modalSignature 
                     ? "bg-blue-500/20 text-blue-500" 
                     : "bg-color-buy/20 text-color-buy"
               }`}>
                 {modalMessage.startsWith("Error") ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 ) : !modalSignature ? (
                   <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                 ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                 )}
               </div>
               <h3 className="text-xl font-bold text-white">Transaction Status</h3>
             </div>
             <p className="text-color-muted text-sm mb-4 pl-11 break-all">{modalMessage}</p>
             
             {modalSignature && (
               <div className="ml-11 mb-6 flex items-center gap-2">
                 <span className="text-color-foreground font-mono text-xs break-all flex-1">{modalSignature}</span>
                 <a 
                   href={`https://solscan.io/tx/${modalSignature}${process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   title="View on Blockscout"
                   className="p-2 bg-[#161A22] border border-color-border rounded-lg text-white hover:text-color-buy transition-colors flex items-center justify-center"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                 </a>
                 <button
                   onClick={copyToClipboard}
                   title="Copy Signature"
                   className="p-2 bg-[#161A22] border border-color-border rounded-lg text-white hover:text-color-buy transition-colors flex items-center justify-center"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                 </button>
               </div>
             )}
             
             <button 
               onClick={() => {
                 setShowModal(false);
                 setModalSignature("");
               }} 
               className="w-full bg-[#161A22] border border-color-border text-white py-2.5 rounded-lg hover:bg-white/10 transition-colors font-semibold mt-2"
             >
               Close
             </button>
          </div>
        </div>
      )}
    </>
  );
};
