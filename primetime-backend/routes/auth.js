const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
} = require('../utils/validators');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleAuthSchema), authController.google);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);
router.put(
  '/profile',
  authenticateToken,
  validate(updateProfileSchema),
  authController.updateProfile
);

module.exports = router;
