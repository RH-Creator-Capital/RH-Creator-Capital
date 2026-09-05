# Pump-Social-Capital - Frontend (Web)

This is the frontend application for **Pump-Social-Capital**, a decentralized platform enabling creators to launch personal tokens via bonding curves on the Solana blockchain.

Built with [Next.js](https://nextjs.org) (App Router), [Tailwind CSS v4](https://tailwindcss.com), and standard Solana wallet adapters.

## Prerequisites

Before running this application, ensure that you have the following running locally or accessible remotely:
1. **Solana Localnet/Mainnet**: A running Solana validator/test-ledger with the Anchor program deployed.
2. **Backend API**: The Fastify backend (from `apps/api`) running, which serves market data, price candles, and WebSocket updates.

## Getting Started

First, install the dependencies from the monorepo root:

```bash
pnpm install
```

Make sure your environment variables are set correctly in `apps/web/.env.local`. Copy from `.env.example` if available, and ensure `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WS_URL` point to your running infrastructure.

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

- **`src/app/`**: Next.js App Router pages (Home, Claim, Creator Dashboard).
- **`src/components/`**: React components.
  - `TradingWidget.tsx`: Interface for buying/selling creator keys.
  - `ChartComponent.tsx`: Real-time trading chart using lightweight-charts.
  - `WalletContextProvider.tsx`: Solana wallet connection wrapper.

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS v4 (Retro/Hacker aesthetic)
- **Blockchain**: `@solana/web3.js`, `@solana/wallet-adapter-react`
- **Charts**: `lightweight-charts`
