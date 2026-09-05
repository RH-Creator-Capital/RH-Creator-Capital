import React from 'react';

interface ClaimBadgeProps {
  claimed: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClaimBadge: React.FC<ClaimBadgeProps> = ({ claimed, size = 'md', className = "" }) => {
  const isSm = size === 'sm';
  
  if (claimed) {
    return (
      <div 
        className={`flex items-center gap-1 bg-color-buy/15 text-color-buy rounded-full border border-color-buy/20 shrink-0 ${isSm ? 'px-1.5 py-0.5' : 'px-2 py-0.5'} ${className}`} 
        title="Verified Creator"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} viewBox="0 0 24 24"><path fill="currentColor" d="M15.616 3.268L12 .186L8.383 3.268l-4.737.378l-.378 4.737L.186 12l3.082 3.617l.378 4.737l4.737.378l3.616 3.082l3.617-3.082l4.737-.378l.378-4.737L23.813 12l-3.082-3.617l-.378-4.737zM11 16.414L6.585 12L8 10.586l3 3l5.5-5.5L17.914 9.5z"/></svg>
        <span className={`${isSm ? 'text-[9px]' : 'text-[10px]'} font-bold tracking-wide pt-[1px]`}>CLAIMED</span>
      </div>
    );
  }

  return (
    <span className={`bg-amber-500/15 text-amber-400 rounded-full font-bold tracking-wide shrink-0 ${isSm ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} ${className}`}>
      UNCLAIMED
    </span>
  );
};
