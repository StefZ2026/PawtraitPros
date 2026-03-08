import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { ADMIN_EMAIL, resolveOrg } from "./helpers";

// --- Instagram Integration via Ayrshare ---
const AYRSHARE_API_URL = 'https://api.ayrshare.com/api';

function getAyrshareHeaders(profileKey?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${process.env.AYRSHARE_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }
  return headers;
}

// Ensure DB columns exist for Ayrshare integration
(async () => {
  try {
    await pool.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS ayrshare_profile_key TEXT,
        ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
        ADD COLUMN IF NOT EXISTS instagram_user_id TEXT,
        ADD COLUMN IF NOT EXISTS instagram_username TEXT,
        ADD COLUMN IF NOT EXISTS instagram_page_id TEXT,
        ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMP
    `);
    console.log("[instagram] DB columns ready (Ayrshare mode)");
  } catch (e: any) {
    console.warn("[instagram] Could not add columns:", e.message);
  }
})();

// ============================================================
// --- Native Instagram Graph API Integration ---
// Runs alongside Ayrshare; controlled by VITE_INSTAGRAM_PROVIDER env var on frontend
// ============================================================

const GRAPH_API = 'https://graph.instagram.com';
const GRAPH_API_V = 'https://graph.instagram.com/v21.0';
const IG_APP_ID = process.env.INSTAGRAM_APP_ID;  // 1402830604303230 — Instagram App ID (from Meta portal Instagram API config)
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

// In-memory image cache for serving base64 images as public URLs
const imageCache = new Map<string, { data: Buffer; contentType: string; expiresAt: number }>();
const MAX_IMAGE_CACHE_SIZE = 50;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

// Clean expired images every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of imageCache) {
    if (now > entry.expiresAt) {
      imageCache.delete(token);
    }
  }
}, 2 * 60 * 1000);

// Helper: store base64 image and return a public URL
function storePublicImage(base64DataUri: string): string {
  const matches = base64DataUri.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!matches) throw new Error("Invalid base64 image data");
  const contentType = matches[1];
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new Error(`Unsupported image type: ${contentType}`);
  const buffer = Buffer.from(matches[2], 'base64');
  const token = crypto.randomUUID();
  // Evict oldest entry if cache is full
  if (imageCache.size >= MAX_IMAGE_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(token, {
    data: buffer,
    contentType,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
  });
  const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
  return `${host}/api/public-image/${token}`;
}

// Helper removed — now using universal resolveOrg() from helpers.ts

// Helper: verify Meta signed_request HMAC
function verifyMetaSignedRequest(signedRequest: string): any | null {
  if (!IG_APP_SECRET) return null;
  const [sig, payload] = signedRequest.split('.');
  if (!sig || !payload) return null;
  const expectedSig = crypto.createHmac('sha256', IG_APP_SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch { return null; }
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

export function registerInstagramRoutes(app: Express): void {

  // Check Instagram connection status via Ayrshare
  app.get("/api/instagram/status", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ connected: false });

    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;

      const { org } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.json({ connected: false });

      const result = await pool.query(
        'SELECT ayrshare_profile_key, instagram_username FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      // Query Ayrshare for connected social accounts
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: getAyrshareHeaders(profileKey),
      });
      const userData = await userRes.json() as any;

      const connected = Array.isArray(userData.activeSocialAccounts) &&
        userData.activeSocialAccounts.includes('instagram');
      const username = userData.displayNames?.instagram ||
        result.rows[0]?.instagram_username || null;

      if (connected && username && username !== result.rows[0]?.instagram_username) {
        await pool.query('UPDATE organizations SET instagram_username = $1 WHERE id = $2', [username, org.id]);
      }

      res.json({ connected, username, orgId: org.id });
    } catch (error) {
      console.error("[instagram] Status error:", error);
      res.json({ connected: false });
    }
  });

  // Connect Instagram via Ayrshare Social Connect (JWT SSO)
  app.get("/api/instagram/connect", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;

      const { org, error, status } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.status(status || 400).json({ error });
      const orgId = org.id;

      // Create Ayrshare profile for this org if it doesn't exist
      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [orgId]
      );
      let profileKey = result.rows[0]?.ayrshare_profile_key;

      if (!profileKey) {
        const org = await storage.getOrganization(orgId);
        const profileRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
          method: 'POST',
          headers: getAyrshareHeaders(),
          body: JSON.stringify({
            title: `PP-Org-${orgId}-${(org?.name || 'Unknown').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30)}`,
          }),
        });
        const profileData = await profileRes.json() as any;

        if (profileData.profileKey) {
          profileKey = profileData.profileKey;
          await pool.query(
            'UPDATE organizations SET ayrshare_profile_key = $1 WHERE id = $2',
            [profileKey, orgId]
          );
          console.log(`[instagram] Created Ayrshare profile for org ${orgId}: ${profileKey}`);
        } else {
          console.error("[instagram] Failed to create Ayrshare profile:", profileData);
          return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(profileData.message || 'profile_creation_failed'));
        }
      }

      // Generate JWT URL for Ayrshare Social Connect page
      const privateKey = process.env.AYRSHARE_PRIVATE_KEY;
      const domain = process.env.AYRSHARE_DOMAIN;

      if (!privateKey || !domain) {
        console.error("[instagram] Missing AYRSHARE_PRIVATE_KEY or AYRSHARE_DOMAIN env vars");
        return res.redirect('/settings?instagram=error&detail=missing_ayrshare_config');
      }

      const jwtRes = await fetch(`${AYRSHARE_API_URL}/profiles/generateJWT`, {
        method: 'POST',
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          domain,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          profileKey,
          redirect: `https://pawtraitpros.com/settings?instagram=connected`,
          allowedSocial: ['instagram'],
        }),
      });
      const jwtData = await jwtRes.json() as any;

      if (jwtData.url) {
        console.log(`[instagram] Redirecting org ${orgId} to Ayrshare Social Connect`);
        return res.redirect(jwtData.url);
      } else {
        console.error("[instagram] JWT generation failed:", jwtData);
        return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(jwtData.message || 'jwt_failed'));
      }
    } catch (error: any) {
      console.error("[instagram] Connect error:", error);
      res.redirect('/settings?instagram=error&detail=connect_failed');
    }
  });

  // Post to Instagram via Ayrshare
  app.post("/api/instagram/post", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;

      let imageToUpload: string;
      let fileName: string;
      let description: string;
      let org: any;
      let defaultCaption: string;

      if (image && bodyOrgId) {
        // Showcase mode: client sent a captured image + orgId
        const { org: resolvedOrg, error, status } = await resolveOrg(userId, userEmail, { orgId: bodyOrgId });
        if (!resolvedOrg) return res.status(status || 404).json({ error });
        org = resolvedOrg;
        imageToUpload = image;
        fileName = `showcase-${org.id}-${Date.now()}.png`;
        description = `Showcase from ${org.name}`;
        defaultCaption = caption || `Check out the adorable pets at ${org.name}! #petportrait #pawtraitpros`;
      } else if (dogId) {
        // Single dog mode: post a specific dog's portrait
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        const { org: resolvedOrg, error, status } = await resolveOrg(userId, userEmail, { dogId: dog.id });
        if (!resolvedOrg) return res.status(status || 404).json({ error });
        org = resolvedOrg;
        const portrait = await storage.getSelectedPortraitByDog(dog.id);
        if (!portrait || !portrait.generatedImageUrl) {
          return res.status(400).json({ error: "No portrait found for this pet" });
        }
        imageToUpload = portrait.generatedImageUrl;
        fileName = `portrait-${dog.id}-${Date.now()}.png`;
        description = `Pawtrait of ${dog.name}`;
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'pawtraitpros.com';
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ''}View their full portrait at ${proto}://${host}/pawfile/${dog.id}\n\n#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }

      // Get org's Ayrshare profile key
      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      // Step 1: Upload image to Ayrshare
      console.log(`[instagram] Uploading image for org ${org.id} to Ayrshare`);
      const uploadRes = await fetch(`${AYRSHARE_API_URL}/media/upload`, {
        method: 'POST',
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          file: imageToUpload,
          fileName,
          description,
        }),
      });
      const uploadData = await uploadRes.json() as any;

      if (!uploadData.url) {
        console.error("[instagram] Upload failed:", uploadData);
        throw new Error(uploadData.message || "Failed to upload image");
      }
      console.log(`[instagram] Uploaded: ${uploadData.url}`);

      // Step 2: Post to Instagram via Ayrshare
      const postRes = await fetch(`${AYRSHARE_API_URL}/post`, {
        method: 'POST',
        headers: getAyrshareHeaders(profileKey),
        body: JSON.stringify({
          post: defaultCaption,
          platforms: ['instagram'],
          mediaUrls: [uploadData.url],
        }),
      });
      const postData = await postRes.json() as any;

      if (postData.status === 'error') {
        console.error("[instagram] Post failed:", postData);
        throw new Error(postData.message || "Failed to post to Instagram");
      }

      const igPost = postData.postIds?.find((p: any) => p.platform === 'instagram');
      console.log(`[instagram] Posted to Instagram for org ${org.id} via Ayrshare`);

      res.json({
        success: true,
        mediaId: igPost?.id || postData.id,
        postUrl: igPost?.postUrl || null,
      });
    } catch (error: any) {
      console.error("[instagram] Post error:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });

  // Disconnect Instagram via Ayrshare
  app.delete("/api/instagram/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;

      const { org, error, status } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.status(status || 404).json({ error });

      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      if (profileKey) {
        await fetch(`${AYRSHARE_API_URL}/profiles/social`, {
          method: 'DELETE',
          headers: getAyrshareHeaders(profileKey),
          body: JSON.stringify({ platform: 'instagram' }),
        });
      }

      await pool.query(
        `UPDATE organizations SET instagram_username = NULL, instagram_user_id = NULL, instagram_access_token = NULL WHERE id = $1`,
        [org.id]
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });

  // Admin debug: Ayrshare integration status
  app.get("/api/admin/instagram-debug", isAuthenticated, async (req: Request, res: Response) => {
    const email = (req as any).user.claims.email;
    if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Admin only" });

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ error: "AYRSHARE_API_KEY not set" });

    try {
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const userData = await userRes.json();

      const profilesRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const profilesData = await profilesRes.json();

      res.json({
        ayrshare_user: userData,
        profiles: profilesData,
        env: {
          hasApiKey: !!apiKey,
          hasDomain: !!process.env.AYRSHARE_DOMAIN,
          hasPrivateKey: !!process.env.AYRSHARE_PRIVATE_KEY,
        },
      });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // Public image endpoint — serves cached images by token (no auth required)
  app.get("/api/public-image/:token", (req: Request, res: Response) => {
    const entry = imageCache.get(req.params.token);
    if (!entry || Date.now() > entry.expiresAt) {
      imageCache.delete(req.params.token);
      return res.status(404).json({ error: "Image not found or expired" });
    }
    res.set('Content-Type', entry.contentType);
    res.set('Cache-Control', 'public, max-age=600');
    res.send(entry.data);
  });

  // Native Instagram: Check connection status
  app.get("/api/instagram-native/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;
      const { org } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.json({ connected: false });

      const result = await pool.query(
        'SELECT instagram_access_token, instagram_user_id, instagram_username, instagram_token_expires_at FROM organizations WHERE id = $1',
        [org.id]
      );
      const row = result.rows[0];
      if (!row?.instagram_access_token || !row?.instagram_user_id) {
        return res.json({ connected: false });
      }

      // Check if token is expired
      if (row.instagram_token_expires_at && new Date(row.instagram_token_expires_at) < new Date()) {
        return res.json({ connected: false, reason: "token_expired" });
      }

      // Auto-refresh if token expires within 7 days
      const expiresAt = row.instagram_token_expires_at ? new Date(row.instagram_token_expires_at) : null;
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt && expiresAt < sevenDaysFromNow && IG_APP_SECRET) {
        try {
          const refreshRes = await fetch(
            `${GRAPH_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.instagram_access_token}`
          );
          const refreshData = await refreshRes.json() as any;
          if (refreshData.access_token) {
            const newExpires = new Date(Date.now() + (refreshData.expires_in || 5184000) * 1000);
            await pool.query(
              'UPDATE organizations SET instagram_access_token = $1, instagram_token_expires_at = $2 WHERE id = $3',
              [refreshData.access_token, newExpires.toISOString(), org.id]
            );
            console.log(`[instagram-native] Token refreshed for org ${org.id}`);
          }
        } catch (refreshErr) {
          console.warn("[instagram-native] Token refresh failed:", refreshErr);
        }
      }

      // Verify token is still valid by calling Graph API (use /me with versioned endpoint)
      const verifyRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${row.instagram_access_token}`);
      const verifyData = await verifyRes.json() as any;

      if (verifyData.error) {
        console.warn("[instagram-native] Token invalid:", verifyData.error.message);
        return res.json({ connected: false, reason: "token_invalid" });
      }

      // Sync username if changed
      if (verifyData.username && verifyData.username !== row.instagram_username) {
        await pool.query('UPDATE organizations SET instagram_username = $1 WHERE id = $2', [verifyData.username, org.id]);
      }

      res.json({ connected: true, username: verifyData.username || row.instagram_username, orgId: org.id });
    } catch (error) {
      console.error("[instagram-native] Status error:", error);
      res.json({ connected: false });
    }
  });

  // Native Instagram: Start OAuth connect flow
  app.get("/api/instagram-native/connect", isAuthenticated, async (req: Request, res: Response) => {
    if (!IG_APP_ID || !IG_APP_SECRET) {
      return res.redirect('/settings?instagram=error&detail=missing_instagram_config');
    }

    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;

      const { org } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.redirect('/settings?instagram=error&detail=no_organization');
      const orgId = org.id;

      // Store orgId in HMAC-signed state param for callback
      const statePayload = JSON.stringify({ orgId, ts: Date.now() });
      const stateHmac = crypto.createHmac('sha256', IG_APP_SECRET!).update(statePayload).digest('hex');
      const state = Buffer.from(JSON.stringify({ p: statePayload, s: stateHmac })).toString('base64url');
      const redirectUri = `${process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000'}/api/instagram-native/callback`;

      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code&state=${state}`;

      console.log(`[instagram-native] Redirecting org ${orgId} to Facebook OAuth`);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[instagram-native] Connect error:", error);
      res.redirect('/settings?instagram=error&detail=connect_failed');
    }
  });

  // Native Instagram: OAuth callback
  app.get("/api/instagram-native/callback", async (req: Request, res: Response) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error("[instagram-native] OAuth denied:", oauthError);
      return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(oauthError as string));
    }

    if (!code || !state) {
      return res.redirect('/settings?instagram=error&detail=missing_code_or_state');
    }

    try {
      // Verify HMAC-signed state
      const stateOuter = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      const expectedHmac = crypto.createHmac('sha256', IG_APP_SECRET!).update(stateOuter.p).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(stateOuter.s, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
        return res.redirect('/settings?instagram=error&detail=invalid_state');
      }
      const stateData = JSON.parse(stateOuter.p);
      const orgId = stateData.orgId;
      if (!orgId) throw new Error("No orgId in state");

      const redirectUri = `${process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000'}/api/instagram-native/callback`;

      // Step 1: Exchange code for short-lived token (Instagram Platform API)
      // Clean code value (Instagram sometimes appends #_ to the code)
      const cleanCode = (code as string).replace(/#_$/, '');
      console.log(`[instagram-native] Token exchange: client_id=${IG_APP_ID}, redirect_uri=${redirectUri}, code_length=${cleanCode.length}`);
      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: IG_APP_ID!,
          client_secret: IG_APP_SECRET!,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: cleanCode,
        }).toString(),
      });
      const tokenData = await tokenRes.json() as any;
      if (tokenData.error_type || tokenData.error) {
        console.error("[instagram-native] Token exchange error:", JSON.stringify(tokenData));
        console.error("[instagram-native] Used redirect_uri:", redirectUri);
        console.error("[instagram-native] Used client_id:", IG_APP_ID);
        throw new Error(tokenData.error_message || tokenData.error?.message || "Token exchange failed");
      }
      const shortLivedToken = tokenData.access_token;

      // Step 2: Exchange for long-lived token (60 days)
      const longTokenRes = await fetch(
        `${GRAPH_API}/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortLivedToken}`
      );
      const longTokenData = await longTokenRes.json() as any;
      if (longTokenData.error) {
        console.error("[instagram-native] Long-lived token error:", longTokenData.error);
        throw new Error(longTokenData.error.message || "Long-lived token exchange failed");
      }
      const longLivedToken = longTokenData.access_token;
      const expiresIn = longTokenData.expires_in || 5184000; // default 60 days

      // Step 3: Get Instagram profile (use /me — returns id as string, avoids JS number precision loss)
      const igProfileRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${longLivedToken}`);
      const igProfileData = await igProfileRes.json() as any;
      const igUserId = igProfileData.id; // Use 'id' field (string) — NOT tokenData.user_id (number, loses precision for large IDs)
      const igUsername = igProfileData.username || null;
      console.log(`[instagram-native] Profile: id=${igUserId}, username=${igUsername}`);

      // Step 4: Store everything in DB
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await pool.query(
        `UPDATE organizations SET
          instagram_access_token = $1,
          instagram_user_id = $2,
          instagram_username = $3,
          instagram_page_id = $4,
          instagram_token_expires_at = $5
        WHERE id = $6`,
        [longLivedToken, igUserId, igUsername, null, expiresAt.toISOString(), orgId]
      );

      console.log(`[instagram-native] Connected org ${orgId}: @${igUsername} (IG ID: ${igUserId})`);
      res.redirect('/settings?instagram=connected');
    } catch (error: any) {
      console.error("[instagram-native] Callback error:", error);
      res.redirect('/settings?instagram=error&detail=callback_failed');
    }
  });

  // Native Instagram: Post image
  app.post("/api/instagram-native/post", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;

      let imageToPost: string;
      let org: any;
      let defaultCaption: string;

      if (image && bodyOrgId) {
        // Showcase mode
        const { org: resolvedOrg, error, status } = await resolveOrg(userId, userEmail, { orgId: bodyOrgId });
        if (!resolvedOrg) return res.status(status || 404).json({ error });
        org = resolvedOrg;
        imageToPost = image;
        defaultCaption = caption || `Check out the adorable pets at ${org.name}! #petportrait #pawtraitpros`;
      } else if (dogId) {
        // Single dog mode
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        const { org: resolvedOrg, error, status } = await resolveOrg(userId, userEmail, { dogId: dog.id });
        if (!resolvedOrg) return res.status(status || 404).json({ error });
        org = resolvedOrg;
        const portrait = await storage.getSelectedPortraitByDog(dog.id);
        if (!portrait || !portrait.generatedImageUrl) {
          return res.status(400).json({ error: "No portrait found for this pet" });
        }
        imageToPost = portrait.generatedImageUrl;
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'pawtraitpros.com';
        const dogUrl = dog.petCode ? `${proto}://${host}/pawfile/code/${dog.petCode}` : `${proto}://${host}/pawfile/${dog.id}`;
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ''}View their full portrait at ${dogUrl}\n\n#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }

      // Get org's Instagram credentials
      const result = await pool.query(
        'SELECT instagram_access_token, instagram_user_id FROM organizations WHERE id = $1',
        [org.id]
      );
      const token = result.rows[0]?.instagram_access_token;
      const igUserId = result.rows[0]?.instagram_user_id;
      if (!token || !igUserId) {
        return res.status(400).json({ error: "Instagram not connected. Please connect Instagram first." });
      }

      // Store image as public URL
      const imageUrl = storePublicImage(imageToPost);
      console.log(`[instagram-native] Posting for org ${org.id}, image URL: ${imageUrl}`);

      // Step 1: Create media container
      console.log(`[instagram-native] Creating container: user=${igUserId}, image_url=${imageUrl}`);
      const containerRes = await fetch(`${GRAPH_API_V}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: defaultCaption,
          access_token: token,
        }),
      });
      const containerText = await containerRes.text();
      console.log(`[instagram-native] Container response (${containerRes.status}): ${containerText}`);
      const containerData = JSON.parse(containerText);

      if (containerData.error) {
        console.error("[instagram-native] Container creation error:", JSON.stringify(containerData.error));
        throw new Error(containerData.error.message || "Failed to create media container");
      }
      const containerId = containerData.id;
      console.log(`[instagram-native] Container created: ${containerId}`);

      // Step 2: Poll for container status (max 30 seconds)
      let ready = false;
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await fetch(
          `${GRAPH_API_V}/${containerId}?fields=status_code&access_token=${token}`
        );
        const statusData = await statusRes.json() as any;
        if (statusData.status_code === 'FINISHED') {
          ready = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          throw new Error("Instagram rejected the image. It may be too large or in an unsupported format.");
        }
      }
      if (!ready) {
        throw new Error("Image processing timed out. Please try again.");
      }

      // Step 3: Publish
      console.log(`[instagram-native] Publishing container ${containerId} for user ${igUserId}`);
      const publishRes = await fetch(`${GRAPH_API_V}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token,
        }),
      });
      const publishText = await publishRes.text();
      console.log(`[instagram-native] Publish response (${publishRes.status}): ${publishText}`);
      const publishData = JSON.parse(publishText);

      if (publishData.error) {
        console.error("[instagram-native] Publish error:", JSON.stringify(publishData.error));
        throw new Error(publishData.error.message || "Failed to publish to Instagram");
      }

      console.log(`[instagram-native] Published to Instagram: ${publishData.id}`);

      // Clean up cached image
      const tokenFromUrl = imageUrl.split('/').pop();
      if (tokenFromUrl) imageCache.delete(tokenFromUrl);

      res.json({
        success: true,
        mediaId: publishData.id,
        postUrl: null, // Graph API doesn't return permalink directly
      });
    } catch (error: any) {
      console.error("[instagram-native] Post error:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });

  // Native Instagram: Disconnect
  app.delete("/api/instagram-native/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const userEmail = (req as any).user.claims.email;
      const { org, error, status } = await resolveOrg(userId, userEmail, { orgId: req.query.orgId });
      if (!org) return res.status(status || 404).json({ error });

      await pool.query(
        `UPDATE organizations SET
          instagram_access_token = NULL,
          instagram_user_id = NULL,
          instagram_username = NULL,
          instagram_page_id = NULL,
          instagram_token_expires_at = NULL
        WHERE id = $1`,
        [org.id]
      );

      console.log(`[instagram-native] Disconnected org ${org.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram-native] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });

  // Native Instagram: Data deletion callback (required by Meta)
  app.post("/api/instagram-native/data-deletion", async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request || !IG_APP_SECRET) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Verify and parse signed request
      const data = verifyMetaSignedRequest(signed_request);
      if (!data) {
        return res.status(403).json({ error: "Invalid signature" });
      }
      const fbUserId = data.user_id;

      if (fbUserId) {
        // Clear Instagram data for the specific user
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_user_id = $1`,
          [String(fbUserId)]
        );
        console.log(`[instagram-native] Data deletion processed for FB user ${fbUserId}`);
      }

      // Meta requires this specific response format
      const confirmationCode = crypto.randomUUID();
      res.json({
        url: `https://pawtraitpros.com/privacy`,
        confirmation_code: confirmationCode,
      });
    } catch (error: any) {
      console.error("[instagram-native] Data deletion error:", error);
      res.status(500).json({ error: "Failed to process data deletion" });
    }
  });

  // Native Instagram: Deauthorize callback (required by Meta)
  app.post("/api/instagram-native/deauthorize", async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Verify and parse signed request
      const data = verifyMetaSignedRequest(signed_request);
      if (!data) {
        return res.status(403).json({ error: "Invalid signature" });
      }
      const fbUserId = data.user_id;

      if (fbUserId) {
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_user_id = $1`,
          [String(fbUserId)]
        );
        console.log(`[instagram-native] Deauthorized FB user ${fbUserId}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram-native] Deauthorize error:", error);
      res.status(500).json({ error: "Failed to process deauthorization" });
    }
  });

}
