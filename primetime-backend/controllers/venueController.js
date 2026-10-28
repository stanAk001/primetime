const Menu = require('../models/Menu');
const MatchNight = require('../models/MatchNight');
const Order = require('../models/Order');
const Room = require('../models/Room');
const WaiterCall = require('../models/WaiterCall');

exports.getMenu = async (req, res, next) => {
  try {
    const menu = await Menu.findByFacilitySlug(req.params.slug);
    res.json({ menu });
  } catch (error) {
    next(error);
  }
};

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.findByFacilitySlug(req.params.slug);
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
};

// Public on purpose: a walk-in scans the QR at their table and taps the
// button. Requiring an account here would defeat the point.
exports.callWaiter = async (req, res, next) => {
  try {
    const { facilitySlug = 'bar-lounge', tableLabel, note } = req.body;

    const label = String(tableLabel ?? '').trim();
    if (!label) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    if (label.length > 40) {
      return res.status(400).json({ error: 'Table number is too long' });
    }
    if (note && String(note).length > 280) {
      return res.status(400).json({ error: 'Note is too long' });
    }

    const { call, duplicate } = await WaiterCall.create({
      facilitySlug,
      tableLabel: label,
      note: note ? String(note).trim() : null,
    });

    res.status(duplicate ? 200 : 201).json({
      call,
      duplicate,
      message: duplicate
        ? 'Someone is already on the way to your table'
        : 'A waiter has been called',
    });
  } catch (error) {
    next(error);
  }
};

// Public for the same reason as the waiter call: this is a walk-in at a
// table, not an account holder. Nothing is charged here — the tab is settled
// at the table — so there is no payment surface to protect.
exports.placeOrder = async (req, res, next) => {
  try {
    const { facilitySlug = 'bar-lounge', tableLabel, note, items, clientRef } = req.body;

    const label = String(tableLabel ?? '').trim();
    if (!label) {
      return res.status(400).json({ error: 'Table number is required' });
    }
    if (label.length > 40) {
      return res.status(400).json({ error: 'Table number is too long' });
    }
    if (note && String(note).length > 280) {
      return res.status(400).json({ error: 'Note is too long' });
    }

    const { order, duplicate } = await Order.create({
      facilitySlug,
      tableLabel: label,
      note: note ? String(note).trim() : null,
      lines: items,
      clientRef,
    });

    // 200 rather than 201 on a replay: nothing new was created.
    res.status(duplicate ? 200 : 201).json({
      order,
      duplicate,
      message: duplicate
        ? `Order ${order.reference} was already received`
        : `Order ${order.reference} sent to the bar`,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminGetOrders = async (req, res, next) => {
  try {
    const [orders, openCount] = await Promise.all([
      Order.findAll({ status: req.query.status }),
      Order.openCount(),
    ]);
    res.json({ orders, openCount });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdateOrder = async (req, res, next) => {
  try {
    const order = await Order.updateStatus(req.params.id, req.body.status);
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

exports.adminGetWaiterCalls = async (req, res, next) => {
  try {
    const [calls, pendingCount] = await Promise.all([
      WaiterCall.findAll({ status: req.query.status }),
      WaiterCall.pendingCount(),
    ]);
    res.json({ calls, pendingCount });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdateWaiterCall = async (req, res, next) => {
  try {
    const call = await WaiterCall.updateStatus(req.params.id, req.body.status);
    res.json({ call });
  } catch (error) {
    next(error);
  }
};

// ——— Match nights ———

exports.getMatchNights = async (req, res, next) => {
  try {
    const [fixtures, packages] = await Promise.all([
      MatchNight.upcoming(),
      MatchNight.packages(),
    ]);
    res.json({ fixtures, packages });
  } catch (error) {
    next(error);
  }
};

// Public: holding a table for a match needs a name and a number, not an
// account. Nothing is charged — the lounge settles at the table.
exports.reserveMatchNight = async (req, res, next) => {
  try {
    const { fixtureId, packageId, guestName, phone, partySize, note } = req.body;

    const name = String(guestName ?? '').trim();
    const tel = String(phone ?? '').trim();
    const size = Number(partySize);

    if (!fixtureId) return res.status(400).json({ error: 'Pick a match first' });
    if (name.length < 2) return res.status(400).json({ error: 'Your name is required' });
    if (tel.length < 7) return res.status(400).json({ error: 'A phone number is required' });
    if (!Number.isInteger(size) || size < 1 || size > 40) {
      return res.status(400).json({ error: 'Party size must be between 1 and 40' });
    }
    if (note && String(note).length > 280) {
      return res.status(400).json({ error: 'Note is too long' });
    }

    const { reservation, fixture } = await MatchNight.reserve({
      fixtureId,
      packageId,
      guestName: name,
      phone: tel,
      partySize: size,
      note: note ? String(note).trim() : null,
    });

    res.status(201).json({
      reservation,
      fixture,
      message: `Table held for ${fixture.home_team} v ${fixture.away_team}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminGetMatchReservations = async (req, res, next) => {
  try {
    const reservations = await MatchNight.adminReservations({
      fixtureId: req.query.fixtureId,
    });
    res.json({ reservations });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdateMatchReservation = async (req, res, next) => {
  try {
    const reservation = await MatchNight.updateReservation(
      req.params.id,
      req.body.status
    );
    res.json({ reservation });
  } catch (error) {
    next(error);
  }
};
