import Link from "next/link";
import { ReactNode } from "react";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto w-full pt-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 bg-[#161A22]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="font-bold text-white mb-6 text-lg">Documentation</h3>
          <nav className="flex flex-col gap-3 text-sm">
            <a href="#overview" className="text-color-muted hover:text-color-buy transition-colors">Overview & MVP</a>
            <a href="#architecture" className="text-color-muted hover:text-color-buy transition-colors">Architecture</a>
            <a href="#smart-contracts" className="text-color-muted hover:text-color-buy transition-colors">Smart Contracts (Anchor)</a>
            <a href="#bonding-curve" className="text-color-muted hover:text-color-buy transition-colors">Bonding Curve Math</a>
            <a href="#flows" className="text-color-muted hover:text-color-buy transition-colors">Buy & Sell Flows</a>
            <a href="#fees" className="text-color-muted hover:text-color-buy transition-colors">Fee Architecture</a>
            <a href="#backend" className="text-color-muted hover:text-color-buy transition-colors">API & Realtime</a>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-32">
        <div className="bg-[#0F141A] border border-white/5 rounded-3xl p-8 md:p-12 prose prose-invert prose-emerald max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}
