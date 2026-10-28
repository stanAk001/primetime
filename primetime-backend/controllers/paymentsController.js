const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Membership = require('../models/Membership');
const User = require('../models/User');
const paystack = require('../utils/paystack');
const { sendBookingConfirmation, sendMembershipConfirmation } = require('../utils/email');

const toKobo = (naira) => Math.round(Number(naira) * 100);

// Fire-and-forget confirmation email; never blocks the payment response.
const emailConfirmation = (payment) => {
  if (payment.gym_profile_id) {
    // Registration fee — no email template yet; the plan purchase that
    // follows sends the membership confirmation.
    return;
  }
  if (payment.booking_id) {
    Promise.all([Booking.findById(payment.booking_id), User.findById(payment.user_id)])
      .then(([booking, user]) => {
        if (!booking || !user) return;
        return sendBookingConfirmation({
          to: user.email,
          firstName: user.first_name,
          booking,
          facility: { name: booking.facility_name },
        });
      })
      .catch((err) => console.error('Confirmation email error:', err.message));
    return;
  }

  Promise.all([Membership.findById(payment.membership_id), User.findById(payment.user_id)])
    .then(([membership, user]) => {
      if (!membership || !user) return;
      return sendMembershipConfirmation({ to: user.email, firstName: user.first_name, membership });
    })
    .catch((err) => console.error('Membership confirmation email error:', err.message));
};

// A payment funds exactly one of a booking, a membership, or a gym
// registration — fetch whichever this one is for.
const fetchTarget = async (payment) => {
  if (payment.booking_id) {
    return { booking: await Booking.findById(payment.booking_id) };
  }
  if (payment.membership_id) {
    return { membership: await Membership.findById(payment.membership_id) };
  }
  return { registration: { gymProfileId: payment.gym_profile_id } };
};

exports.initialize = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.user_id !== req.userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      return res
        .status(400)
        .json({ error: `Booking is already ${booking.status}` });
    }
    if (await Payment.hasSuccessfulPayment(booking.id)) {
      return res.status(400).json({ error: 'Booking is already paid for' });
    }

    const user = await User.findById(req.userId);
    const reference = paystack.generateReference();

    const payment = await Payment.create({
      bookingId: booking.id,
      userId: req.userId,
      amount: booking.total_amount,
      currency: booking.currency || 'NGN',
      reference,
    });

    const init = await paystack.initializeTransaction({
      email: user.email,
      amount: toKobo(booking.total_amount),
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/payment/success`,
      metadata: {
        booking_id: booking.id,
        facility: booking.facility_name,
        custom_fields: [
          {
            display_name: 'Facility',
            variable_name: 'facility',
            value: booking.facility_name,
          },
        ],
      },
    });

    res.json({
      authorizationUrl: init.authorization_url,
      accessCode: init.access_code,
      reference,
      paymentId: payment.id,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    });
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const payment = await Payment.findByReference(reference);
    if (!payment || payment.user_id !== req.userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Already processed (e.g. by the webhook) — return current state.
    if (payment.status === 'success') {
      const target = await fetchTarget(payment);
      return res.json({ status: 'success', payment, ...target });
    }

    const data = await paystack.verifyTransaction(reference);

    if (data.status === 'success') {
      // Guard against amount tampering on the checkout page.
      if (data.amount !== toKobo(payment.amount)) {
        await Payment.markFailed(reference, 'Amount mismatch', data);
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      const updated = await Payment.markSuccess(reference, data);
      if (updated) emailConfirmation(updated);

      const target = await fetchTarget(updated ?? payment);
      return res.json({
        status: 'success',
        payment: updated ?? payment,
        ...target,
        message: payment.booking_id
          ? 'Payment verified — booking confirmed'
          : payment.membership_id
            ? 'Payment verified — membership activated'
            : 'Payment verified — registration complete',
      });
    }

    if (data.status === 'failed') {
      const failed = await Payment.markFailed(
        reference,
        data.gateway_response || 'Payment failed',
        data
      );
      return res.json({ status: 'failed', payment: failed ?? payment });
    }

    // abandoned / ongoing / pending
    res.json({ status: data.status, payment });
  } catch (error) {
    next(error);
  }
};

// Paystack calls this server-to-server. Authenticated by HMAC signature,
// not by cookie — never put authenticateToken on this route.
exports.webhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!paystack.verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    if (event.event === 'charge.success') {
      const reference = event.data?.reference;
      const payment = reference && (await Payment.findByReference(reference));

      // Only process references we issued, with matching amounts.
      if (payment && event.data.amount === toKobo(payment.amount)) {
        const updated = await Payment.markSuccess(reference, event.data);
        if (updated) {
          console.log(`✅ Webhook: payment ${reference} confirmed`);
          emailConfirmation(updated);
        }
      }
    }
  } catch (err) {
    // Log but still 200 — Paystack retries on non-2xx and verify() is a
    // second path to consistency.
    console.error('Webhook processing error:', err.message);
  }

  res.sendStatus(200);
};

// ---- Admin ----

exports.revenueAnalytics = async (req, res, next) => {
  try {
    const analytics = await Payment.revenueAnalytics();
    res.json({ analytics });
  } catch (error) {
    next(error);
  }
};
