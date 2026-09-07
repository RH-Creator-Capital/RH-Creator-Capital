import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

export const CalloutModal = ({ isOpen, onClose, targetId, text }: { isOpen: boolean, onClose: () => void, targetId: string, text: string }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      capture();
    } else {
      setImageUri(null);
    }
  }, [isOpen]);

  const capture = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#0B0D0A', // Theme background
        pixelRatio: 2,
      });
      setImageUri(dataUrl);
    } catch (e) {
      console.error("Failed to capture image", e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!imageUri) return;
    const a = document.createElement('a');
    a.href = imageUri;
    a.download = `callout-${Date.now()}.png`;
    a.click();
  };

  const handleShare = () => {
    const tweetText = encodeURIComponent(text);
    // Twitter doesn't allow attaching base64 images via URL. The user must download and attach it manually,
    // or we just share the text with a link.
    const url = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-background border border-color-border p-6 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Share Callout</h2>
          <button onClick={onClose} className="text-color-muted hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#161A22] rounded-lg border border-white/5 p-4 flex flex-col items-center justify-center min-h-[200px] overflow-hidden">
            {isCapturing ? (
              <div className="text-color-muted animate-pulse text-sm">Generating visual card...</div>
            ) : imageUri ? (
              <img src={imageUri} alt="Callout" className="max-h-[400px] rounded object-contain shadow-lg border border-white/10" />
            ) : (
              <div className="text-color-muted text-sm">Failed to generate image.</div>
            )}
          </div>
          
          <div className="text-sm text-color-muted bg-white/5 p-3 rounded text-center">
            Tip: Download the image and attach it to your post on X for maximum visibility!
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={handleDownload}
              disabled={!imageUri}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download Image
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-black hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              Share to X
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
