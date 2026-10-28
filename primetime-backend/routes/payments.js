const router = require('express').Router();
const paymentsController = require('../controllers/paymentsController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { initializePaymentSchema } = require('../utils/validators');

// Webhook is signature-authenticated (server-to-server) — no cookie auth.
router.post('/webhook', paymentsController.webhook);

router.post(
  '/initialize',
  authenticateToken,
  validate(initializePaymentSchema),
  paymentsController.initialize
);
router.get('/verify/:reference', authenticateToken, paymentsController.verify);

module.exports = router;
