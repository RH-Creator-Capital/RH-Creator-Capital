"use client";

import Link from "next/link";
import useSWR from "swr";
import { MarketCard, Market } from "@/components/MarketCard";
import { UserMarquee } from "@/components/UserMarquee";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LandingPage() {
  const { data } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/api/markets`, 
    fetcher
  );

  const calculateNextKeyPriceWei = (currentSupply: number) => {
    const s = BigInt(currentSupply || 0);
    const a = BigInt(1);
    const sum1 = s === BigInt(0) ? BigInt(0) : (s - BigInt(1)) * s * (BigInt(2) * s - BigInt(1)) / BigInt(6);
    const sum2 = s === BigInt(0) && a === BigInt(1) ? BigInt(0) : (s - BigInt(1) + a) * (s + a) * (BigInt(2) * (s + a) - BigInt(1)) / BigInt(6);
    const summation = sum2 - sum1;
    const ether = BigInt("1000000000000000000");
    return ((summation * ether) / BigInt(16000)).toString();
  };

  const markets: Market[] = data?.markets?.map((m: any) => {
    const currentPriceWei = m.currentPriceWei || calculateNextKeyPriceWei(m.supply);
    return {
      id: m.id,
      marketId: m.marketId,
      twitterHandle: m.twitterHandle,
      supply: m.supply,
      reserveWei: m.reserveWei,
      totalVolumeWei: m.totalVolumeWei,
      currentPriceWei,
      marketCapWei: m.marketCapWei || (BigInt(m.supply || 0) * BigInt(currentPriceWei)).toString(),
      holderCount: m.holderCount || 0,
      creatorFeeBps: m.creatorFeeBps || 30,
      username: m.twitterName || m.twitterHandle || "Unknown",
      avatarUrl: m.avatarUrl,
      bannerUrl: m.bannerUrl,
      sparkline: m.sparkline,
      ticker: m.ticker,
      description: m.description,
      websiteUrl: m.websiteUrl,
      telegramUrl: m.telegramUrl,
      claimed: m.claimed,
      createdAt: m.createdAt,
    };
  }) || [];

  return (
    <div className="min-h-screen bg-[#07090c] text-white overflow-hidden font-sans">
      
      <style>{`
        @keyframes pulse-beam-x {
          0% { transform: translateX(-100vw); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        @keyframes pulse-beam-y {
          0% { transform: translateY(-100vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .beam-x {
          animation: pulse-beam-x 6s linear infinite;
        }
        .beam-y {
          animation: pulse-beam-y 8s linear infinite;
        }
        .delay-1 { animation-delay: 1.5s; }
        .delay-2 { animation-delay: 3s; }
        .delay-3 { animation-delay: 4.5s; }
      `}</style>

      {/* Neon Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
        {/* Dark Overlay to fade the edges of the grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#07090c_80%)] z-10" />
        
        {/* The Static Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 197, 94, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 197, 94, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '160px 160px',
            backgroundPosition: 'center top'
          }}
        />
        
        {/* Moving Data Beams */}
        <div className="absolute inset-0 z-0">
           {/* Horizontal Beams */}
           <div className="absolute top-[160px] left-0 w-full h-[2px] overflow-hidden">
             <div className="w-[300px] h-full bg-gradient-to-r from-transparent via-color-buy to-transparent beam-x blur-[1px] opacity-80" />
           </div>
           <div className="absolute top-[480px] left-0 w-full h-[2px] overflow-hidden">
             <div className="w-[400px] h-full bg-gradient-to-r from-transparent via-color-buy to-transparent beam-x delay-2 blur-[1px] opacity-80" />
           </div>
           <div className="absolute top-[800px] left-0 w-full h-[2px] overflow-hidden">
             <div className="w-[200px] h-full bg-gradient-to-r from-transparent via-color-buy to-transparent beam-x delay-1 blur-[1px] opacity-80" />
           </div>
           
           {/* Vertical Beams */}
           <div className="absolute left-[calc(50%-160px)] top-0 w-[2px] h-full overflow-hidden">
             <div className="h-[300px] w-full bg-gradient-to-b from-transparent via-color-buy to-transparent beam-y delay-1 blur-[1px] opacity-80" />
           </div>
           <div className="absolute left-[calc(50%+320px)] top-0 w-[2px] h-full overflow-hidden">
             <div className="h-[400px] w-full bg-gradient-to-b from-transparent via-color-buy to-transparent beam-y delay-3 blur-[1px] opacity-80" />
           </div>
           <div className="absolute left-[calc(50%-480px)] top-0 w-[2px] h-full overflow-hidden">
             <div className="h-[200px] w-full bg-gradient-to-b from-transparent via-color-buy to-transparent beam-y delay-2 blur-[1px] opacity-80" />
           </div>
        </div>
        
        {/* Main Glowing Cross Intersection (Left) */}
        <div className="absolute top-[240px] left-[calc(50%-480px)]">
          {/* Horizontal Beam */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[2px] bg-color-buy blur-[3px] opacity-80" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[4px] bg-white blur-[4px] opacity-90" />
          
          {/* Vertical Beam */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[2px] bg-color-buy blur-[3px] opacity-80" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[200px] w-[4px] bg-white blur-[4px] opacity-90" />
          
          {/* Ambient Core Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-color-buy rounded-full blur-[60px] opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full blur-[20px] opacity-80" />
        </div>

        {/* Secondary Glowing Cross Intersection (Right/Bottom) */}
        <div className="absolute top-[560px] right-[calc(50%-480px)] opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[2px] bg-color-buy blur-[3px] opacity-70" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[2px] bg-color-buy blur-[3px] opacity-70" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-color-buy rounded-full blur-[50px] opacity-40" />
        </div>
      </div>

      <main className="w-full max-w-[120rem] mx-auto px-6 md:px-12 lg:px-20 relative z-10">
        
        {/* Hero Section */}
        <section className="pt-40 pb-28 flex flex-col items-center text-center">
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-color-muted">
              <span className="w-2 h-2 rounded-full bg-color-buy animate-pulse" />
              RH Creator Capital is live on Robinhood Chain
            </div>
            {process.env.NEXT_PUBLIC_TOKEN_CA && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium text-color-muted">
                CA: {process.env.NEXT_PUBLIC_TOKEN_CA}
              </div>
            )}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-6xl leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80 uppercase">
            Tokenized Social Capital<br/><span className="text-white/80 lowercase tracking-normal" style={{fontVariant: 'normal'}}>Every influencer becomes a market.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-color-muted max-w-3xl mb-14 font-light leading-relaxed">
            Trade Creator Keys tied to social influence, attention and community. Built on Robinhood Chain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
            <Link 
              href="/explore" 
              className="bg-color-buy text-[#07090c] font-semibold px-8 py-4 rounded-full hover:bg-opacity-90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2"
            >
              Explore Markets
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
            <Link
              href="/claim" 
              className="bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition-all flex items-center justify-center"
            >
              Apply as a Creator
            </Link>
          </div>
          
          <div className="mt-8 mb-6 text-xs font-mono text-color-muted flex flex-col md:flex-row items-center gap-2 md:gap-4 opacity-70">
            <span>95% of trading fees → creators</span>
            <span className="hidden md:inline">•</span>
            <span>5% → protocol</span>
            <span className="hidden md:inline">•</span>
            <span>100% of protocol revenue → $PSC buybacks</span>
          </div>
          
          <div className="-mx-6">
            <UserMarquee />
          </div>
        </section>

        {/* Featured Markets */}
        {markets && markets.length > 0 && (
          <section className="py-20 mt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-color-buy font-medium mb-2 text-sm tracking-wider uppercase">Explore</h4>
                <h2 className="text-3xl md:text-4xl font-bold text-white uppercase">Featured Social Markets</h2>
              </div>
              <Link href="/explore" className="text-color-muted hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...markets]
                .sort((a: any, b: any) => Number(b.totalVolumeWei) - Number(a.totalVolumeWei))
                .slice(0, 8)
                .map((market: any, idx: number) => (
                  <MarketCard key={market.marketId ?? idx} market={market} />
                ))}
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="py-24 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between mb-16 gap-8">
            <div>
              <h4 className="text-color-buy font-medium mb-2 text-sm tracking-wider uppercase">Mechanics</h4>
              <h2 className="text-3xl md:text-4xl font-bold text-white">How It Works</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Discover', desc: 'Find creator markets based on attention and social momentum.' },
              { step: '02', title: 'Trade', desc: 'Buy and sell Creator Keys on Robinhood Chain.' },
              { step: '03', title: 'Creators Earn', desc: 'Trading activity generates creator rewards.' },
              { step: '04', title: 'PSC Buyback', desc: 'Protocol revenue is used to buy back $PSC.' }
            ].map((item, idx) => (
              <div key={idx} className="group relative p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="text-white/40 font-mono text-lg mb-6 flex items-center justify-between group-hover:text-white/60 transition-colors">
                    <span>{item.step}</span>
                    <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                  <h3 className="text-xl font-medium text-white/90 mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-white/50 font-light text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Creator-First Economics */}
        <section className="py-24 border-t border-white/5 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h4 className="text-color-buy font-medium mb-2 text-sm tracking-wider uppercase">Creator-First Economics</h4>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Every trade rewards the creator behind the market.</h2>
            <div className="space-y-6 text-color-muted text-lg font-light leading-relaxed">
              <p>95% of every trading fee goes directly to the creator.</p>
              <p>The remaining 5% belongs to RH Creator Capital.</p>
              <p>100% of RH Creator Capital protocol trading revenue is used to buy back $PSC.</p>
            </div>
          </div>
          <div className="group bg-white/[0.02] border border-white/[0.03] rounded-3xl p-10 relative overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full blur-[60px] -mr-20 -mt-20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="space-y-8 relative z-10">
              <div className="pb-6 border-b border-white/[0.05]">
                <span className="text-4xl font-medium text-white/90 tracking-tight">1.25%</span>
                <p className="font-medium text-white/40 mt-2 tracking-wide text-sm">TOTAL TRADING FEE</p>
              </div>
              <div className="pb-6 border-b border-white/[0.05]">
                <span className="text-4xl font-medium text-white tracking-tight">95%</span>
                <p className="font-medium text-white/80 mt-2 tracking-wide text-sm">TO THE CREATOR</p>
              </div>
              <div className="pb-6 border-b border-white/[0.05]">
                <span className="text-4xl font-medium text-white/70 tracking-tight">5%</span>
                <p className="font-medium text-white/50 mt-2 tracking-wide text-sm">TO THE PROTOCOL</p>
              </div>
              <div>
                <span className="text-4xl font-medium text-white/90 tracking-tight">100%</span>
                <p className="font-medium text-white/60 mt-2 tracking-wide text-sm">OF PROTOCOL REVENUE → $PSC BUYBACK</p>
              </div>
            </div>
          </div>
        </section>

        {/* Creator Economy Flywheel */}
        <section className="py-24 border-t border-white/5 text-center">
          <h4 className="text-color-buy font-medium mb-2 text-sm tracking-wider uppercase">Growth Engine</h4>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-16">Creator Economy Flywheel</h2>
          
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full mx-auto pb-8">
            {['SOCIAL INFLUENCE', 'CREATOR MARKET', 'KEY TRADING', 'CREATOR REWARDS', 'PROTOCOL REVENUE', '$PSC BUYBACKS'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-4 md:gap-6">
                <div className="px-6 py-4 bg-white/[0.02] border border-white/[0.03] rounded-xl font-medium text-sm tracking-wide text-white/90 hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 cursor-default whitespace-nowrap">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <svg className="w-5 h-5 text-white/30 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-white/50 mt-12 max-w-2xl mx-auto font-light leading-relaxed">
            More creator activity generates more trading volume. More trading volume generates more creator rewards. Protocol revenue flows into $PSC buybacks.
          </p>
        </section>

        {/* Live Onchain Metrics */}
        <section className="py-24 border-t border-white/5">
          <div className="flex items-center gap-3 mb-12 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-color-buy animate-pulse" />
            <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Live Onchain Metrics</h2>
          </div>
          
          <div className={`grid grid-cols-2 md:grid-cols-3 ${process.env.NEXT_PUBLIC_RH_NETWORK === 'mainnet' ? 'lg:grid-cols-3 max-w-4xl' : 'lg:grid-cols-6 max-w-full'} gap-8 w-full mx-auto`}>
            {(() => {
              const totalMarkets = data?.markets?.length || 0;
              const totalTvl = (data?.markets?.reduce((acc: number, m: any) => acc + Number(m.reserveWei), 0) / 1e18 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const totalVol = (data?.markets?.reduce((acc: number, m: any) => acc + Number(m.totalVolumeWei), 0) / 1e18 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const totalHolders = data?.markets?.reduce((acc: number, m: any) => acc + (Number(m.holderCount) || 0), 0) || 0;
              
              // Note: placeholder for rewards until actual endpoint provided
              
              return (
                <>
                  <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">Total Volume</p>
                      <p className="text-3xl font-medium text-white/90 tracking-tight">{totalVol} <span className="text-sm font-normal text-white/40">ETH</span></p>
                    </div>
                  </div>
                  <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">Live Markets</p>
                      <p className="text-3xl font-medium text-white/90 tracking-tight">{totalMarkets}</p>
                    </div>
                  </div>
                  <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">Total Holders</p>
                      <p className="text-3xl font-medium text-white/90 tracking-tight">{totalHolders.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {process.env.NEXT_PUBLIC_RH_NETWORK !== 'mainnet' && (
                    <>
                      <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">Creator Rewards</p>
                          <p className="text-3xl font-medium text-white/90 tracking-tight">Coming Soon</p>
                        </div>
                      </div>
                      <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">Protocol Revenue</p>
                          <p className="text-3xl font-medium text-white/90 tracking-tight">Coming Soon</p>
                        </div>
                      </div>
                      <div className="group text-center p-6 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[30px] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <p className="text-white/40 text-xs mb-2 font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">$PSC Buyback Value</p>
                          <p className="text-3xl font-medium text-white/90 tracking-tight">Coming Soon</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </section>

        {/* Why RH Creator Capital */}
        <section className="py-24 border-t border-white/5">
          <div className="mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why RH Creator Capital</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 w-full mx-auto">
            <div className="group relative p-8 bg-white/[0.02] border border-white/[0.03] rounded-3xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <h3 className="text-xl font-medium text-white/90 mb-3 group-hover:text-white transition-colors">SOCIAL IDENTITY</h3>
                <p className="text-white/50 font-light leading-relaxed">Every creator can become a market.</p>
              </div>
            </div>
            <div className="group relative p-8 bg-white/[0.02] border border-white/[0.03] rounded-3xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <h3 className="text-xl font-medium text-white/90 mb-3 group-hover:text-white transition-colors">PRICE DISCOVERY</h3>
                <p className="text-white/50 font-light leading-relaxed">Attention and market activity create real-time price discovery.</p>
              </div>
            </div>
            <div className="group relative p-8 bg-white/[0.02] border border-white/[0.03] rounded-3xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <h3 className="text-xl font-medium text-white/90 mb-3 group-hover:text-white transition-colors">CREATOR REVENUE</h3>
                <p className="text-white/50 font-light leading-relaxed">Creators earn from trading activity around their market.</p>
              </div>
            </div>
            <div className="group relative p-8 bg-white/[0.02] border border-white/[0.03] rounded-3xl hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <h3 className="text-xl font-medium text-white/90 mb-3 group-hover:text-white transition-colors">ONCHAIN</h3>
                <p className="text-white/50 font-light leading-relaxed">Creator Key markets settle on Robinhood Chain.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live On Robinhood Chain Devnet (Proof) */}
        <section className="py-24 border-t border-white/5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 uppercase tracking-wide">Live On Robinhood Chain {process.env.NEXT_PUBLIC_RH_NETWORK === 'mainnet' ? 'Mainnet' : 'Devnet'}</h2>
          <div className="max-w-2xl mx-auto space-y-8">
            <p className="text-white/60 text-lg font-light leading-relaxed">
              Every Creator Key trade settles on Robinhood Chain. Markets, trades and creator activity can be independently verified onchain. No simulated transactions. No offchain market settlement.
            </p>
            
            <div className="group bg-white/[0.02] border border-white/[0.03] p-6 rounded-2xl inline-flex flex-col items-center gap-4 hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 text-center">
                <div className="text-xs text-white/40 uppercase tracking-widest font-medium mb-2">Protocol Contract Address</div>
                <div className="font-mono text-white/90 text-sm md:text-base break-all px-4 bg-black/40 py-2 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                  {process.env.NEXT_PUBLIC_RH_CREATOR_CAPITAL_ADDRESS || 'Deploying...'}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <a 
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/address/${process.env.NEXT_PUBLIC_RH_CREATOR_CAPITAL_ADDRESS || ''}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white/5 border border-white/10 text-white/90 font-medium px-6 py-3 rounded-full hover:bg-white/10 transition-colors text-sm"
              >
                View Protocol on Blockscout
              </a>
            </div>
          </div>
        </section>

        {/* Apply Section */}
        <section className="py-32 border-t border-color-buy/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-color-buy/5 to-transparent pointer-events-none" />
          <div className="relative z-10 text-center max-w-3xl mx-auto">
             <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white uppercase tracking-tight">YOUR SOCIAL CAPITAL ALREADY HAS VALUE.</h2>
             <p className="text-color-muted text-lg font-light leading-relaxed mb-12">
               Apply to list your creator market or claim an existing market linked to your X identity.
             </p>
             <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link href="/claim" className="bg-color-buy text-[#07090c] font-bold px-8 py-4 rounded-full hover:bg-opacity-90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                 Apply as a Creator
               </Link>
               <Link href="/claim" className="bg-[#161A22] border border-white/10 text-white font-bold px-8 py-4 rounded-full hover:bg-white/5 transition-all">
                 Claim Your Market
               </Link>
             </div>
          </div>
        </section>

      </main>

    </div>
  );
}
