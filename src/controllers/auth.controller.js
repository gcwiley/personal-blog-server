import jwt from 'jsonwebtoken';
import ms from 'ms';
import { User } from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// validated once at startup so a malformed JWT_EXPIRES_IN fails loudly instead of
// silently producing a session-only cookie (ms() returns undefined on bad input)
const SESSION_COOKIE_MAX_AGE_MS = ms(JWT_EXPIRES_IN);
if (!SESSION_COOKIE_MAX_AGE_MS || SESSION_COOKIE_MAX_AGE_MS <= 0) {
  throw new Error(`FATAL ERROR: JWT_EXPIRES_IN ("${JWT_EXPIRES_IN}") is not a valid duration.`);
}

// Defense-in-depth: this app is only ever meant to be reached through OAuth2 Proxy,
// which forwards X-Forwarded-Email only after verifying the user against Google.
// But nothing in this process enforces that network topology — a misconfigured
// ingress, a local `npm run dev`, or a future deploy mistake could expose this
// endpoint directly, and whoever reaches it could set that header themselves and
// mint a session as anyone. This allowlist is the code-level backstop: even a fully
// spoofed header can only ever authenticate as one of these pre-approved emails.
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
if (ALLOWED_EMAILS.length === 0) {
  throw new Error('FATAL ERROR: ALLOWED_EMAILS is not defined.');
}

// name of the httpOnly cookie that carries the app JWT
export const SESSION_COOKIE_NAME = 'app_session';

// Shared so signOutUser's clearCookie options exactly match the cookie set here —
// mismatched options (e.g. different `path`/`sameSite`) silently fail to clear it.
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // never readable from JS — the primary XSS mitigation
  secure: process.env.NODE_ENV === 'production',
  // 'lax' blocks the cookie on cross-site POST/fetch requests (CSRF) while still
  // allowing normal top-level navigation to the app
  sameSite: 'lax',
  path: '/',
};

// strips characters Google's preferred_username/email-local-part shouldn't contain
// but that the User model doesn't itself validate, and caps length defensively
const sanitizeUsername = (value) =>
  value.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 50);

// finds the first username not already taken, starting with `base` and appending a
// numeric suffix on collision (e.g. two Google accounts both named "alex")
const resolveUniqueUsername = async (base) => {
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop -- sequential by design, collisions are rare
  while (await User.findOne({ where: { username: candidate } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
};

// EXCHANGE OAUTH2 PROXY SESSION FOR AN APP SESSION COOKIE
//
// OAuth2 Proxy sits in front of the whole app and authenticates the browser against
// Google. It forwards the verified identity to this server via X-Forwarded-* headers,
// so this request can only reach Express if the user already has a valid Google-backed
// session. We trust those headers (subject to the ALLOWED_EMAILS check above), JIT-
// provision a local User record on first login (no password — Google is the identity
// provider), and set a short-lived app JWT as an httpOnly cookie — it is never
// exposed to client-side JavaScript.
export const createSessionFromProxy = async (req, res) => {
  const email = req.get('X-Forwarded-Email')?.trim().toLowerCase();

  if (!email) {
    return res.status(401).json({
      success: false,
      message:
        'No authenticated session found. Requests must pass through OAuth2 Proxy.',
    });
  }

  if (!ALLOWED_EMAILS.includes(email)) {
    return res.status(403).json({
      success: false,
      message: 'This account is not authorized to sign in.',
    });
  }

  const preferredUsername = req.get('X-Forwarded-Preferred-Username');
  const fallbackUsername = email.split('@')[0];
  const baseUsername = sanitizeUsername(preferredUsername || fallbackUsername);

  try {
    let user = await User.findOne({ where: { email } });

    if (!user) {
      const username = await resolveUniqueUsername(baseUsername);
      user = await User.create({ email, username, password: null });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        algorithm: 'HS256',
      },
    );

    res.cookie(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });

    res.status(200).json({
      success: true,
      message: 'Session established.',
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    // never echo raw error details to the client — log server-side only
    console.error('Error establishing session from proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Error establishing session.',
    });
  }
};

// SIGN OUT CURRENT USER
export const signOutUser = (_req, res) => {
  // clears the httpOnly app session cookie. The Google-backed SSO session itself is
  // terminated separately via OAuth2 Proxy's /oauth2/sign_out endpoint.
  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};
