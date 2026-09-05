import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db, users, creatorMarkets, activityLogs } from "@social-capital/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { TwitterApi } from "twitter-api-v2";

// Temporary in-memory store for PKCE state and code_verifier
// In production, this should be Redis or similar.
const authStateStore = new Map<string, { codeVerifier: string, redirectUrl: string }>();

interface LoginQuery {
  redirect_to?: string;
}

interface CallbackQuery {
  state?: string;
  code?: string;
  error?: string;
}

interface LinkBody {
  walletToken: string;
  oauthToken: string;
}

const getConfig = () => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const callbackUrl = process.env.TWITTER_CALLBACK_URL;
  const jwtSecret = process.env.JWT_SECRET;

  if (!clientId || !clientSecret || !callbackUrl || !jwtSecret) {
    throw new Error("Missing required OAuth environment variables configuration.");
  }

  return { clientId, clientSecret, callbackUrl, jwtSecret };
};

export const oauthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  
  fastify.get<{ Querystring: LoginQuery }>("/twitter/login", async (request, reply) => {
    const { redirect_to } = request.query;
    
    if (!redirect_to) {
      return reply.status(400).send({ error: "redirect_to is required" });
    }

    const config = getConfig();
    const client = new TwitterApi({ clientId: config.clientId, clientSecret: config.clientSecret });
    
    // Generate auth URL
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      config.callbackUrl,
      { scope: ['tweet.read', 'users.read'] }
    );
    
    // Store codeVerifier and original redirect intent
    authStateStore.set(state, { 
      codeVerifier, 
      redirectUrl: redirect_to 
    });
    
    // Redirect to Twitter
    return reply.redirect(url);
  });
  
  fastify.get<{ Querystring: CallbackQuery }>("/twitter/callback", async (request, reply) => {
    const { state, code, error } = request.query;

    if (error) {
      return reply.status(403).send({ error: "User denied the authorization" });
    }

    if (!state || !code) {
      return reply.status(400).send({ error: "Missing state or code parameters" });
    }

    const session = authStateStore.get(state);
    if (!session) {
      return reply.status(400).send({ error: "Invalid state parameter or session expired" });
    }

    const config = getConfig();
    const client = new TwitterApi({ clientId: config.clientId, clientSecret: config.clientSecret });

    try {
      // Exchange code for access token
      const { client: loggedClient } = await client.loginWithOAuth2({
        code,
        codeVerifier: session.codeVerifier,
        redirectUri: config.callbackUrl
      });
      
      // Clear session
      authStateStore.delete(state);

      // Fetch user profile info
      const user = await loggedClient.v2.me({ 'user.fields': ['profile_image_url'] });
      const twitterHandle = user.data.username;
      const twitterName = user.data.name;
      const avatarUrl = user.data.profile_image_url;
      
      // Create OAuth token for our frontend to use
      const oauthToken = jwt.sign(
        { twitterHandle, twitterName, avatarUrl, isOAuth: true }, 
        config.jwtSecret, 
        { expiresIn: '15m' }
      );
      
      // Redirect back to frontend
      const redirectUrlObj = new URL(session.redirectUrl);
      redirectUrlObj.searchParams.append("oauth_token", oauthToken);
      redirectUrlObj.searchParams.append("handle", twitterHandle);
      redirectUrlObj.searchParams.append("name", twitterName);
      if (avatarUrl) {
        redirectUrlObj.searchParams.append("avatarUrl", avatarUrl);
      }
      return reply.redirect(redirectUrlObj.toString());
      
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Failed to authenticate with Twitter" });
    }
  });

  fastify.post<{ Body: LinkBody }>("/twitter/link", async (request, reply) => {
    // This endpoint links a verified wallet (via wallet auth token) with an OAuth token
    const { walletToken, oauthToken } = request.body;
    
    if (!walletToken || !oauthToken) {
      return reply.status(400).send({ success: false, error: "Missing tokens" });
    }
    
    const config = getConfig();
    
    try {
      // Verify wallet token
      const decodedWallet = jwt.verify(walletToken, config.jwtSecret) as { wallet: string };
      
      // Verify OAuth token
      const decodedOAuth = jwt.verify(oauthToken, config.jwtSecret) as { twitterHandle: string, twitterName?: string, avatarUrl?: string, isOAuth: boolean };
      
      if (!decodedOAuth.isOAuth) {
        return reply.status(400).send({ success: false, error: "Invalid OAuth token type" });
      }
      
      // Also update the cached avatar in creator_markets if it exists
      await db.update(creatorMarkets)
        .set({ 
          avatarUrl: decodedOAuth.avatarUrl,
          twitterName: decodedOAuth.twitterName
        })
        .where(eq(creatorMarkets.twitterHandle, decodedOAuth.twitterHandle));
      
      await db.insert(activityLogs).values({
        action: 'TWITTER_LINK',
        walletAddress: decodedWallet.wallet,
        details: JSON.stringify({ twitterHandle: decodedOAuth.twitterHandle }),
        status: 'SUCCESS'
      });
        
      return reply.send({ 
        success: true, 
        twitterHandle: decodedOAuth.twitterHandle 
      });
      
    } catch (e) {
      fastify.log.error(e);
      await db.insert(activityLogs).values({
        action: 'TWITTER_LINK',
        details: JSON.stringify({ error: "Invalid or expired tokens" }),
        status: 'ERROR'
      });
      return reply.status(401).send({ success: false, error: "Invalid or expired tokens" });
    }
  });
};
