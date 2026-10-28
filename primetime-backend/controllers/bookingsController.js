const Booking = require('../models/Booking');

// Local (not UTC) YYYY-MM-DD — bookings are for the Ibadan facility.
const todayStr = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
};

exports.create = async (req, res, next) => {
  try {
    const {
      facilityId,
      bookingDate,
      startTime,
      endTime,
      numberOfGuests,
      notes,
      roomId,
      checkOutDate,
    } = req.body;

    if (bookingDate < todayStr()) {
      return res.status(400).json({ error: 'Booking date cannot be in the past' });
    }

    const { booking, facility, room, nights } = await Booking.create({
      userId: req.userId,
      facilityId,
      bookingDate,
      startTime,
      endTime,
      numberOfGuests,
      notes,
      roomId,
      checkOutDate,
    });

    res.status(201).json({
      booking: {
        ...booking,
        facility_name: facility.name,
        facility_slug: facility.slug,
        room_name: room?.name ?? null,
        nights: nights ?? null,
      },
      message: room
        ? `${room.name} held for ${nights} night${nights === 1 ? '' : 's'} — pay to confirm`
        : 'Booking created — proceed to payment to confirm',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const bookings = await Booking.findByUser(req.userId, {
      status: req.query.status,
    });
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.user_id !== req.userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ booking });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.user_id !== req.userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res
        .status(400)
        .json({ error: `Cannot cancel a ${booking.status} booking` });
    }

    const bookingDateStr =
      booking.booking_date instanceof Date
        ? booking.booking_date.toISOString().slice(0, 10)
        : booking.booking_date;
    if (bookingDateStr < todayStr()) {
      return res.status(400).json({ error: 'Cannot cancel past bookings' });
    }

    const cancelled = await Booking.cancel(booking.id, req.body?.reason);
    res.json({ booking: cancelled, message: 'Booking cancelled' });
  } catch (error) {
    next(error);
  }
};

// ---- Admin ----

exports.adminGetAll = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const bookings = await Booking.findAllAdmin({ status, date, limit, offset });
    res.json({ bookings, limit, offset });
  } catch (error) {
    next(error);
  }
};
