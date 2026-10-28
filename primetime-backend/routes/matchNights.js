const router = require('express').Router();
const venueController = require('../controllers/venueController');

router.get('/', venueController.getMatchNights);
// Public: a walk-in holding a table for the derby has no account.
router.post('/reservations', venueController.reserveMatchNight);

module.exports = router;
