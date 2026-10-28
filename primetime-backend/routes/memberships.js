const router = require('express').Router();
const membershipsController = require('../controllers/membershipsController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  initializeMembershipSchema,
  gymRegistrationSchema,
} = require('../utils/validators');

router.use(authenticateToken);

// Enrollment: profile + one-time fee, required before any plan purchase
router.get('/registration', membershipsController.getRegistration);
router.post(
  '/register',
  validate(gymRegistrationSchema),
  membershipsController.register
);

router.post('/', validate(initializeMembershipSchema), membershipsController.initialize);
router.get('/', membershipsController.getMine);

module.exports = router;
