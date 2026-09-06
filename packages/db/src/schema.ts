import { pgTable, serial, text, timestamp, boolean, bigint, uuid, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: text("wallet_address").unique().notNull(),
  nonce: text("nonce"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creatorMarkets = pgTable("creator_markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  twitterHandle: text("twitter_handle").unique().notNull(), // The raw Twitter handle string
  twitterName: text("twitter_name"), // Display name from Twitter
  creatorIdHex: text("creator_id_hex").unique().notNull(), // The 32-byte hash/id
  creatorWallet: text("creator_wallet").notNull(),
  marketId: text("market_id").unique().notNull(), // Replaced marketPda with marketId
  ticker: text("ticker").notNull().default(""), // Ticker symbol
  websiteUrl: text("website_url"),
  telegramUrl: text("telegram_url"),
  description: text("description"),
  bannerUrl: text("banner_url"),
  category: text("category").default("Regular User"),
  avatarUrl: text("avatar_url"), // Cached avatar from Twitter
  supply: bigint("supply", { mode: "number" }).default(0).notNull(),
  reserveWei: text("reserve_wei").default("0").notNull(), // EVM wei can exceed JS max safe integer
  totalVolumeWei: text("total_volume_wei").default("0").notNull(), 
  claimed: boolean("claimed").default(false).notNull(),
  paused: boolean("paused").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by"), // Wallet that actually created the market
  createTxHash: text("create_tx_hash"), // Transaction hash for market creation
  claimTxHash: text("claim_tx_hash"), // Transaction hash for market claim
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPositions = pgTable("user_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  walletAddress: text("wallet_address").notNull(),
  marketId: text("market_id").notNull(),
  positionId: text("position_id").unique().notNull(), // Replaced positionPda
  keyBalance: bigint("key_balance", { mode: "number" }).default(0).notNull(),
  totalBoughtWei: text("total_bought_wei").default("0").notNull(),
  totalSoldWei: text("total_sold_wei").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tradeHistory = pgTable("trade_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  txHash: text("tx_hash").unique().notNull(), // Replaced signature with txHash
  marketId: text("market_id").notNull(),
  traderWallet: text("trader_wallet").notNull(),
  tradeType: text("trade_type").notNull(), // "buy" or "sell"
  amount: bigint("amount", { mode: "number" }).notNull(),
  ethAmountWei: text("eth_amount_wei").notNull(), // the amount of ETH paid or received
  feeWei: text("fee_wei").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const priceCandles = pgTable("price_candles", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  marketId: text("market_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  resolution: text("resolution").notNull(), // "1m", "5m", "15m", "1h", "1d"
  open: text("open").notNull(), // stored as wei string
  high: text("high").notNull(),
  low: text("low").notNull(),
  close: text("close").notNull(),
  volumeWei: text("volume_wei").default("0").notNull(),
}, (t) => ({
  unq: unique().on(t.marketId, t.resolution, t.timestamp, t.network)
}));

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  action: text("action").notNull(), // 'WALLET_LOGIN', 'TWITTER_LINK', 'WEBHOOK_RECEIVED', 'MARKET_CREATED', 'TRADE_BUY', 'TRADE_SELL'
  walletAddress: text("wallet_address"), // The user associated with the action, if any
  details: text("details"), // JSON string of extra context (payload, errors, etc)
  status: text("status").notNull(), // 'SUCCESS', 'ERROR', 'WARNING'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feeWithdrawals = pgTable("fee_withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  txHash: text("tx_hash").unique().notNull(),
  marketId: text("market_id").notNull(),
  creatorWallet: text("creator_wallet").notNull(),
  amountWei: text("amount_wei").notNull(), // wei withdrawn
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// TODO: Add `marketId` column to link each fee to a specific market,
// enabling avatar display in the Protocol Fee Inflows UI.
export const protocolFees = pgTable("protocol_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  txHash: text("tx_hash").unique().notNull(),
  amountWei: text("amount_wei").notNull(), // wei collected
  // TODO: marketId: text("market_id") — add after updating indexer/webhook
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const pscBuybacks = pgTable("psc_buybacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  signature: text("signature").unique().notNull(),
  caller: text("caller").notNull(),
  solSpent: bigint("sol_spent", { mode: "number" }).notNull(),
  pscReceived: bigint("psc_received", { mode: "number" }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const pscBurns = pgTable("psc_burns", {
  id: uuid("id").primaryKey().defaultRandom(),
  network: text("network").notNull().default("devnet"),
  signature: text("signature").unique().notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(), // RCC tokens burned
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
