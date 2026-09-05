import React from 'react';

interface ProfileHeaderCardProps {
  userProfile: any;
  address: string;
  isOwner: boolean;
  onEditOpen: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({ userProfile, address, isOwner, onEditOpen }) => {
  const getAvatarStyle = (seed: string) => {
    const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
    let hash = 0;
    for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
    return styles[hash % styles.length];
  };

  const defaultAvatar = `https://api.dicebear.com/10.x/${getAvatarStyle(address)}/svg?seed=${address}`;

  return (
    <div className="relative h-[360px] w-full rounded-2xl border border-color-border/50 shadow-xl overflow-hidden group">
      <div className="absolute inset-0 w-full h-full bg-[#161A22]">
        <img 
          src={userProfile?.avatarUrl || defaultAvatar} 
          alt="Creator Avatar" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end h-full z-10">
         <div className="flex items-center gap-2 mb-1">
           <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
             {userProfile?.username || "Creator"}
           </h1>
         </div>
         <div className="flex items-center gap-2 mb-3">
           <span className="font-mono text-xs text-color-muted bg-background/60 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
           <button
             onClick={() => navigator.clipboard.writeText(address)}
             className="p-1.5 bg-background/60 border border-white/10 backdrop-blur-md rounded-md text-color-muted hover:text-white transition-colors"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
           </button>
         </div>
         {userProfile?.bio ? (
           <p className="text-white/90 text-sm mt-1 max-w-sm line-clamp-3 leading-snug drop-shadow">{userProfile.bio}</p>
         ) : (
           <p className="text-color-muted/80 text-sm mt-1 italic">No bio provided.</p>
         )}
         <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20 w-full">
           {userProfile?.createdAt ? (
             <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>Joined {new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
             </div>
           ) : <div />}
           {isOwner && (
             <button 
               onClick={onEditOpen}
               className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5"
             >
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
               Edit
             </button>
           )}
         </div>
      </div>
    </div>
  );
};
