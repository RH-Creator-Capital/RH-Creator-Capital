"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSignMessage, usePublicClient } from "wagmi";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";

const WalletMultiButton = ({ className }: { className?: string }) => {
    const { open } = useAppKit();
    return <button onClick={() => open()} className={className}>Connect Wallet</button>;
  };

import { useRouter } from "next/navigation";
import { useCreatorCapital } from "../../hooks/useCreatorCapital";
import toast from "react-hot-toast";
import GhostCursor from "./GhostCursor";

const isValidUrl = (url: string) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative group cursor-pointer inline-flex items-center ml-auto">
    <svg className="w-4 h-4 text-color-muted hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-background border border-color-border/50 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl hidden group-hover:block font-normal">
      {text}
    </div>
  </div>
);
export default function ClaimPage() {
  const router = useRouter();
  const sdk = useCreatorCapital();
  const { address: publicKey } = useAppKitAccount();
  const { signMessageAsync: signMessage } = useSignMessage();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "AUTHENTICATED" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState<string>("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [twitterName, setTwitterName] = useState("");
  const [twitterAvatar, setTwitterAvatar] = useState("");
  const [oauthToken, setOauthToken] = useState("");
  const [isXLinked, setIsXLinked] = useState(false);
  const [createdMarketPda, setCreatedMarketPda] = useState("");
  const [createdTxSig, setCreatedTxSig] = useState<string | null>(null);
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [bannerInputType, setBannerInputType] = useState<"upload" | "url">("upload");
  const [avatarInputType, setAvatarInputType] = useState<"upload" | "url">("upload");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [uploadedAvatarName, setUploadedAvatarName] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("1");
  const [creationMode, setCreationMode] = useState<"oauth" | "manual">("oauth");
  const [category, setCategory] = useState("Influencers");
  const [xProfileUrl, setXProfileUrl] = useState("");
  
  const CATEGORIES = ["Regular User", "Crypto", "Streamers", "Influencers", "Athletes", "Business", "Actors", "Celebrities", "Politicians", "Musicians", "Creatives", "Companies"];

  const executeInitialBuy = async (mId: string, toastId: string) => {
    const parsedBuyAmount = Number(initialBuyAmount);
    if (parsedBuyAmount > 0) {
      toast.loading(`Buying ${parsedBuyAmount} initial key(s)...`, { id: toastId });
      try {
         const a = BigInt(parsedBuyAmount);
         const sum2 = a === BigInt(1) ? BigInt(0) : (a - BigInt(1)) * a * (BigInt(2) * a - BigInt(1)) / BigInt(6);
         const baseCostEth = Number(sum2) / 16000;
         const totalCostEth = baseCostEth * 1.0125; // 1.25% fee
         const valueWei = BigInt(Math.ceil(totalCostEth * 1e18));
         
         await sdk.buyKeys(mId, parsedBuyAmount, valueWei);
         toast.success(`Successfully bought ${parsedBuyAmount} key(s)!`, { id: toastId });
      } catch (e) {
         console.error("Initial buy failed:", e);
         toast.error("Market created, but initial buy failed. You can buy keys on the market page.");
      }
    }
  };

  const handleClaim = async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      setMessage("Please connect your wallet first.");
      setStatus("ERROR");
      return false;
    }

    try {
      setStatus("LOADING");
      const loadingId = toast.loading("Requesting challenge from server...");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const challengeRes = await fetch(`${apiUrl}/api/auth/challenge?wallet=${publicKey}`);
      const challengeData = await challengeRes.json();

      if (!challengeData.success) {
        throw new Error(challengeData.error || "Failed to get challenge");
      }

      toast.loading("Please sign the message in your wallet...", { id: loadingId });
      const signature = await signMessage({ message: challengeData.message });

      toast.loading("Verifying signature...", { id: loadingId });
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
      if (!verifyData.success) {
        throw new Error(verifyData.error || "Failed to verify signature");
      }

      localStorage.setItem("walletToken", verifyData.token);
      setStatus("AUTHENTICATED");
      toast.success("Wallet authenticated!", { id: loadingId });
      return true;

    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      toast.error(err.message || "An unknown error occurred");
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      setIsUploading(true);
      const { supabase } = await import("../../lib/supabase");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadErr) {
        throw uploadErr;
      }

      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
      setBannerUrl(data.publicUrl);
      setUploadedFileName(file.name);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      const errorMessage = error.message || error.error || JSON.stringify(error) || "Failed to upload image";
      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);
    try {
      setIsAvatarUploading(true);
      const { supabase } = await import("../../lib/supabase");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadErr) {
        throw uploadErr;
      }

      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
      setTwitterAvatar(data.publicUrl);
      setUploadedAvatarName(file.name);
      toast.success("Avatar uploaded successfully!");
    } catch (error: any) {
      const errorMessage = error.message || error.error || JSON.stringify(error) || "Failed to upload avatar";
      setAvatarUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const hasLinkedRef = useRef(false);



  // Listen for global oauth updates
  useEffect(() => {
    const handleOAuthUpdated = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { token, handle, name, avatarUrl } = customEvent.detail;

      // Check if market already exists before proceeding
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const checkRes = await fetch(`${apiUrl}/api/markets/check/${encodeURIComponent(handle)}`);
        const checkData = await checkRes.json();

        if (checkData.exists) {
          toast.error("This X (Twitter) account is already registered as a creator.");
          setStatus("ERROR");
          setMessage(`The account @${handle} already has an active market. Please use a different X account.`);
          return;
        }
      } catch (e) {
        console.error("Failed to check market existence:", e);
      }

      setOauthToken(token);
      setTwitterHandle(handle);
      if (name) setTwitterName(name);
      if (avatarUrl) setTwitterAvatar(avatarUrl);
      setIsXLinked(true);
      setStatus("AUTHENTICATED");
      // Note: Toast success is already handled by TopNav globally
    };

    const handleOAuthError = (e: Event) => {
      const customEvent = e as CustomEvent;
      setStatus("ERROR");
      setMessage(customEvent.detail?.error || "Failed to authenticate with X");
    };

    window.addEventListener('oauth_updated', handleOAuthUpdated);
    window.addEventListener('oauth_error', handleOAuthError);
    return () => {
      window.removeEventListener('oauth_updated', handleOAuthUpdated);
      window.removeEventListener('oauth_error', handleOAuthError);
    };
  }, []);

  const handleOAuthLogin = async () => {
    if (status !== "AUTHENTICATED" && status !== "SUCCESS") {
      const success = await handleClaim();
      if (!success) return;
    }

    setStatus("LOADING");
    setMessage("Waiting for X (Twitter) authentication...");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const redirectUrl = encodeURIComponent(window.location.origin + "/claim?popup=true");

    // Open in popup modal
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${apiUrl}/api/oauth/twitter/login?redirect_to=${redirectUrl}`,
      "twitter_oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,status=0,menubar=0`
    );

    if (!popup) {
      toast.error("Popup was blocked by the browser. Please allow popups and try again.");
      setStatus("AUTHENTICATED");
      return;
    }
  };

  const handleCreateMarket = async () => {
    if (status !== "AUTHENTICATED" && status !== "SUCCESS") {
      const success = await handleClaim();
      if (!success) return;
    }

    if (!isXLinked && !twitterHandle.trim()) {
      toast.error("Please enter a Username (Handle)");
      return;
    }

    if (!isXLinked && !twitterName.trim()) {
      toast.error("Please enter a Display Name");
      return;
    }

    if (!sdk || !publicKey) {
      setMessage("Wallet not connected or SDK not initialized.");
      setStatus("ERROR");
      return;
    }

    if (!ticker.trim()) {
      toast.error("Please enter a Ticker");
      return;
    }
    
    if (!description.trim()) {
      toast.error("Please enter a Description");
      return;
    }
    
    if (!bannerUrl.trim()) {
      toast.error("Please upload or provide a Banner Image URL");
      return;
    }

    // URL Validation
    const isValidUrl = (urlString: string) => {
      try {
        new URL(urlString);
        return true;
      } catch (e) {
        return false;
      }
    };

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      toast.error("Please enter a valid Link URL (e.g., https://example.com)");
      return;
    }

    if (telegramUrl && !isValidUrl(telegramUrl)) {
      toast.error("Please enter a valid Telegram URL (e.g., https://t.me/example)");
      return;
    }

    let loadingId: string | undefined;

    try {
      setStatus("LOADING");
      loadingId = toast.loading("Requesting approval from wallet to create market on-chain...");

      // Convert handle to 32 bytes zero-padded array
      const textBytes = new TextEncoder().encode(twitterHandle);
      if (textBytes.length > 32) {
        throw new Error("Handle is too long");
      }

      const creatorIdArray = new Array(32).fill(0);
      for (let i = 0; i < textBytes.length; i++) {
        creatorIdArray[i] = textBytes[i];
      }

      // Get the Address so we can redirect to the creator page
      const marketId = sdk.getMarketId(twitterHandle);

      // Check market state first
      let marketState = null;
      try {
        if (publicClient) {
          const res: any = await publicClient.readContract({
            address: sdk.contractAddress,
            abi: sdk.abi,
            functionName: 'markets',
            args: [marketId]
          });
          if (res && res[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
             marketState = { claimed: res[3] };
          }
        }
      } catch (e) {}

      if (!marketState) {
        // Check if market already exists in DB for this Twitter Handle
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const checkRes = await fetch(`${apiUrl}/api/markets/check/${encodeURIComponent(twitterHandle)}`);
        const checkData = await checkRes.json();

        if (checkData.exists) {
          toast.dismiss(loadingId);
          toast.error("This X (Twitter) account is already registered as a creator.");
          setStatus("ERROR");
          setMessage("This account already has a market. Please use an unregistered X account.");
          return;
        }

        // Send transaction via SDK to create market
        const createTxSig = await sdk.createMarket(twitterHandle);
        
        // Sync market immediately so metadata is not lost even if claim fails
        let syncSuccess = false;
        let syncRetries = 0;
        while (!syncSuccess && syncRetries < 4) {
          try {
            const syncRes = await fetch(`${apiUrl}/api/markets/${marketId}/sync`, { 
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                createTxSignature: typeof createTxSig === 'string' ? createTxSig : undefined,
                createdBy: publicKey,
                twitterHandle,
                ticker,
                description,
                websiteUrl,
                telegramUrl,
                bannerUrl,
                twitterName,
                avatarUrl: twitterAvatar,
                category
              })
            });
            if (syncRes.ok) {
              syncSuccess = true;
            } else {
              await new Promise(r => setTimeout(r, 2000));
              syncRetries++;
            }
          } catch (e) {
            console.error("Failed to sync market:", e);
            await new Promise(r => setTimeout(r, 2000));
            syncRetries++;
          }
        }

        toast.loading(`Market Created! Claiming market ownership...`, { id: loadingId });
      }

      if (!marketState || !marketState.claimed) {
        if (!isXLinked) {
          setStatus("SUCCESS");
          toast.success(`Market Created! The owner can claim it later via OAuth.`, { id: loadingId });
          await executeInitialBuy(marketId, loadingId);
          setCreatedMarketPda(marketId);
          return;
        }

        // We need to claim the market using Ed25519 verification
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const walletToken = localStorage.getItem("walletToken");

        toast.loading("Requesting signature for claim...", { id: loadingId });

        let sigData: any = null;
        let retryCount = 0;
        const maxRetries = 4;
        
        while (retryCount < maxRetries) {
          try {
            const sigRes = await fetch(`${apiUrl}/api/auth/claim-signature`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${walletToken}`
              },
              body: JSON.stringify({ marketId: marketId, oauthToken })
            });

            if (sigRes.ok) {
              sigData = await sigRes.json();
              if (sigData.success) break;
            }
            
            // If 404 or not success, wait and retry
            await new Promise(r => setTimeout(r, 2000));
            retryCount++;
          } catch (err) {
            await new Promise(r => setTimeout(r, 2000));
            retryCount++;
          }
        }

        if (!sigData || !sigData.success) {
          throw new Error(sigData?.error || "Failed to fetch claim signature after retries. The network might be congested.");
        }

        // Claim market using wagmi
        const txSig = await sdk.claimMarket(marketId, twitterHandle, sigData.deadline || Math.floor(Date.now()/1000) + 3600, sigData.signature);

        // Update sync with tx signature
        try {
          await fetch(`${apiUrl}/api/markets/${marketId}/sync`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              claimTxSignature: typeof txSig === 'string' ? txSig : undefined,
              ticker,
              description,
              websiteUrl,
              telegramUrl,
              bannerUrl,
              twitterName,
              avatarUrl: twitterAvatar,
              category
            })
          });

          if (typeof txSig === 'string') {
            await fetch(`${apiUrl}/webhook/sync-tx`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ signature: txSig })
            });
          }
        } catch (e) {
          console.error("Failed to update market tx sig:", e);
        }

        setStatus("SUCCESS");
        toast.success(`Market Claimed Successfully!`, { id: loadingId });
        await executeInitialBuy(marketId, loadingId);
        setCreatedMarketPda(marketId);
        if (typeof txSig === 'string') setCreatedTxSig(txSig);
      } else {
        // Even if it's already claimed, sync it just in case
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        try {
          await fetch(`${apiUrl}/api/markets/${marketId}/sync`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker,
              description,
              websiteUrl,
              telegramUrl,
              bannerUrl,
              twitterName,
              avatarUrl: twitterAvatar,
              category
            })
          });
        } catch (e) {
          console.error("Failed to sync market:", e);
        }

        setStatus("SUCCESS");
        toast.success(`Market is already fully set up and claimed!`, { id: loadingId });
        setCreatedMarketPda(marketId);
      }
    } catch (err: any) {
      console.error("Transaction Error:", err);
      if (err.logs) console.error("Logs:", err.logs);
      setStatus("ERROR");

      let cleanMessage = "Transaction failed. Please try again.";
      if (err.message) {
        if (err.message.includes("already in use")) {
          cleanMessage = "This market has already been created/claimed.";
        } else if (err.message.includes("User rejected") || err.message.includes("cancelled")) {
          cleanMessage = "Transaction was cancelled by user.";
        } else if (err.message.includes("Simulation failed")) {
          cleanMessage = "Transaction simulation failed. Check console for details.";
        } else {
          cleanMessage = err.message.length > 100 ? "Transaction failed. Check console for details." : err.message;
        }
      }
      toast.error(cleanMessage, { id: loadingId || "claim-error" });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full">
      <GhostCursor
        // Visuals
        color="#00ff12"
        brightness={0.5}
        edgeIntensity={0}

        // Trail and motion
        trailLength={30}
        inertia={0.12}

        // Post-processing
        grainIntensity={0.03}
        bloomStrength={0}
        bloomRadius={2.15}
        bloomThreshold={0.025}

        // Fade-out behavior
        fadeDelayMs={1000}
        fadeDurationMs={1700}
      />
      <div className="relative z-10 max-w-[85rem] mx-auto px-6 py-12 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          {/* Left Side: Information */}
        <div className="flex flex-col gap-8 bg-background/30 backdrop-blur-sm p-5 sm:p-8 md:p-10 rounded-2xl relative lg:sticky lg:top-24 h-fit z-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-color-muted mb-6">
              <span className="w-2 h-2 rounded-full bg-color-buy animate-pulse" />
              Creator Portal
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Launch Your <span className="text-color-buy">Social Market.</span>
            </h1>
            <p className="text-color-muted text-lg leading-relaxed">
              Tokenize your social influence. Build a community-driven economy where your most loyal supporters become stakeholders in your success.
            </p>
          </div>
          
          <div className="flex flex-col gap-6 mt-4">
            {[
              { title: 'Two Creation Modes', desc: 'Link your X account for instant setup and a "Verified" badge, or enter your details manually.' },
              { title: 'Market Ticker', desc: 'Choose a unique symbol for your token (e.g. $YOURNAME). This will be your permanent identifier.' },
              { title: 'Anti-Sniper Protection', desc: 'Use the Initial Buy feature to secure your own tokens in the very first transaction before anyone else can.' },
              { title: 'Creator Revenue', desc: 'Earn 95% of all trading fees generated by your market.' },
              { title: 'Instant Setup', desc: 'No coding required. Link your X account and go live in seconds.' }
            ].map(feature => (
              <div key={feature.title} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-color-buy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">{feature.title}</h3>
                  <p className="text-color-muted text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Action Card */}
        <div className="bg-background border border-color-border/50 p-5 sm:p-8 md:p-10 rounded-2xl w-full shadow-lg relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-color-buy to-transparent opacity-50" />

        {!publicKey ? (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="text-center w-full mb-2">
              <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
              <p className="text-color-muted text-sm">Connect your Robinhood Chain wallet to begin.</p>
            </div>
            <WalletMultiButton className="!bg-[#161A22] !border !border-color-border hover:!border-color-buy !transition-all !text-white !h-14 !px-8 !rounded-xl !font-sans !font-semibold w-full flex justify-center shadow-lg" />
          </div>
        ) : status === "SUCCESS" ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-16 h-16 bg-color-buy/20 rounded-full flex items-center justify-center text-color-buy mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-1">Market Launched!</p>
              <p className="text-color-muted text-sm">Your bonding curve is now live.</p>
            </div>
            
            <div className="bg-white/5 border border-color-border/50 rounded-xl p-4 w-full flex flex-col gap-3 my-4">
              <div className="flex justify-between items-center text-sm border-b border-color-border/30 pb-2">
                <span className="text-color-muted">Date</span>
                <span className="text-white">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-color-border/30 pb-2">
                <span className="text-color-muted">Market Address</span>
                <span className="text-white font-mono">{createdMarketPda.slice(0,8)}...{createdMarketPda.slice(-8)}</span>
              </div>
              {createdTxSig && (
                <div className="flex justify-between items-center text-sm border-b border-color-border/30 pb-2">
                  <span className="text-color-muted">Transaction</span>
                  <a href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${createdTxSig}`} target="_blank" rel="noopener noreferrer" className="text-color-buy hover:underline font-mono">
                    {createdTxSig.slice(0,6)}...{createdTxSig.slice(-6)}
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center text-sm border-b border-color-border/30 pb-2">
                <span className="text-color-muted">Creator</span>
                <span className="text-white font-bold">{twitterName} <span className="font-normal text-color-muted">(@{twitterHandle})</span></span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-color-border/30 pb-2">
                <span className="text-color-muted">Ticker</span>
                <span className="text-color-buy font-bold">{ticker}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-color-muted">Category</span>
                <span className="text-white">{category}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={() => router.push(`/creator/${createdMarketPda}`)}
                className="flex-1 bg-color-buy text-[#07090c] font-bold py-3 px-4 rounded-xl hover:bg-opacity-90 transition-colors"
              >
                Go to Market
              </button>
              <button 
                onClick={() => router.push(`/profile/${publicKey}`)}
                className="flex-1 bg-white/5 border border-color-border/50 text-white font-bold py-3 px-4 rounded-xl hover:border-color-buy transition-colors"
              >
                View Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            <div className="text-center w-full mb-2">
              <h2 className="text-2xl font-bold text-white mb-2">Market Details</h2>
              <p className="text-color-muted text-sm">Configure your tokenized social market.</p>
            </div>
            
            {/* Identity Section */}
            <div className="w-full flex flex-col gap-4 text-left bg-white/5 border border-color-border/50 p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-white font-bold text-lg">Creator Identity</h3>
                {!isXLinked && (
                  <button
                    onClick={handleOAuthLogin}
                    disabled={status === "LOADING"}
                    className="bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] font-semibold py-1.5 px-4 rounded-lg text-sm transition-all flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    {status === "LOADING" ? "Connecting..." : "Verify with X"}
                  </button>
                )}
              </div>

              {isXLinked ? (
                <div className="w-full bg-background border border-color-buy/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {twitterAvatar ? (
                      <img src={twitterAvatar} alt={twitterName} className="w-10 h-10 rounded-full bg-white/5" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-color-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {twitterName}
                        <span className="bg-color-buy text-[#07090c] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">VERIFIED</span>
                      </div>
                      <div className="text-color-muted text-sm">@{twitterHandle}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setIsXLinked(false);
                      setCreationMode("manual");
                      setTwitterHandle("");
                      setTwitterName("");
                      setTwitterAvatar("");
                      setOauthToken("");
                      setStatus("IDLE");
                    }}
                    className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-color-muted text-xs">Linking your X account is recommended for trust and verification. Otherwise, you can enter details manually.</p>
                  <div>
                    <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                      X Profile URL <span className="text-red-500">*</span>
                      <InfoTooltip text="Paste your full X profile URL to auto-fill your details." />
                    </label>
                    <input 
                      type="text" 
                      value={xProfileUrl} 
                      onChange={e => {
                        setXProfileUrl(e.target.value);
                        try {
                          const url = new URL(e.target.value);
                          let handle = url.pathname.replace('/', '');
                          if (handle.includes('?')) handle = handle.split('?')[0];
                          if (handle.includes('/')) handle = handle.split('/')[0];
                          if (handle) setTwitterHandle(handle);
                        } catch (e) {}
                      }} 
                      placeholder="https://x.com/username" 
                      className={`w-full bg-white/5 border ${!isValidUrl(xProfileUrl) && xProfileUrl.trim().length > 0 ? 'border-red-500 focus:border-red-400' : 'border-color-border/50 focus:border-color-buy'} rounded-xl p-3 text-white outline-none transition-colors`} 
                    />
                    {!isValidUrl(xProfileUrl) && xProfileUrl.trim().length > 0 && (
                      <p className="text-red-500 text-xs mt-1">Please enter a valid URL (e.g. https://...)</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                        Username <span className="text-red-500">*</span>
                        <InfoTooltip text="Your X handle without the @ symbol." />
                      </label>
                      <input 
                        type="text" 
                        value={twitterHandle} 
                        onChange={e => setTwitterHandle(e.target.value)} 
                        placeholder="e.g. username" 
                        disabled={!!xProfileUrl.trim()}
                        className={`w-full bg-white/5 border border-color-border/50 rounded-xl p-3 text-white outline-none transition-colors ${xProfileUrl.trim() ? 'opacity-50 cursor-not-allowed' : 'focus:border-color-buy'}`} 
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                        Display Name <span className="text-red-500">*</span>
                        <InfoTooltip text="Your full name or community name." />
                      </label>
                      <input type="text" value={twitterName} onChange={e => setTwitterName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-white/5 border border-color-border/50 rounded-xl p-3 text-white focus:border-color-buy outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-white text-sm font-semibold mb-2">
                      Avatar Image
                      <InfoTooltip text="Upload an image or provide a direct link for your profile picture." />
                    </label>

                    <div className="flex gap-2 mb-3 bg-white/5 p-1 rounded-xl w-fit border border-color-border/50">
                      <button
                        type="button"
                        onClick={() => setAvatarInputType("upload")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${avatarInputType === "upload" ? "bg-white/10 text-white shadow" : "text-color-muted hover:text-white"}`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarInputType("url")}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${avatarInputType === "url" ? "bg-white/10 text-white shadow" : "text-color-muted hover:text-white"}`}
                      >
                        Paste URL
                      </button>
                    </div>

                    {avatarInputType === "upload" ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={isAvatarUploading}
                          className="hidden" 
                          id="avatar-upload"
                        />
                        <label 
                          htmlFor="avatar-upload" 
                          className={`cursor-pointer bg-white/5 border ${avatarUploadError ? 'border-red-500 text-red-400' : 'border-color-border/50 text-white hover:border-color-buy'} rounded-xl px-4 py-3 flex flex-col items-center justify-center transition-colors text-sm font-semibold border-dashed w-full ${isAvatarUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {isAvatarUploading ? (
                            <span>Uploading...</span>
                          ) : twitterAvatar && twitterAvatar.includes('supabase.co') ? (
                            <div className="flex flex-col items-center gap-1 text-color-buy">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>Image uploaded successfully!</span>
                              </div>
                              {uploadedAvatarName && <span className="text-xs opacity-80 break-all text-center px-2">{uploadedAvatarName}</span>}
                              <span className="text-xs text-color-muted mt-1">Click to change</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <svg className="w-5 h-5 text-color-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                              <span>Click to upload image</span>
                            </div>
                          )}
                        </label>
                        {avatarUploadError && (
                          <p className="text-red-500 text-xs mt-1">{avatarUploadError}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <input 
                          type="text" 
                          value={twitterAvatar} 
                          onChange={e => {
                            setTwitterAvatar(e.target.value);
                            if (avatarUploadError) setAvatarUploadError(null);
                          }} 
                          placeholder="https://..." 
                          className={`w-full bg-white/5 border ${avatarUploadError || (!isValidUrl(twitterAvatar) && twitterAvatar.trim().length > 0) ? 'border-red-500 focus:border-red-400' : 'border-color-border/50 focus:border-color-buy'} rounded-xl p-3 text-white outline-none transition-colors text-sm`}
                        />
                        {!isValidUrl(twitterAvatar) && twitterAvatar.trim().length > 0 && !avatarUploadError && (
                          <p className="text-red-500 text-xs mt-1">Please enter a valid URL (e.g. https://...)</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Token Details Section */}
            <div className="w-full flex flex-col gap-4 text-left mt-2">
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                  Category <span className="text-red-500">*</span>
                  <InfoTooltip text="Select the sector that best fits your community." />
                </label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-color-border/50 rounded-xl p-3 text-white focus:border-color-buy outline-none transition-colors appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-background">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                  Ticker <span className="text-red-500">*</span>
                  <InfoTooltip text="The symbol for your market token (e.g. $YOURNAME). Cannot be changed." />
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={ticker} 
                    onChange={e => setTicker(e.target.value)} 
                    placeholder={`e.g. $${twitterHandle?.toUpperCase() || 'TICKER'}`} 
                    className="w-full bg-white/5 border border-color-border/50 rounded-xl p-3 pr-24 text-white focus:border-color-buy outline-none transition-colors" 
                  />
                  {twitterHandle && !ticker && (
                    <button 
                      type="button"
                      onClick={() => setTicker(`$${twitterHandle.toUpperCase()}`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white shadow text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                    >
                      Use ${twitterHandle.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            <div>
              <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                Description <span className="text-red-500">*</span>
                <InfoTooltip text="Tell people about your market, roadmap, and what holders get." />
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="About your community..." className="w-full bg-white/5 border border-color-border/50 rounded-xl p-3 text-white focus:border-color-buy outline-none transition-colors resize-none h-20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                  Link
                  <InfoTooltip text="Link to your website or primary social profile." />
                </label>
                <input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." className={`w-full bg-white/5 border ${!isValidUrl(websiteUrl) && websiteUrl.trim().length > 0 ? 'border-red-500 focus:border-red-400' : 'border-color-border/50 focus:border-color-buy'} rounded-xl p-3 text-white outline-none transition-colors text-sm`} />
                {!isValidUrl(websiteUrl) && websiteUrl.trim().length > 0 && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid URL (e.g. https://...)</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                  Telegram
                  <InfoTooltip text="Link to your community Telegram group." />
                </label>
                <input type="text" value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} placeholder="https://t.me/..." className={`w-full bg-white/5 border ${!isValidUrl(telegramUrl) && telegramUrl.trim().length > 0 ? 'border-red-500 focus:border-red-400' : 'border-color-border/50 focus:border-color-buy'} rounded-xl p-3 text-white outline-none transition-colors text-sm`} />
                {!isValidUrl(telegramUrl) && telegramUrl.trim().length > 0 && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid URL (e.g. https://...)</p>
                )}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-white text-sm font-semibold mb-2">
                Banner Image <span className="text-red-500">*</span>
                <InfoTooltip text="A wide image (recommended 3:1 ratio) that will be displayed at the top of your market page." />
              </label>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-3 bg-white/5 p-1 rounded-xl w-fit border border-color-border/50">
                <button
                  type="button"
                  onClick={() => setBannerInputType("upload")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${bannerInputType === "upload" ? "bg-white/10 text-white shadow" : "text-color-muted hover:text-white"}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setBannerInputType("url")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${bannerInputType === "url" ? "bg-white/10 text-white shadow" : "text-color-muted hover:text-white"}`}
                >
                  Paste URL
                </button>
              </div>

              {bannerInputType === "upload" ? (
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden" 
                    id="banner-upload"
                  />
                  <label 
                    htmlFor="banner-upload" 
                    className={`cursor-pointer bg-white/5 border ${uploadError ? 'border-red-500 text-red-400' : 'border-color-border/50 text-white hover:border-color-buy'} rounded-xl px-4 py-3 flex flex-col items-center justify-center transition-colors text-sm font-semibold border-dashed w-full ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isUploading ? (
                      <span>Uploading...</span>
                    ) : bannerUrl && bannerUrl.includes('supabase.co') ? (
                      <div className="flex flex-col items-center gap-1 text-color-buy">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          <span>Image uploaded successfully!</span>
                        </div>
                        {uploadedFileName && <span className="text-xs opacity-80 break-all text-center px-2">{uploadedFileName}</span>}
                        <span className="text-xs text-color-muted mt-1">Click to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-5 h-5 text-color-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <span>Click to upload image</span>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <input 
                  type="text" 
                  value={bannerUrl} 
                  onChange={e => {
                    setBannerUrl(e.target.value);
                    if (uploadError) setUploadError(null);
                  }} 
                  placeholder="https://..." 
                  className={`w-full bg-white/5 border ${uploadError || (!isValidUrl(bannerUrl) && bannerUrl.trim().length > 0) ? 'border-red-500 focus:border-red-400' : 'border-color-border/50 focus:border-color-buy'} rounded-xl p-3 text-white outline-none transition-colors text-sm`}
                />
              )}
              
              {!isValidUrl(bannerUrl) && bannerUrl.trim().length > 0 && !uploadError && bannerInputType === 'url' && (
                <p className="text-red-500 text-xs mt-2">Please enter a valid URL (e.g. https://...)</p>
              )}
              {uploadError && (
                <p className="text-red-500 text-xs mt-2">{uploadError}</p>
              )}
              
              {/* Preview Image if valid URL */}
              {bannerUrl.trim().length > 0 && isValidUrl(bannerUrl) && !uploadError && (
                <div className="mt-3 w-full h-32 rounded-xl overflow-hidden border border-color-border/50 bg-white/5 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkIEltYWdlIFVSTDwvdGV4dD48L3N2Zz4=';
                  }} />
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm font-semibold">PREVIEW</div>
                </div>
              )}
            </div>
            {/* 
            <div>
              <label className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                Initial Buy (Keys)
                <InfoTooltip text="Buy tokens in the same transaction as creation to secure a position before bots can." />
              </label>
              <input type="number" min="0" value={initialBuyAmount} onChange={e => setInitialBuyAmount(e.target.value)} placeholder="0" className="w-full bg-white/5 border border-color-border/50 rounded-xl p-3 text-white focus:border-color-buy outline-none transition-colors" />
              <p className="text-color-muted text-xs mt-1">Optional. Buy keys in the same transaction to prevent snipers.</p>
            </div>
            */}
            
            <button
              onClick={handleCreateMarket}
              disabled={status === "LOADING" || !ticker.trim() || !description.trim() || !bannerUrl.trim()}
              className="w-full bg-color-buy text-[#07090c] font-bold py-3.5 px-4 rounded-xl hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-color-buy/20 mt-2"
            >
              {status === "LOADING" ? "Creating Market..." : status !== "AUTHENTICATED" ? "Sign & Launch Market" : "Launch Market"}
            </button>
          </div>
        </div>
        )}
      </div>
      </div>
    </div>
    </div>
  );
}
