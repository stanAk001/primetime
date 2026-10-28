const router = require('express').Router();
const VenuePulse = require('../models/VenuePulse');

// Public: the landing page reads this to show what's happening right now.
router.get('/pulse', async (req, res, next) => {
  try {
    // Short cache — the figure only needs to be roughly current, and this
    // endpoint is hit by every visitor on the homepage.
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ pulse: await VenuePulse.snapshot() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
