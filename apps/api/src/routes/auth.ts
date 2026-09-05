import { FastifyInstance, FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db, users, activityLogs, creatorMarkets } from "@social-capital/db";
import { eq, and } from "drizzle-orm";
import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import jwt from "jsonwebtoken";
import { uniqueNamesGenerator, adjectives, colors, animals, NumberDictionary } from "unique-names-generator";
import { viemClient } from "../indexer";
import { rhCreatorCapitalAbi } from "../abis/rhCreatorCapital";

// Custom Web3 dictionary

const cryptoAdjectives = [
  "Based", "Degen", "Diamond", "Paper", "Moon", "Rug", "Savage", "Swift",
  "Quiet", "Neon", "Cyber", "Quantum", "Alpha", "Beta", "Sigma", "Chad",
  "Fresh", "Rare", "Epic", "Legendary", "Mystic", "Cosmic", "Galactic",
  "Bullish", "Bearish", "Wicked", "Fearless", "Reckless", "Steady", "Volatile",
  "Risky", "Smart", "Sharp", "Fast", "Lucky", "Unlucky", "Greedy", "Patient",
  "Bold", "Brave", "Aggressive", "Tactical", "Strategic", "Sneaky", "Clever",
  "Wild", "Crazy", "Insane", "Degenerate", "Unhinged", "Chaotic", "Cracked",
  "Goated", "Woke", "Dank", "Lunar", "Moonbound", "Moonshot", "Rugged",
  "Jeeted", "Aped", "Rekt", "Unrekt", "Ultra", "Mega", "Super", "Hyper",
  "Turbo", "Max", "Digital", "Virtual", "Synthetic", "Atomic", "Nuclear",
  "Plasma", "Electric", "Binary", "Encrypted", "Decentralized", "Autonomous",
  "Artificial", "Algorithmic", "Neural", "Holographic", "Infinite", "Parallel",
  "Orbital", "Stellar", "Astral", "Interstellar", "Singular", "Dimensional",
  "Mighty", "Powerful", "Supreme", "Ultimate", "Immortal", "Invincible",
  "Unstoppable", "Dominant", "Royal", "Golden", "Platinum", "Titan", "Colossal",
  "Massive", "Heavy", "Brutal", "Furious", "Deadly", "Dangerous", "Shadow",
  "Dark", "Phantom", "Ghostly", "Hidden", "Secret", "Unknown", "Anonymous",
  "Nameless", "Silent", "Invisible", "Obscure", "Arcane", "Cryptic", "Lost",
  "Forgotten", "Void", "Null", "Rapid", "Sonic", "Lightning", "Flash",
  "Velocity", "Supersonic", "Rocket", "Blazing", "Instant", "Frenzy", "Rush",
  "Nitro", "Warp", "Warped", "UltraRare", "Mythic", "Mythical", "Epic",
  "Ancient", "Eternal", "Timeless", "Primal", "Prime", "Genesis", "Origin",
  "First", "OG", "Classic", "Exclusive", "Elite", "Frozen", "Blazing",
  "Stormy", "Thunder", "Storm", "Volcanic", "Toxic", "Venomous", "Feral",
  "Arctic", "Infernal", "Solar", "Solaris", "Oceanic", "Desert", "Jungle",
  "Goofy", "Silly", "Nerdy", "Sleepy", "Hungry", "Broke", "Rich", "Poor",
  "Clueless", "Fearful", "Hopeless", "Hopium", "Copium", "Maximum", "Minimum",
  "Average", "Typical", "Random"
];

