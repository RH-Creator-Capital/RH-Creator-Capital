import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="relative z-10 py-12 border-t border-color-border/30 bg-[#07090c] mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="text-xl font-bold tracking-widest text-white uppercase flex items-center gap-2">
            <span className="text-color-buy">/</span>RH Creator Capital
          </Link>
          <span className="text-white/40 text-xs uppercase tracking-widest">
            Monetize your social graph on Robinhood Chain
          </span>
        </div>
        
        <div className="flex items-center gap-8">
          <Link href="/explore" className="text-white/50 hover:text-white text-sm font-medium transition-colors">Explore</Link>
          <Link href="/protocol" className="text-white/50 hover:text-white text-sm font-medium transition-colors">Protocol</Link>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.007 3.969H5.078z"></path></svg>
          </a>
        </div>
      </div>
    </footer>
  );
};
