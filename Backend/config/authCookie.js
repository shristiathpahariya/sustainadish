/**
 * JWT session cookie options.
 * In production, SameSite=None + Secure is required so a SPA on another origin
 * (e.g. Vercel) can send the cookie on credentialed requests to the API (e.g. Render).
 * Local dev (e.g. localhost:5173 → localhost:3000) stays same-site, so Lax works.
 */
function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

/** Options for clearCookie — same as set, without maxAge (Express expires the cookie). */
function getAuthCookieClearOptions() {
  const opts = getAuthCookieOptions();
  const { maxAge: _m, ...rest } = opts;
  return rest;
}

module.exports = { getAuthCookieOptions, getAuthCookieClearOptions };
