export default function DocsPage() {
  return (
    <div className="space-y-16 text-white/80">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">RH Creator Capital</h1>
        <p className="text-xl text-color-muted font-light">
          Robinhood Chain API-First Developer Documentation
        </p>
      </div>

      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">1. Overview & MVP Goal</h2>
        <p className="leading-relaxed">
          RH Creator Capital is a social capital market built on Robinhood Chain. It enables users to create a market for creators, buy/sell Creator Keys, and perform price discovery on-chain while earning creator fees from trading activities.
        </p>
        <blockquote className="border-l-4 border-color-buy bg-white/5 p-4 rounded-r-lg italic">
          "On-chain first. API fast. UI simple."
        </blockquote>
        <h3 className="text-xl font-bold text-white mt-6">MVP Requirements</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>Connect Robinhood Chain wallet</li>
          <li>Create creator market</li>
          <li>Buy and Sell Creator Keys</li>
          <li>Bonding curve price discovery</li>
          <li>Real-time creator and protocol fees</li>
        </ul>
      </section>

      {/* 2. Architecture */}
      <section id="architecture" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">2. Architecture</h2>
        <p className="leading-relaxed">
          The platform uses a Robinhood Chain-first architecture. The API server is fast but the Robinhood Chain program is always the single source of truth for balances and final pricing.
        </p>
        <div className="bg-[#07090c] border border-white/10 p-6 rounded-xl font-mono text-sm text-color-buy overflow-x-auto">
          Wallet → Frontend → API Server → Robinhood Chain RPC → Anchor Program → Helius Webhook → Indexer → Postgres/Redis → Realtime WebSocket
        </div>
      </section>

      {/* 3. Smart Contracts */}
      <section id="smart-contracts" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">3. Smart Contracts (Anchor)</h2>
        <p className="leading-relaxed">
          The main program is `rh_creator_capital`. It utilizes Program Account Ledgers instead of standard SPL tokens for efficiency.
        </p>
        
        <h3 className="text-xl font-bold text-white mt-6">Key PDAs</h3>
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <h4 className="font-bold text-color-buy mb-2">Protocol Config PDA <code>["protocol"]</code></h4>
            <p className="text-sm">Holds authority, treasury, and global fee BPS settings.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <h4 className="font-bold text-color-buy mb-2">Creator Market PDA <code>["creator_market", creator_id]</code></h4>
            <p className="text-sm">Maintains supply, reserve wei, total volume, and specific creator fee settings. Uses immutable X ID.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
            <h4 className="font-bold text-color-buy mb-2">User Position PDA <code>["position", market, wallet]</code></h4>
            <p className="text-sm">Tracks exact key balances and PnL data per user per market without needing an SPL token mint.</p>
          </div>
        </div>
      </section>

      {/* 4. Bonding Curve Math */}
      <section id="bonding-curve" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">4. Bonding Curve Math</h2>
        <p className="leading-relaxed">
          Pricing is deterministic and calculated entirely on-chain using discrete quadratic pricing.
        </p>
        <div className="bg-[#07090c] border border-white/10 p-6 rounded-xl font-mono text-lg text-center text-white">
          Price(s) = base + k × s²
        </div>
        <p className="text-sm text-color-muted mt-2">
          *The frontend and API use this exact formula for quotes, but the smart contract acts as the final validator for slippage and bounds.
        </p>
      </section>

      {/* 5. Flows */}
      <section id="flows" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">5. Buy & Sell Flows</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold text-color-buy mb-4">Buy Flow</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Validate protocol and market active.</li>
              <li>Read current supply.</li>
              <li>Calculate exact curve cost.</li>
              <li>Calculate creator & protocol fees.</li>
              <li>Validate cost &lt;= `max_sol_cost`.</li>
              <li>Transfer ETH, route fees to vaults.</li>
              <li>Increase user balance and market supply.</li>
              <li>Emit `KeysPurchased` event.</li>
            </ol>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold text-color-sell mb-4">Sell Flow</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Validate key balance.</li>
              <li>Calculate return based on supply.</li>
              <li>Calculate fees.</li>
              <li>Validate net &gt;= `min_sol_received`.</li>
              <li>Reduce supply and balance.</li>
              <li>Transfer ETH to seller.</li>
              <li>Emit `KeysSold` event.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* 6. Fees */}
      <section id="fees" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">6. Fee Architecture</h2>
        <p className="leading-relaxed">
          RH Creator Capital separates accounting strictly. Reserve liquidity is never mixed with fees.
        </p>
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-white mb-4">Bonding Curve Fees (Before Graduation)</h3>
          <p className="text-color-muted mb-4">While your token is on the bonding curve, every trade generates a flat 1.25% fee.</p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Creator Fee:</strong> 0.30% - Routed to Creator Fee Vault PDA.</li>
            <li><strong>Protocol Fee:</strong> 0.95% - Routed to Protocol Treasury PDA.</li>
            <li><strong>Total Fee:</strong> 1.25%</li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-2xl font-semibold text-white mb-4">CreatorSwap Fees (Graduated Tokens)</h3>
          <p className="text-color-muted mb-4">Once graduated to CreatorSwap, the creator fee scales dynamically with market cap.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#161A22]">
                <tr className="border-b border-white/10 text-color-muted">
                  <th className="py-3 px-4 font-medium">Market Cap (SOL)</th>
                  <th className="py-3 px-4 font-medium text-color-buy">Creator Fee</th>
                  <th className="py-3 px-4 font-medium">Protocol Fee</th>
                  <th className="py-3 px-4 font-medium">LP Fee</th>
                  <th className="py-3 px-4 font-medium text-white">Total Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ["0 – 420", "0.300%", "0.930%", "0.020%", "1.250%"],
                  ["420 – 1,470", "0.950%", "0.050%", "0.200%", "1.200%"],
                  ["1,470 – 2,460", "0.900%", "0.050%", "0.200%", "1.150%"],
                  ["2,460 – 3,440", "0.850%", "0.050%", "0.200%", "1.100%"],
                  ["3,440 – 4,420", "0.800%", "0.050%", "0.200%", "1.050%"],
                  ["4,420 – 9,820", "0.750%", "0.050%", "0.200%", "1.000%"],
                  ["9,820 – 14,740", "0.700%", "0.050%", "0.200%", "0.950%"],
                  ["14,740 – 19,650", "0.650%", "0.050%", "0.200%", "0.900%"],
                  ["19,650 – 24,560", "0.600%", "0.050%", "0.200%", "0.850%"],
                  ["24,560 – 29,470", "0.550%", "0.050%", "0.200%", "0.800%"],
                  ["29,470 – 34,380", "0.500%", "0.050%", "0.200%", "0.750%"],
                  ["34,380 – 39,300", "0.450%", "0.050%", "0.200%", "0.700%"],
                  ["39,300 – 44,210", "0.400%", "0.050%", "0.200%", "0.650%"],
                  ["44,210 – 49,120", "0.350%", "0.050%", "0.200%", "0.600%"],
                  ["49,120 – 54,030", "0.300%", "0.050%", "0.200%", "0.550%"],
                  ["54,030 – 58,940", "0.275%", "0.050%", "0.200%", "0.525%"],
                  ["58,940 – 63,860", "0.250%", "0.050%", "0.200%", "0.500%"],
                  ["63,860 – 68,770", "0.225%", "0.050%", "0.200%", "0.475%"],
                  ["68,770 – 73,681", "0.200%", "0.050%", "0.200%", "0.450%"],
                  ["73,681 – 78,590", "0.175%", "0.050%", "0.200%", "0.425%"],
                  ["78,590 – 83,500", "0.150%", "0.050%", "0.200%", "0.400%"],
                  ["83,500 – 88,400", "0.125%", "0.050%", "0.200%", "0.375%"],
                  ["88,400 – 93,330", "0.100%", "0.050%", "0.200%", "0.350%"],
                  ["93,330 – 98,240", "0.075%", "0.050%", "0.200%", "0.325%"],
                  ["98,240+", "0.050%", "0.050%", "0.200%", "0.300%"]
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium">{row[0]}</td>
                    <td className="py-3 px-4 text-color-buy">{row[1]}</td>
                    <td className="py-3 px-4 text-white/70">{row[2]}</td>
                    <td className="py-3 px-4 text-white/70">{row[3]}</td>
                    <td className="py-3 px-4 font-medium text-white">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-yellow-500 text-sm">
          <strong>Security Note:</strong> The bonding curve reserve is completely isolated and cannot be used as protocol treasury.
        </div>
      </section>

      {/* 7. API & Realtime */}
      <section id="backend" className="scroll-mt-32 space-y-6">
        <h2 className="text-3xl font-bold text-white">7. API & Realtime</h2>
        <p className="text-color-muted text-lg">
          The API server provides metadata, search, charts, and realtime feeds, but <strong>never</strong> acts as the authority for balances or prices.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Stack:</strong> Node.js, Fastify, PostgreSQL (Drizzle), Redis, BullMQ.</li>
          <li><strong>Indexing:</strong> Listens to Anchor events via Helius Webhooks. Validates signatures and decodes events to update Postgres.</li>
          <li><strong>WebSockets:</strong> Pushes updates (trade, price_update, supply_update) to clients in under 2 seconds.</li>
        </ul>
      </section>
      
    </div>
  );
}
