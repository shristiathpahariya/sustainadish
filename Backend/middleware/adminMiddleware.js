function parseAdminEmails(raw) {
  const s = typeof raw === 'string' ? raw : '';
  return new Set(
    s
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Admin allowlist based on email in JWT payload.
 * Configure: ADMIN_EMAILS="admin1@example.com,admin2@example.com"
 */
function requireAdmin(req, res, next) {
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (admins.size === 0) {
    return res.status(500).json({
      message:
        'Admin access is not configured. Set ADMIN_EMAILS in the backend environment.',
    });
  }

  const email = typeof req.user?.email === 'string' ? req.user.email.toLowerCase() : '';
  if (!email) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!admins.has(email)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

module.exports = {
  requireAdmin,
  parseAdminEmails,
};

