import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { authStorage } from './auth-storage';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache recently verified users to avoid DB upsert on every request
const recentUsers = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;

  // Accept token from Authorization header or query param (for OAuth redirect flows)
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = {
      claims: {
        sub: user.id,
        email: user.email,
      },
      access_token: token,
    };

    // Upsert user in our DB periodically (not on every request)
    const now = Date.now();
    const lastSeen = recentUsers.get(user.id);
    if (!lastSeen || now - lastSeen > CACHE_TTL) {
      await authStorage.upsertUser({
        id: user.id,
        email: user.email || null,
        firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || null,
        lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        profileImageUrl: user.user_metadata?.avatar_url || null,
      });
      recentUsers.set(user.id, now);
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export function registerAuthRoutes(app: Express): void {
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const user = await authStorage.getUser(userId);
      const isAdmin = userEmail === process.env.ADMIN_EMAIL;
      res.json({ ...user, isAdmin });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  const signupRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many signup attempts. Please wait a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Server-side signup using admin API (bypasses email rate limits)
  app.post('/api/auth/signup', signupRateLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, acceptedTerms } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      if (!acceptedTerms) {
        return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy' });
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || '',
          last_name: lastName || '',
        },
      });

      if (error) {
        console.error('Signup error:', error.message);
        return res.status(400).json({ error: error.message });
      }

      // Record consent timestamp
      try {
        const { pool } = await import('./db');
        await pool.query(
          'UPDATE users SET terms_accepted_at = NOW(), privacy_accepted_at = NOW() WHERE id = $1',
          [data.user.id]
        );
      } catch (consentErr) {
        console.error('Failed to record consent:', consentErr);
      }

      res.json({ user: { id: data.user.id, email: data.user.email } });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });
}
