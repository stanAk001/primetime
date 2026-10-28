const Facility = require('../models/Facility');

exports.getAll = async (req, res, next) => {
  try {
    const { category } = req.query;
    const facilities = await Facility.findAll({ category });
    res.json({ facilities });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const facility = await Facility.findByIdOrSlug(req.params.idOrSlug);
    if (!facility || !facility.is_active) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    const media = await Facility.getMedia(facility.id);
    res.json({ facility: { ...facility, media } });
  } catch (error) {
    next(error);
  }
};

exports.getMedia = async (req, res, next) => {
  try {
    const facility = await Facility.findByIdOrSlug(req.params.idOrSlug);
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    const media = await Facility.getMedia(facility.id);
    res.json({ media });
  } catch (error) {
    next(error);
  }
};

// ---- Admin ----

exports.create = async (req, res, next) => {
  try {
    const existing = await Facility.findBySlug(req.body.slug);
    if (existing) {
      return res.status(409).json({ error: 'Slug already in use' });
    }
    const facility = await Facility.create(req.body);
    res.status(201).json({ facility, message: 'Facility created' });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Facility.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    const facility = await Facility.update(req.params.id, req.body);
    res.json({ facility, message: 'Facility updated' });
  } catch (error) {
    next(error);
  }
};

// The public list hides inactive facilities; the admin manager needs to
// see (and re-enable) them too.
exports.adminGetAll = async (req, res, next) => {
  try {
    const facilities = await Facility.findAll({ includeInactive: true });
    res.json({ facilities });
  } catch (error) {
    next(error);
  }
};
