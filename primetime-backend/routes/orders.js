const router = require('express').Router();
const venueController = require('../controllers/venueController');

// Public: placed from the table's QR code, settled at the table.
router.post('/', venueController.placeOrder);

module.exports = router;
