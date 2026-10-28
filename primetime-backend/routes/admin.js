const router = require('express').Router();
const facilitiesController = require('../controllers/facilitiesController');
const bookingsController = require('../controllers/bookingsController');
const paymentsController = require('../controllers/paymentsController');
const membershipPlansController = require('../controllers/membershipPlansController');
const membershipsController = require('../controllers/membershipsController');
const venueController = require('../controllers/venueController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  facilitySchema,
  updateFacilitySchema,
  membershipPlanSchema,
  updateMembershipPlanSchema,
} = require('../utils/validators');

// All admin routes require a logged-in admin user
router.use(authenticateToken, authorizeAdmin);

router.get('/facilities', facilitiesController.adminGetAll);
router.post('/facilities', validate(facilitySchema), facilitiesController.create);
router.put(
  '/facilities/:id',
  validate(updateFacilitySchema),
  facilitiesController.update
);

router.get('/bookings', bookingsController.adminGetAll);
router.get('/analytics/revenue', paymentsController.revenueAnalytics);

router.get('/membership-plans', membershipPlansController.adminGetAll);
router.post(
  '/membership-plans',
  validate(membershipPlanSchema),
  membershipPlansController.create
);
router.put(
  '/membership-plans/:id',
  validate(updateMembershipPlanSchema),
  membershipPlansController.update
);
router.get('/match-reservations', venueController.adminGetMatchReservations);
router.put('/match-reservations/:id', venueController.adminUpdateMatchReservation);

router.get('/orders', venueController.adminGetOrders);
router.put('/orders/:id', venueController.adminUpdateOrder);

router.get('/waiter-calls', venueController.adminGetWaiterCalls);
router.put('/waiter-calls/:id', venueController.adminUpdateWaiterCall);

router.get('/memberships', membershipsController.adminGetAll);
router.get('/memberships/verify/:qrCode', membershipsController.verify);

module.exports = router;
