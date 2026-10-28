const router = require('express').Router();
const membershipPlansController = require('../controllers/membershipPlansController');

// Public — powers the plan picker on the gym facility page.
router.get('/', membershipPlansController.getAll);

module.exports = router;
