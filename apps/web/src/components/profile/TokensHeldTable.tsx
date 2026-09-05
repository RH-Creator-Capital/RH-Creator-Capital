import React from 'react';
import Link from 'next/link';

interface TokensHeldTableProps {
  positions: any[];
}

export const TokensHeldTable: React.FC<TokensHeldTableProps> = ({ positions }) => {
  return (
    <section className="bg-background border-y border-color-border py-6 shadow-lg transition-colors group overflow-x-auto -mx-4 lg:-mx-8">
      {positions.length === 0 ? (
         <div className="text-center py-12 text-color-muted">You do not own any creator keys yet. <br/><Link href="/" className="text-color-buy hover:underline mt-2 inline-block">Explore Markets</Link></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-color-muted border-b border-color-border">
                <th className="pb-4 pl-4 lg:pl-8 font-medium">Creator Address</th>
                <th className="pb-4 font-medium">Balance (Keys)</th>
                <th className="pb-4 font-medium">Total Value (ETH)</th>
                <th className="pb-4 pr-4 lg:pr-8 font-medium">PnL (ETH)</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {positions.map((pos: any, i: number) => {
                const rawValSol = Number(pos.currentValueWei) / 1e18;
                const valSol = rawValSol < 0.0001 && rawValSol > 0 ? rawValSol.toFixed(6) : rawValSol.toFixed(4);
                
                const rawPnlSol = Number(pos.pnlWei) / 1e18;
                const absPnlSol = Math.abs(rawPnlSol);
                const pnlSol = absPnlSol < 0.0001 && absPnlSol > 0 ? absPnlSol.toFixed(6) : absPnlSol.toFixed(4);
                
                const isPositive = rawPnlSol >= 0;
                const shortMarket = `${pos.marketId.substring(0,8)}...`;
                const marketName = pos.marketDetails?.twitterHandle || "Unknown Creator";
                const avatarUrl = pos.marketDetails?.avatarUrl || `https://api.dicebear.com/10.x/bottts/svg?seed=${pos.marketId}`;
                
                return (
                  <tr key={i} className="border-b border-color-border/50 hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-4 lg:pl-8 font-semibold hover:underline">
                      <Link href={`/creator/${pos.marketId}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-color-border/50 bg-[#161A22]">
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-white text-base truncate">{marketName}</span>
                          <span className="text-color-buy text-xs font-normal mt-0.5 truncate">{shortMarket}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-4">{pos.keyBalance}</td>
                    <td className="py-4 font-medium">{valSol}</td>
                    <td className={`py-4 pr-4 lg:pr-8 font-semibold ${isPositive ? 'text-color-buy' : 'text-color-sell'}`}>
                      {isPositive ? '+' : ''}{pnlSol}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
