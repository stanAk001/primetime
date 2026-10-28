const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  express.json({
    limit: '50mb',
    // Keep the raw body around — Paystack webhook signatures are
    // HMAC-SHA512 over the exact bytes received.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/facilities', require('./routes/facilities'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/membership-plans', require('./routes/membershipPlans'));
app.use('/api/memberships', require('./routes/memberships'));
app.use('/api/waiter-calls', require('./routes/waiterCalls'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/venue', require('./routes/venue'));
app.use('/api/match-nights', require('./routes/matchNights'));
app.use('/api/admin', require('./routes/admin'));

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
