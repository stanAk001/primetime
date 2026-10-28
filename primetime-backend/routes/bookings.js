const router = require('express').Router();
const bookingsController = require('../controllers/bookingsController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  createBookingSchema,
  cancelBookingSchema,
} = require('../utils/validators');

router.use(authenticateToken);

router.post('/', validate(createBookingSchema), bookingsController.create);
router.get('/', bookingsController.getMine);
router.get('/:id', bookingsController.getOne);
router.put(
  '/:id/cancel',
  validate(cancelBookingSchema),
  bookingsController.cancel
);

module.exports = router;
