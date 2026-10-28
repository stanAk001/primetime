const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyGoogleCredential } = require('../utils/googleVerify');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/jwt');
const { isAdminEmail } = require('../utils/admin');

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  profileImageUrl: user.profile_image_url,
  membershipTier: user.membership_tier,
  // UI hint only — every admin endpoint is still enforced server-side
  // by authorizeAdmin.
  isAdmin: isAdminEmail(user.email),
});

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create(email, passwordHash, firstName, lastName, phone);

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res
      .status(201)
      .json({ user: publicUser(user), message: 'Registration successful' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // A Google-only account has no password to check against — send
    // them to the right button instead of a confusing 401.
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account signs in with Google — use the Google button instead',
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await User.updateLastLogin(user.id);

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.json({ user: publicUser(user), message: 'Login successful' });
  } catch (error) {
    next(error);
  }
};

// Sign in / sign up with Google. `credential` is the signed ID token
// Google's Identity Services button hands the frontend directly — we
// verify it ourselves (signature + audience) rather than trusting
// anything the client claims about who it is.
exports.google = async (req, res, next) => {
  try {
    const { credential } = req.body;

    let payload;
    try {
      payload = await verifyGoogleCredential(credential);
    } catch (err) {
      console.error('Google sign-in verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ error: 'Google email is not verified' });
    }

    let user = await User.findByGoogleId(payload.sub);

    if (!user) {
      // Same (verified) email as an existing password account — link
      // rather than fork a second account for the same person.
      const existing = await User.findByEmail(payload.email);
      user = existing
        ? await User.linkGoogleId(existing.id, payload.sub)
        : await User.createFromGoogle({
            googleId: payload.sub,
            email: payload.email,
            firstName: payload.given_name || payload.name || 'Member',
            lastName: payload.family_name || '',
            profileImageUrl: payload.picture,
          });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }

    await User.updateLastLogin(user.id);

    const token = signToken(user.id);
    setAuthCookie(res, token);

    res.json({ user: publicUser(user), message: 'Signed in with Google' });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout successful' });
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.updateProfile(req.userId, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user), message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};
