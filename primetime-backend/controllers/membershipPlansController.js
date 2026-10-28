const MembershipPlan = require('../models/MembershipPlan');

exports.getAll = async (req, res, next) => {
  try {
    const plans = await MembershipPlan.findAll({ facilitySlug: req.query.facilitySlug });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
};

// ---- Admin ----

exports.create = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.create(req.body);
    res.status(201).json({ plan, message: 'Plan created' });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await MembershipPlan.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = await MembershipPlan.update(req.params.id, req.body);
    res.json({ plan, message: 'Plan updated' });
  } catch (error) {
    next(error);
  }
};

// The public list hides inactive plans; the admin manager needs to see
// (and re-enable) them too.
exports.adminGetAll = async (req, res, next) => {
  try {
    const plans = await MembershipPlan.findAll({ includeInactive: true });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
};
