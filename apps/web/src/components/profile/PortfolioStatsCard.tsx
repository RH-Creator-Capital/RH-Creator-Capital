import React from 'react';

interface PortfolioStatsCardProps {
  totalValueEth: string;
  totalKeys: number;
  totalPnLWei: bigint;
  totalPnLEth: string;
  totalFeesSol: string;
  netProfitWei: bigint;
  netProfitEth: string;
}

export const PortfolioStatsCard: React.FC<PortfolioStatsCardProps> = ({
  totalValueEth,
  totalKeys,
  totalPnLWei,
  totalPnLEth,
  totalFeesSol,
  netProfitWei,
  netProfitEth,
}) => {
  return (
    <div className="w-full bg-background rounded-xl p-6 border border-color-border shadow-lg text-left hover:border-color-buy/50 transition-colors group">
      <h2 className="text-base font-bold text-white mb-4">Portfolio Stats</h2>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex justify-between border-b border-color-border/50 pb-3">
          <span className="text-color-muted">Portfolio Value</span>
          <span className="font-semibold text-white">{totalValueEth} ETH</span>
        </div>
        <div className="flex justify-between border-b border-color-border/50 pb-3">
          <span className="text-color-muted">Keys Owned</span>
          <span className="font-semibold text-white">{totalKeys}</span>
        </div>
        <div className="flex justify-between border-b border-color-border/50 pb-3">
          <span className="text-color-muted">Trading PnL</span>
          <span className={`font-semibold ${totalPnLWei >= 0 ? 'text-color-buy' : 'text-color-sell'}`}>
            {totalPnLWei >= 0 ? '+' : ''}{totalPnLEth} ETH
          </span>
        </div>
        <div className="flex justify-between border-b border-color-border/50 pb-3">
          <span className="text-color-muted">Creator Fees</span>
          <span className="font-semibold text-blue-400">
            +{totalFeesSol} ETH
          </span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-color-muted">Total Net Profit</span>
          <span className={`font-semibold ${netProfitWei >= 0 ? 'text-color-buy' : 'text-color-sell'}`}>
            {netProfitWei >= 0 ? '+' : ''}{netProfitEth} ETH
          </span>
        </div>
      </div>
    </div>
  );
};
