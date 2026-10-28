const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../utils/jwt');
const { isAdminEmail } = require('../utils/admin');

exports.authenticateToken = (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.authorizeAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Unauthorized' });
  }
};
