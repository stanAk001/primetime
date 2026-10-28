const axios = require('axios');
const crypto = require('crypto');

// PAYSTACK_BASE_URL is only overridden in local testing; defaults to the real API.
const baseURL = () => process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const client = () =>
  axios.create({
    baseURL: baseURL(),
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

// Normalize axios/Paystack failures into an error the errorHandler can render.
const paystackError = (err) => {
  const message =
    err.response?.data?.message || 'Payment provider request failed';
  const wrapped = new Error(`Paystack: ${message}`);
  wrapped.status = 502;
  return wrapped;
};

const generateReference = () =>
  `PT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

// amount is in kobo (NGN subunit): ₦5,000.00 -> 500000
const initializeTransaction = async ({
  email,
  amount,
  reference,
  callbackUrl,
  metadata,
}) => {
  try {
    const { data } = await client().post('/transaction/initialize', {
      email,
      amount,
      reference,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata,
    });
    return data.data; // { authorization_url, access_code, reference }
  } catch (err) {
    throw paystackError(err);
  }
};

const verifyTransaction = async (reference) => {
  try {
    const { data } = await client().get(
      `/transaction/verify/${encodeURIComponent(reference)}`
    );
    return data.data; // { status: 'success'|'failed'|'abandoned', amount, paid_at, ... }
  } catch (err) {
    throw paystackError(err);
  }
};

// Paystack signs webhooks with HMAC-SHA512 of the raw request body.
const verifyWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature.padEnd(expected.length).slice(0, expected.length))
  );
};

module.exports = {
  generateReference,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
};
