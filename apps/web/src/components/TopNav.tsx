"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { useCreatorCapital } from "../hooks/useCreatorCapital";

export const TopNav = () => {
  const { isConnected: connected, address: publicKey, connector: wallet } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync: signMessage } = useSignMessage();
  const { open: openAppKit } = useAppKit();
  
  const getAvatarStyle = (seed: string) => {
    const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
    let hash = 0;
    for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
    return styles[hash % styles.length];
  };
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const authPromptedRef = useRef(false);
  
  const sdk = useCreatorCapital();
  const [totalKeys, setTotalKeys] = useState<number>(0);
  const [isLoadingTotalKeys, setIsLoadingTotalKeys] = useState<boolean>(true);

  useEffect(() => {
    if (!publicKey || !sdk) {
      setTotalKeys(0);
      return;
    }
    const fetchTotalKeys = async () => {
      try {
        // Mocked or wrapped in the new EVM hook
        if (sdk.getTotalKeys) {
           const sum = await sdk.getTotalKeys(publicKey);
           setTotalKeys(sum);
        }
      } catch (err) {
        console.error("Failed to fetch total keys", err);
      } finally {
        setIsLoadingTotalKeys(false);
      }
    };
    fetchTotalKeys();
    const interval = setInterval(fetchTotalKeys, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    setMounted(true);
    
    // Global handler for OAuth popups returning from Twitter
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("popup") === "true") {
        const token = urlParams.get("oauth_token");
        const handle = urlParams.get("handle");
        const name = urlParams.get("name");
        const avatarUrl = urlParams.get("avatarUrl");
        
        if (window.opener) {
          // Send message back to main window
          window.opener.postMessage({ type: 'OAUTH_LINK_SUCCESS', token, handle, name, avatarUrl }, '*');
          window.close();
        }
      }
    }
  }, []);

  // Global listener for OAUTH_LINK_SUCCESS to prevent double toasts
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_LINK_SUCCESS') {
        const { token, handle, name, avatarUrl } = event.data;
        if (token && handle) {
          try {
            const walletToken = localStorage.getItem("walletToken");
            if (walletToken) {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
              const linkRes = await fetch(`${apiUrl}/api/oauth/twitter/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oauthToken: token, walletToken })
              });
              const linkData = await linkRes.json();
              if (linkData.success) {
                localStorage.setItem("oauthToken", token);
                toast.success(`Successfully connected X account: @${handle}`);
                window.dispatchEvent(new CustomEvent('oauth_updated', { detail: event.data }));
              } else {
                toast.error(linkData.error || "Failed to link X account");
                window.dispatchEvent(new CustomEvent('oauth_error', { detail: { error: linkData.error } }));
              }
            } else {
              localStorage.setItem("oauthToken", token);
              toast.success(`Successfully connected X account: @${handle}`);
              window.dispatchEvent(new CustomEvent('oauth_updated', { detail: event.data }));
            }
          } catch (e: any) {
            console.error(e);
            window.dispatchEvent(new CustomEvent('oauth_error', { detail: { error: e.message } }));
          }
        }
      } else if (event.data?.type === 'OAUTH_LINK_ERROR') {
        toast.error(event.data.error || "An error occurred while linking X account.");
      }
    };
    
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const authenticateAndFetch = async () => {
        let token = localStorage.getItem("walletToken");
        
        // Clear stale token
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.wallet.toLowerCase() !== publicKey.toLowerCase()) {
              localStorage.removeItem("walletToken");
              token = null;
            }
          } catch (e) {
            localStorage.removeItem("walletToken");
            token = null;
          }
        }

        // Trigger Sign Message if no valid token
        if (!token && signMessage && !authPromptedRef.current && !isAuthenticating) {
          authPromptedRef.current = true;
          setIsAuthenticating(true);
          const loadingId = toast.loading("Please sign the message to authenticate...");
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
            const challengeRes = await fetch(`${apiUrl}/api/auth/challenge?wallet=${publicKey}`);
            const challengeData = await challengeRes.json();
            if (!challengeData.success) throw new Error("Failed to get challenge");
            
            const signature = await signMessage({ message: challengeData.message });
            
            const verifyRes = await fetch(`${apiUrl}/api/auth/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                wallet: publicKey,
                message: challengeData.message,
                signature: signature // EVM signature is a hex string, no bs58 needed
              })
            });
            
            const verifyData = await verifyRes.json();
            if (!verifyData.success) throw new Error("Verify failed");
            
            localStorage.setItem("walletToken", verifyData.token);
            token = verifyData.token;
            toast.success("Wallet authenticated successfully!", { id: loadingId });
          } catch (e) {
            console.error("Auth error:", e);
            toast.error("Authentication required to use this app", { id: loadingId });
            disconnect();
          } finally {
            setIsAuthenticating(false);
            authPromptedRef.current = false;
          }
        }

        // Fetch profile
        if (token) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL as string;
            const res = await fetch(`${apiUrl}/api/users/${publicKey}/markets`);
            const data = await res.json();
            if (data.success && data.userProfile) {
              setAvatarUrl(data.userProfile.avatarUrl || null);
              setUsername(data.userProfile.username || null);
            }
          } catch (e) {
            console.error("Failed to fetch user profile avatar:", e);
          }
        }
      };

      authenticateAndFetch();
    } else {
      setAvatarUrl(null);
      setUsername(null);
    }
  }, [connected, publicKey, signMessage, disconnect, isAuthenticating]);

  return (
    <header className="border-b border-color-border bg-background sticky top-0 z-50">
      <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        
        {/* Left Side: Logo & Navigation */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <img src="/logo.png" alt="RH Creator Logo" className="w-8 h-8 object-contain" />
            <span>RH Creator</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-color-muted">
            <Link href="/explore" className="hover:text-white transition-colors">
              Explore
            </Link>
            <Link href="/protocol" className="hover:text-white transition-colors">
              Protocol
            </Link>
            
            <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center" aria-label="X (Twitter)">
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.007 3.969H5.078z"></path></svg>
            </a>
            
            {/* Search Form */}
            <div className="relative flex items-center ml-4 group">
              <div className="absolute left-3 flex items-center justify-center pointer-events-none text-color-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search for coins and users..." 
                className="w-80 h-10 pl-9 pr-14 text-sm text-white bg-[#1A1D18] border border-transparent rounded-lg outline-none transition-all placeholder:text-color-muted focus:border-[#2A3028]" 
              />
            </div>
          </nav>
        </div>

        {/* Right Side: Wallet & Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-3">
            <Link 
              href="/claim" 
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-color-buy text-color-buy hover:bg-color-buy/10 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Create Market
            </Link>
            {mounted && connected && publicKey && (
              <div className="flex flex-col items-start ml-1 min-w-[60px]">
                <span className="text-[10px] font-bold text-color-muted uppercase tracking-wider">Total Keys</span>
                {isLoadingTotalKeys ? (
                  <div className="h-[26px] w-8 bg-white/10 rounded animate-pulse border border-color-border/50 mt-[1px]"></div>
                ) : (
                  <span className="text-sm font-semibold text-white bg-white/5 px-2 py-0.5 rounded border border-color-border mt-[1px]">{totalKeys}</span>
                )}
              </div>
            )}
          </div>
          {mounted && connected && publicKey ? (
            <div className="flex items-center gap-3">
              <Link href={`/profile/${publicKey}`} className="relative group flex items-center gap-2 bg-transparent pr-4 pl-1 py-1 rounded-full border border-color-border hover:border-color-buy hover:bg-white/[0.03] transition-all cursor-pointer" title="Go to Profile">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#161A22] border border-color-border overflow-hidden group-hover:border-indigo-500 transition-colors">
                    <img 
                      src={avatarUrl || `https://api.dicebear.com/10.x/${getAvatarStyle(publicKey)}/svg?seed=${publicKey}`} 
                      alt="User Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {wallet?.icon && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#07090c] flex items-center justify-center">
                      <img 
                        src={wallet.icon} 
                        alt={wallet.name} 
                        className="w-4 h-4 rounded-full"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col text-left">
                  {username ? (
                    <span className="text-sm font-semibold text-white leading-tight">@{username}</span>
                  ) : (
                    <span className="text-sm font-semibold text-white leading-tight">Connected</span>
                  )}
                  <span className="text-xs font-mono text-color-muted leading-tight">
                    {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                  </span>
                </div>
              </Link>
              <button 
                onClick={() => setShowDisconnectModal(true)}
                className="text-color-muted hover:text-red-400 transition-colors"
                title="Disconnect"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => openAppKit()}
              className="!bg-color-buy !text-[#07090c] !font-sans !font-semibold !text-sm !h-9 !px-5 !rounded-full hover:!opacity-90 transition-opacity"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07090c]/80 backdrop-blur-sm">
          <div className="bg-[#161A22] border border-color-border rounded-2xl p-6 w-[90%] max-w-sm flex flex-col gap-4 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white">Disconnect Wallet?</h3>
            <p className="text-color-muted text-sm leading-relaxed">
              Are you sure you want to log out? You will need to sign a message to authenticate again when you reconnect.
            </p>
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setShowDisconnectModal(false)}
                className="flex-1 bg-[#07090c] border border-color-border text-white py-2.5 rounded-xl hover:bg-white/5 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  disconnect();
                  localStorage.removeItem("walletToken");
                  setShowDisconnectModal(false);
                  toast.success("Logged out successfully");
                }}
                className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 py-2.5 rounded-xl transition-colors font-semibold"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
