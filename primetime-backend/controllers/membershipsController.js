const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const GymProfile = require('../models/GymProfile');
const Facility = require('../models/Facility');
const Payment = require('../models/Payment');
const User = require('../models/User');
const paystack = require('../utils/paystack');

const toKobo = (naira) => Math.round(Number(naira) * 100);

// ---- Enrollment (step 1: profile + one-time ₦5,000 fee) ----

// The member's enrollment state for the gym — drives whether the
// frontend shows the registration form or the plan picker.
exports.getRegistration = async (req, res, next) => {
  try {
    const gym = await Facility.findBySlug('gym');
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const profile = await GymProfile.findByUser(req.userId, gym.id);
    res.json({
      profile: profile ?? null,
      registrationFee: GymProfile.REGISTRATION_FEE,
    });
  } catch (error) {
    next(error);
  }
};

// Saves the enrollment form and opens a Paystack checkout for the
// ₦5,000 fee. Re-submitting before paying just refreshes the details
// and issues a fresh checkout; once paid it's a 400.
exports.register = async (req, res, next) => {
  try {
    const gym = await Facility.findBySlug('gym');
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const existing = await GymProfile.findByUser(req.userId, gym.id);
    if (existing?.registration_fee_paid) {
      return res
        .status(400)
        .json({ error: 'You are already registered — pick a plan instead' });
    }

    const user = await User.findById(req.userId);
    const profile = await GymProfile.upsert({
      userId: req.userId,
      facilityId: gym.id,
      email: user.email,
      ...req.body,
    });

    const reference = paystack.generateReference();
    const payment = await Payment.create({
      gymProfileId: profile.id,
      userId: req.userId,
      amount: GymProfile.REGISTRATION_FEE.toFixed(2),
      reference,
    });

    const init = await paystack.initializeTransaction({
      email: user.email,
      amount: toKobo(GymProfile.REGISTRATION_FEE),
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/payment/success`,
      metadata: {
        gym_profile_id: profile.id,
        purpose: 'gym_registration',
        custom_fields: [
          {
            display_name: 'Purpose',
            variable_name: 'purpose',
            value: 'Gym registration fee',
          },
        ],
      },
    });

    res.status(201).json({
      profile,
      authorizationUrl: init.authorization_url,
      accessCode: init.access_code,
      reference,
      paymentId: payment.id,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      message: 'Profile saved — pay the registration fee to complete enrollment',
    });
  } catch (error) {
    next(error);
  }
};

// Member picks a plan -> a pending membership + a Paystack checkout are
// created together, exactly mirroring the booking -> payment flow.
exports.initialize = async (req, res, next) => {
  try {
    const { planId } = req.body;

    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: 'Membership plan not found' });
    }

    const { membership } = await Membership.create({
      userId: req.userId,
      facilityId: plan.facility_id,
      planId: plan.id,
    });

    const user = await User.findById(req.userId);
    const reference = paystack.generateReference();

    const payment = await Payment.create({
      membershipId: membership.id,
      userId: req.userId,
      amount: membership.total_amount,
      currency: plan.currency || 'NGN',
      reference,
    });

    const init = await paystack.initializeTransaction({
      email: user.email,
      amount: toKobo(membership.total_amount),
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/payment/success`,
      metadata: {
        membership_id: membership.id,
        plan: plan.name,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: plan.name },
        ],
      },
    });

    res.status(201).json({
      membership,
      authorizationUrl: init.authorization_url,
      accessCode: init.access_code,
      reference,
      paymentId: payment.id,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      message: 'Membership created — proceed to payment to activate',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const memberships = await Membership.findByUser(req.userId);
    res.json({ memberships });
  } catch (error) {
    next(error);
  }
};

// ---- Admin / front-desk ----

// Powers the staff scanner. Beyond valid/invalid it hands the front
// desk a full at-a-glance profile — plan window, attendance history,
// training goals — and logs the visit as a check-in.
exports.verify = async (req, res, next) => {
  try {
    const result = await Membership.verifyAccess(req.params.qrCode);
    if (!result) {
      return res.status(404).json({ valid: false, error: 'Card not recognized' });
    }

    const valid = Boolean(result.is_valid_now);

    // Attendance context first, so "last visit" is the previous one —
    // then log today's check-in (valid scans only, deduped server-side).
    const [visits, memberSince] = await Promise.all([
      Membership.checkInStats(result.user_id, result.facility_id),
      Membership.memberSince(result.user_id, result.facility_id),
    ]);
    const checkIn = valid ? await Membership.recordCheckIn(result) : null;

    res.json({
      valid,
      checkedInAt: checkIn?.checked_in_at ?? null,
      member: {
        // The name they enrolled with (their preferred full name), falling
        // back to the account name for members without a gym profile.
        name:
          result.profile_name?.trim() ||
          `${result.first_name ?? ''} ${result.last_name ?? ''}`.trim(),
        photo: result.profile_image_url,
        phone: result.phone,
        gender: result.gender,
        plan: result.plan_name,
        planDays: result.duration_days,
        status: result.status,
        startsAt: result.starts_at,
        expiresAt: result.expires_at,
        daysLeft: result.days_left,
        memberSince,
        goals: result.goals ?? [],
        weightKg: result.weight_kg,
        targetWeightKg: result.target_weight_kg,
        visits: {
          total: visits?.total ?? 0,
          thisWeek: visits?.this_week ?? 0,
          lastVisit: visits?.last_visit ?? null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.adminGetAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const memberships = await Membership.adminFindAll({ status, search, limit, offset });
    res.json({ memberships, limit, offset });
  } catch (error) {
    next(error);
  }
};
