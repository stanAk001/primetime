const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// In production the frontend (vercel.app) and API (onrender.com) are different
// sites, so the cookie must be SameSite=None (which requires Secure) or the
// browser won't send it with API requests.
const isProd = () => process.env.NODE_ENV === 'production';

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? 'none' : 'lax',
});

const cookieOptions = () => ({
  ...baseCookieOptions(),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT_EXPIRE
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, baseCookieOptions());
};

module.exports = { COOKIE_NAME, signToken, setAuthCookie, clearAuthCookie };
