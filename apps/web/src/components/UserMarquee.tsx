import dummyUsers from "../../../../packages/db/dummy_users.json";

export function UserMarquee() {
  // Duplicate the array to create a seamless infinite scrolling effect
  const marqueeUsers = [...dummyUsers, ...dummyUsers, ...dummyUsers, ...dummyUsers];
  
  // Second row uses a shifted version of the users so they don't perfectly align vertically
  const secondRowUsers = [...dummyUsers.slice(5), ...dummyUsers.slice(0, 5)];
  const marqueeUsers2 = [...secondRowUsers, ...secondRowUsers, ...secondRowUsers, ...secondRowUsers];

  return (
    <div className="w-[100vw] relative left-1/2 -translate-x-1/2 overflow-hidden py-10 bg-gradient-to-b from-transparent via-[#161A22]/30 to-transparent flex flex-col gap-6">
      {/* Left/Right Fade out gradient masks */}
      <div className="absolute top-0 bottom-0 left-0 w-24 md:w-48 z-10 bg-gradient-to-r from-[#07090c] to-transparent pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 md:w-48 z-10 bg-gradient-to-l from-[#07090c] to-transparent pointer-events-none" />
      
      {/* Row 1: Right to Left */}
      <div className="flex w-max animate-marquee gap-4">
        {marqueeUsers.map((user, idx) => (
          <div 
            key={`row1-${user.username}-${idx}`} 
            className="group flex items-center gap-3 p-2 pr-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-colors duration-300"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img 
                  src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.name} 
                  className="w-full h-full object-cover bg-white/5"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
                  }}
                />
              </div>
              <a 
                href={`https://x.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute -bottom-2 -right-2 bg-[#07090c] rounded-full p-1.5 opacity-60 hover:opacity-100 hover:text-white transition-opacity"
                title={`Visit @${user.username} on X`}
              >
                <svg className="w-3.5 h-3.5 text-current" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="text-white/90 font-medium text-sm tracking-tight leading-tight">{user.name}</span>
              <span className="text-white/50 text-xs mt-0.5">@{user.username}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Left to Right */}
      <div className="flex w-max animate-marquee-reverse gap-4">
        {marqueeUsers2.map((user, idx) => (
          <div 
            key={`row2-${user.username}-${idx}`} 
            className="group flex items-center gap-3 p-2 pr-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-colors duration-300"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img 
                  src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.name} 
                  className="w-full h-full object-cover bg-white/5"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
                  }}
                />
              </div>
              <a 
                href={`https://x.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute -bottom-2 -right-2 bg-[#07090c] rounded-full p-1.5 opacity-60 hover:opacity-100 hover:text-white transition-opacity"
                title={`Visit @${user.username} on X`}
              >
                <svg className="w-3.5 h-3.5 text-current" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="text-white/90 font-medium text-sm tracking-tight leading-tight">{user.name}</span>
              <span className="text-white/50 text-xs mt-0.5">@{user.username}</span>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 4)); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(calc(-100% / 4)); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 40s linear infinite;
        }
        .animate-marquee:hover, .animate-marquee-reverse:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
