import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAppKitAccount } from '@reown/appkit/react';
import toast from 'react-hot-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const CalloutFeed = ({ marketId }: { marketId: string }) => {
  const { address } = useAppKitAccount();
  const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
  const { data, error, mutate } = useSWR(
    marketId ? `${API_URL}/api/markets/${marketId}/callouts` : null,
    fetcher,
    { refreshInterval: 5000 } // Auto refresh every 5 seconds
  );

  const [message, setMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const callouts = data?.callouts || [];

  const handlePost = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!message.trim()) return;

    setIsPosting(true);
    try {
      const res = await fetch(`${API_URL}/api/markets/${marketId}/callouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          message: message.trim(),
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success('Callout posted!');
        setMessage('');
        mutate(); // Refresh the feed
      } else {
        toast.error('Failed to post callout');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to post callout');
    } finally {
      setIsPosting(false);
    }
  };

  const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${Math.max(0, seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#07090c] border-t border-color-border">
      {/* Post Input */}
      <div className="p-4 border-b border-color-border bg-[#161A22]">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {address ? address.substring(2, 4).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Post a callout..."
              className="w-full bg-transparent text-sm text-white placeholder-color-muted resize-none focus:outline-none min-h-[40px]"
              maxLength={280}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-color-muted">{message.length}/280</span>
              <button
                onClick={handlePost}
                disabled={!message.trim() || isPosting || !address}
                className="bg-white text-black px-4 py-1.5 rounded-md text-xs font-bold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {error ? (
          <div className="text-color-muted text-sm text-center py-8">Failed to load thread</div>
        ) : !data ? (
          <div className="text-color-muted text-sm text-center py-8 animate-pulse">Loading...</div>
        ) : callouts.length === 0 ? (
          <div className="text-color-muted text-sm text-center py-8">No callouts yet. Be the first to shill!</div>
        ) : (
          callouts.map((callout: any) => (
            <div key={callout.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                <span className="text-white text-xs font-bold">
                  {callout.walletAddress.substring(2, 4).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 bg-[#161A22] border border-white/5 p-3 rounded-lg rounded-tl-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-white text-xs font-bold truncate">
                    {callout.walletAddress.slice(0, 6)}...{callout.walletAddress.slice(-4)}
                  </span>
                  <span className="text-color-muted text-[10px]">
                    {timeAgo(callout.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                  {callout.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
