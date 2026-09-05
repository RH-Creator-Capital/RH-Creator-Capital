"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProtocolDashboard() {
  const { data: statsData, isLoading: isStatsLoading } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/protocol/stats`, fetcher);
  const { data: logsData, isLoading: isLogsLoading } = useSWR(`${process.env.NEXT_PUBLIC_API_URL}/api/protocol/logs`, fetcher);

  const isLoading = isStatsLoading || isLogsLoading;

  const stats = statsData?.stats || {
    totalProtocolFeesWei: 0,
    totalBuybackSolSpentWei: 0,
    totalPscBought: 0,
    totalPscBurned: 0,
  };

  const formatEth = (wei: number | string) => {
    const sol = Number(wei) / 1e18;
    if (sol === 0) return "0.0000";
    return sol < 0.0001 ? sol.toFixed(6) : sol.toFixed(4);
  };

  const feesSol = formatEth(stats.totalProtocolFeesWei);
  const buybackEth = formatEth(stats.totalBuybackSolSpentWei);
  const pscBought = (Number(stats.totalPscBought) / 1e6).toFixed(2);
  const pscBurned = (Number(stats.totalPscBurned) / 1e6).toFixed(2);

  const keeperLogs = logsData?.keeperLogs || [];
  const recentFees = logsData?.recentFees || [];

  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK as string;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-0 pb-12 lg:pb-0 lg:-my-6 lg:min-h-[85vh] animate-pulse">
        <div className="lg:col-span-3 flex flex-col gap-6 lg:border-r lg:border-color-border/30 lg:pr-8 lg:py-6">
          <div className="h-6 w-48 bg-white/5 rounded mb-2"></div>
          <div className="h-4 w-64 bg-white/5 rounded mb-6"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-background border border-color-border/50 rounded-xl p-5 h-28"></div>
          ))}
        </div>
        <div className="lg:col-span-6 flex flex-col gap-6 lg:px-8 lg:py-6">
          <div className="h-6 w-40 bg-white/5 rounded"></div>
          <div className="bg-background border-y border-color-border -mx-4 lg:-mx-8 h-[500px]"></div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-6 lg:border-l lg:border-color-border/30 lg:pl-8 lg:py-6">
          <div className="h-6 w-40 bg-white/5 rounded"></div>
          <div className="bg-background border border-color-border/50 rounded-xl h-[500px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-0 pb-12 lg:pb-0 lg:-my-6 lg:min-h-[85vh]">

      {/* ──── Left Column: Header + KPI Stats ──── */}
      <div className="lg:col-span-3 flex flex-col gap-5 lg:border-r lg:border-color-border/30 lg:pr-8 lg:py-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Protocol Dashboard</h1>
          <p className="text-color-muted text-xs leading-relaxed">Transparent tracking of protocol fees, automated buybacks, and $PSC burns.</p>
        </div>

        {/* KPI Cards — same style as PortfolioStatsCard */}
        <div className="w-full bg-background rounded-xl p-6 border border-color-border shadow-lg text-left hover:border-color-buy/50 transition-colors group">
          <h2 className="text-base font-bold text-white mb-4">Protocol Stats</h2>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between border-b border-color-border/50 pb-3">
              <span className="text-color-muted">Total Protocol Fees</span>
              <span className="font-semibold text-white">{feesSol} ETH</span>
            </div>
            <div className="flex justify-between border-b border-color-border/50 pb-3">
              <span className="text-color-muted">Total ETH Deployed</span>
              <span className="font-semibold text-white">{buybackEth} ETH</span>
            </div>
            <div className="flex justify-between border-b border-color-border/50 pb-3">
              <span className="text-color-muted">$PSC Acquired</span>
              <span className="font-semibold text-white">{pscBought} $PSC</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-color-muted">$PSC Burned</span>
              <span className="font-semibold text-color-sell">{pscBurned} $PSC</span>
            </div>
          </div>
        </div>
      </div>

      {/* ──── Middle Column: Protocol Fee Inflows ──── */}
      <div className="lg:col-span-6 flex flex-col gap-4 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Protocol Fee Inflows</h2>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-color-muted">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-color-buy opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-color-buy"></span>
            </span>
            Live
          </span>
        </div>

        <section className="bg-background border-y border-color-border py-4 shadow-lg overflow-y-auto -mx-4 lg:-mx-8" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {recentFees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-color-muted">
              <p className="text-sm">No fee inflows yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* TODO: Display market avatar once `marketId` is added to protocol_fees table */}
              {recentFees.map((fee: any, idx: number) => (
                <div 
                  key={fee.id} 
                  className={`flex items-center justify-between px-4 lg:px-8 py-3.5 hover:bg-white/[0.03] transition-colors ${idx !== recentFees.length - 1 ? 'border-b border-color-border/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-color-border/50 bg-[#161A22] shrink-0">
                      <img src={`https://api.dicebear.com/10.x/critters/svg?seed=${fee.signature}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-mono text-sm font-semibold">+{formatEth(fee.amount)} ETH</span>
                      <a 
                        href={`https://solscan.io/tx/${fee.signature}${network === 'devnet' ? '?cluster=devnet' : ''}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-color-buy hover:underline text-xs flex items-center gap-1 transition-colors mt-0.5"
                      >
                        {fee.signature.substring(0, 6)}...{fee.signature.substring(fee.signature.length - 4)}
                        <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    </div>
                  </div>
                  <span className="text-color-muted text-[11px] shrink-0 ml-3">
                    {new Date(fee.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ──── Right Column: Keeper Execution Logs ──── */}
      <div className="lg:col-span-3 flex flex-col gap-4 lg:border-l lg:border-color-border/30 lg:pl-8 lg:py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Keeper Logs</h2>
          <span className="text-color-muted text-xs font-semibold">{keeperLogs.length} total</span>
        </div>

        {keeperLogs.length === 0 ? (
          <div className="bg-background border border-color-border rounded-xl p-6 text-center shadow-lg hover:border-color-buy/50 transition-colors group">
            <p className="text-color-muted text-sm">No keeper executions yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {keeperLogs.map((log: any) => {
              const details = JSON.parse(log.details || "{}");
              const isSuccess = log.status === "SUCCESS";
              const isSkipped = log.status === "SKIPPED";

              return (
                <div key={log.id} className="bg-background border border-color-border/50 rounded-xl p-3 shadow-lg hover:border-color-buy/50 transition-colors group flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSuccess ? 'bg-color-buy/15 text-color-buy' : isSkipped ? 'bg-white/5 text-color-muted' : 'bg-color-sell/15 text-color-sell'}`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-color-muted">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-color-muted font-mono bg-white/[0.02] border border-color-border/30 p-2.5 rounded-lg break-words leading-relaxed">
                    {isSkipped && details.reason && `${details.reason} (Vault: ${formatEth(details.vaultBalance || 0)} ETH)`}
                    {isSuccess && `Spent: ${formatEth(details.ethSpent || 0)} ETH | Burned: ${(details.pscReceived / 1e6).toFixed(2)} PSC`}
                    {!isSkipped && !isSuccess && (log.errorMessage || "Unknown Error")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