const cryptoNouns = [
  "Ape", "Whale", "Shrimp", "Jeet", "Chad", "Frog", "Cat", "Dog", "Doge",
  "Monkey", "Hunter", "Dodger", "Holder", "Hands", "Punk", "Ninja",
  "Pirate", "Ghost", "Bear", "Bull", "Shark", "Tiger", "Dragon",
  "Wolf", "Fox", "Lion", "Panther", "Leopard", "Cheetah", "Jaguar",
  "Cobra", "Viper", "Snake", "Python", "Scorpion", "Spider", "Raven",
  "Crow", "Hawk", "Eagle", "Falcon", "Owl", "Penguin", "Duck", "Goose",
  "Swan", "Chicken", "Rooster", "Parrot", "Turtle", "Tortoise", "Rabbit",
  "Bunny", "Hamster", "Mouse", "Rat", "Otter", "Beaver", "Badger", "Boar",
  "Bison", "Buffalo", "Horse", "Stallion", "Goat", "Ram", "Sheep", "Cow",
  "Pig", "Panda", "Koala", "Sloth", "Gorilla", "Orangutan", "Lemur",
  "Meerkat", "Mongoose", "Dolphin", "Orca", "Manta", "Squid", "Octopus",
  "Kraken", "Jellyfish", "Lobster", "Crab", "Piranha", "Marlin",
  "Swordfish", "Phoenix", "Griffin", "Hydra", "Titan", "Giant", "Goblin",
  "Wizard", "Mage", "Warlock", "Sorcerer", "Druid", "Demon", "Devil",
  "Angel", "Valkyrie", "Samurai", "Ronin", "Shogun", "Oni", "Vampire",
  "Werewolf", "Reaper", "Necromancer", "Trader", "Sniper", "Miner",
  "Builder", "Dev", "Founder", "Farmer", "Staker", "Validator", "Node",
  "Operator", "Watcher", "Scanner", "Researcher", "Analyst", "Strategist",
  "Investor", "Collector", "Flipper", "Swapper", "Hodler", "Maxi", "Shiller",
  "Caller", "Insider", "Arb", "Arbitrageur", "Hacker", "Coder", "Runner",
  "Specter", "Cipher", "Encryptor", "Decryptor", "Bot", "Botter", "Script",
  "Protocol", "Daemon", "Kernel", "Byte", "Bit", "Pixel", "Glitch", "Virus",
  "Firewall", "Proxy", "Warrior", "Soldier", "Knight", "Assassin",
  "Mercenary", "Gladiator", "Fighter", "Brawler", "Raider", "Ranger",
  "Gunner", "Commander", "Captain", "General", "Warlord", "Conqueror",
  "Rocket", "Moon", "Lambo", "Bag", "Bagholder", "Wallet", "Ledger",
  "Block", "Chain", "Token", "Coin", "Gem", "Diamond", "Candle", "Chart",
  "Pump", "Dump", "Rug", "Liquidity", "Pool", "Vault", "Bridge", "Oracle",
  "Contract", "Hash", "Phantom", "Void", "Zero", "One", "Echo", "Nova",
  "Orbit", "Comet", "Meteor", "Star", "Cosmos", "Galaxy", "Nebula",
  "Pioneer", "Voyager", "Explorer", "Nomad", "Drifter", "Wanderer",
  "Outlaw", "Rebel", "Renegade", "Maverick", "Legend", "Myth", "Oracle"
];
export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/challenge", async (request, reply) => {
    const { wallet } = request.query as { wallet: string };
    if (!wallet) return reply.status(400).send({ error: "Wallet address is required" });
    
    try {
      const nonce = crypto.randomUUID();
      const message = `Sign this message to verify your wallet for RH Creator Capital.\nNonce: ${nonce}`;
      
      await db.insert(users).values({
        walletAddress: wallet,
        nonce: nonce,
      }).onConflictDoUpdate({
        target: users.walletAddress,
        set: { nonce: nonce }
      });

      return reply.send({ success: true, message });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to generate challenge" });
    }
  });

  fastify.post("/verify", async (request, reply) => {
    const { wallet, signature, message } = request.body as { wallet: string, signature: string, message: string };
    
    if (!wallet || !signature || !message) {
      return reply.status(400).send({ success: false, error: "Missing required fields" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.walletAddress, wallet)
      });

      if (!user || !user.nonce) {
        return reply.status(404).send({ success: false, error: "Challenge not found for this wallet" });
      }

      // Verify the message matches our expected format and nonce
      const expectedMessage = `Sign this message to verify your wallet for RH Creator Capital.\nNonce: ${user.nonce}`;
      if (message !== expectedMessage) {
        return reply.status(400).send({ success: false, error: "Message does not match challenge" });
      }

      // Verify cryptographic signature
      const isValid = await verifyMessage({
        address: wallet as `0x${string}`,
        message: message,
        signature: signature as `0x${string}`
      });
      
      if (!isValid) {
        await db.insert(activityLogs).values({
          action: 'WALLET_LOGIN',
          walletAddress: wallet,
          details: JSON.stringify({ error: "Invalid signature" }),
          status: 'ERROR'
        });
        return reply.status(401).send({ success: false, error: "Invalid signature" });
      }

      // Prevent replay attacks and initialize default profile if needed
      let currentUsername = user.username;
      let currentAvatarUrl = user.avatarUrl;
      
      const getAvatarStyle = (seed: string) => {
        const styles = ["adventurer", "big-ears", "bottts", "bottts-neutral", "critters", "pixel-art", "voxel-art", "voxel-bot"];
        let hash = 0;
        for (let i = 0; i < Math.min(seed.length, 5); i++) hash += seed.charCodeAt(i);
        return styles[hash % styles.length];
      };

      if (!currentUsername) {
        // Generate a highly unique, memecoin-style username
        let isUnique = false;
        let newUsername = "";
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          // Combine crypto words with generic adjectives/colors for high entropy
          const dicts = [
            [cryptoAdjectives, adjectives, colors], // Pick one list for first word
            [cryptoNouns, animals] // Pick one list for second word
          ];
          
          const firstDict = dicts[0][Math.floor(Math.random() * dicts[0].length)];
          const secondDict = dicts[1][Math.floor(Math.random() * dicts[1].length)];
          
          newUsername = uniqueNamesGenerator({
            dictionaries: [firstDict, secondDict],
            separator: '',
            style: 'capital',
            length: 2
          });

          // Check DB for collision
          const existingUser = await db.query.users.findFirst({
            where: eq(users.username, newUsername)
          });
          
          if (!existingUser) {
            isUnique = true;
          }
          attempts++;
        }
        
        if (!isUnique) {
          // Fallback if somehow 10 attempts failed (very rare)
          newUsername = `User_${wallet.slice(0, 4)}${Math.floor(Math.random() * 1000)}`;
        }
        
        currentUsername = newUsername;
        currentAvatarUrl = `https://api.dicebear.com/10.x/${getAvatarStyle(wallet)}/svg?seed=${wallet}`;
        
        await db.update(users)
          .set({ 
            nonce: null,
            username: currentUsername,
            avatarUrl: currentAvatarUrl
          })
          .where(eq(users.walletAddress, wallet));
      } else {
        // User already has a profile, just clear the nonce
        await db.update(users)
          .set({ nonce: null })
          .where(eq(users.walletAddress, wallet));
      }

      // Generate JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error("JWT_SECRET is required");
      const token = jwt.sign({ wallet }, jwtSecret, { expiresIn: '7d' });

      await db.insert(activityLogs).values({
        action: 'WALLET_LOGIN',
        walletAddress: wallet,
        status: 'SUCCESS'
      });

      return reply.send({ success: true, token });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: "Failed to verify signature" });
    }
  });

  fastify.get("/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ success: false, error: "Missing authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return reply.status(500).send({ success: false, error: "JWT_SECRET is not configured" });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as { wallet: string };
      const user = await db.query.users.findFirst({
        where: eq(users.walletAddress, decoded.wallet)
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      return reply.send({
        success: true,
        user: {
          walletAddress: user.walletAddress,
          username: user.username || null,
          avatarUrl: user.avatarUrl || null,
        }
      });
    } catch (e) {
      return reply.status(401).send({ success: false, error: "Invalid token" });
    }
  });

  fastify.post("/claim-signature", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid authorization header" });
    }
    
    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return reply.status(500).send({ error: "JWT_SECRET is not configured" });
    }
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      return reply.status(401).send({ error: "Invalid token" });
    }
    
    const wallet = decoded.wallet;
    
    const { marketId, oauthToken } = request.body as { marketId: string, oauthToken?: string };
    if (!marketId) {
      return reply.status(400).send({ error: "marketId is required" });
    }

    try {
      // 1. Determine verified X handle (via oauthToken if provided, else DB)
      let verifiedHandle: string | null = null;
      
      if (oauthToken) {
        try {
          const decodedOAuth = jwt.verify(oauthToken, process.env.JWT_SECRET as string) as { twitterHandle: string };
          verifiedHandle = decodedOAuth.twitterHandle;
        } catch (e) {
          fastify.log.error("Invalid oauth token provided for claim signature");
        }
      }
      
      if (!verifiedHandle) {
        return reply.status(403).send({ error: "X account session expired or not provided. Please authenticate again." });
      }

      // 2. Fetch market to verify ownership (Check DB first, then fallback to RPC)
      let isOwner = false;
      const network = process.env.EVM_NETWORK as string;
      const market = await db.query.creatorMarkets.findFirst({
        where: and(eq(creatorMarkets.network, network), eq(creatorMarkets.marketId, marketId))
      });

      if (market) {
        isOwner = (market.twitterHandle.toLowerCase() === verifiedHandle.toLowerCase());
      } else {
        return reply.status(404).send({ error: "Market not found in DB (wait for indexer)" });
      }

      if (!isOwner) {
        return reply.status(403).send({ error: "X account does not match market creator" });
      }

      // 3. Generate EIP-712 Signature
      const backendSecretKeyString = process.env.BACKEND_SIGNER_PRIVATE_KEY;
      if (!backendSecretKeyString) {
        return reply.status(500).send({ error: "BACKEND_SIGNER_PRIVATE_KEY not configured" });
      }

      const account = privateKeyToAccount(backendSecretKeyString.startsWith('0x') ? backendSecretKeyString as `0x${string}` : `0x${backendSecretKeyString}`);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour validity

      // Fetch the current nonce directly from the Smart Contract
      const contractAddress = process.env.RH_CREATOR_CAPITAL_ADDRESS as `0x${string}`;
      const currentNonce = await viemClient.readContract({
        address: contractAddress,
        abi: rhCreatorCapitalAbi,
        functionName: 'nonces',
        args: [wallet as `0x${string}`]
      });
      const claimNonce = BigInt(currentNonce as bigint);

      const domain = {
        name: 'RHCreatorCapital',
        version: '1',
        chainId: Number(process.env.CHAIN_ID),
        verifyingContract: contractAddress,
      };

      const types = {
        ClaimCreator: [
          { name: 'marketId', type: 'bytes32' },
          { name: 'xUserId', type: 'string' },
          { name: 'creatorWallet', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };

      const signature = await account.signTypedData({
        domain,
        types,
        primaryType: 'ClaimCreator',
        message: {
          marketId: marketId as `0x${string}`,
          xUserId: verifiedHandle,
          creatorWallet: wallet as `0x${string}`,
          nonce: claimNonce,
          deadline
        }
      });

      return reply.send({
        success: true,
        txHash: signature,
        deadline: deadline.toString(),
        nonce: claimNonce.toString(),
        pubkey: account.address
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to generate signature" });
    }
  });
};
