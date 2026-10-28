const router = require('express').Router();
const venueController = require('../controllers/venueController');

// Public: the QR at the table leads here, and walk-ins have no account.
router.post('/', venueController.callWaiter);

module.exports = router;
