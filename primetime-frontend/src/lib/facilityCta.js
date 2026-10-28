// Each facility earns its own call-to-action, because each one is sold a
// different way: the gym is a subscription, the hotel is a room, the lounge
// is a night out, the pitch is a time slot. A single "Book a session" button
// misdescribed four of the five.
//
// Slug first (these are the real seeded facilities), category as the fallback
// so a facility added later through the admin panel still gets sensible
// wording instead of an empty button.
const CTA_BY_SLUG = {
  gym: 'View Membership',
  hotel: 'View Rooms',
  'bar-lounge': 'Explore Lounge',
  'football-ground': 'Check Availability',
};

const CTA_BY_CATEGORY = {
  fitness: 'View Membership',
  accommodation: 'View Rooms',
  dining: 'Explore Lounge',
  sports: 'Check Availability',
};

// Only two facilities have a number worth putting on a card. The gym's is the
// one-time fee that unlocks the plans; the hotel's is a room rate. The lounge
// and the pitch don't: a night out costs whatever you order, and a match costs
// whatever the booking comes to. Quoting one figure for those reads like a
// cover charge and undersells the rest, so they get a phrase instead. The
// exact amount still appears in BookingForm before anyone pays.
const PRICING_BY_SLUG = {
  gym: { kind: 'amount', unit: 'one-time registration' },
  // Overridden below when the hotel has rooms — then it quotes the cheapest.
  hotel: { kind: 'amount', unit: 'per guest, per night' },
  'bar-lounge': { kind: 'quote', label: 'Pay for what you order' },
  'football-ground': { kind: 'quote', label: 'Priced by your booking' },
};

const PRICING_BY_CATEGORY = {
  fitness: { kind: 'amount', unit: 'one-time registration' },
  accommodation: { kind: 'amount', unit: 'per guest, per night' },
  dining: { kind: 'quote', label: 'Pay for what you order' },
  sports: { kind: 'quote', label: 'Priced by your booking' },
};

/**
 * How a facility's headline price should read.
 *
 * `kind: 'benefit'` — no price at all; render the benefit badge.
 * `kind: 'amount'`  — show the figure, with `unit` after it.
 * `kind: 'quote'`   — show `label` instead of a figure; the real cost is
 *                     settled at booking or at the bar, not on the card.
 */
export const facilityPricing = (facility) => {
  if (facility?.is_bookable === false) return { kind: 'benefit' };

  // A facility with room types has no single price — it starts at its
  // cheapest room. The API supplies min_room_price so the card doesn't have
  // to fetch the room list to say so.
  if (facility?.min_room_price != null) {
    return {
      kind: 'from',
      amount: facility.min_room_price,
      unit: 'per night',
    };
  }

  return (
    PRICING_BY_SLUG[facility?.slug] ??
    PRICING_BY_CATEGORY[facility?.category] ?? { kind: 'amount', unit: 'per guest' }
  );
};

export const BENEFIT_LABEL = 'Included with Membership';
export const BENEFIT_NOTE_MEMBER = 'Included with your membership — just turn up';
export const BENEFIT_NOTE_GUEST = 'Free for active gym members';

/**
 * Resolves what a facility card should offer.
 *
 * `kind: 'benefit'` means there is no action to take — the facility comes
 * with a membership — so callers must render a status label, never a button.
 * `kind: 'link'` carries the destination and the wording for a real CTA.
 */
export const facilityCta = (facility, { isMember = false } = {}) => {
  if (facility?.is_bookable === false) {
    return {
      kind: 'benefit',
      label: BENEFIT_LABEL,
      note: isMember ? BENEFIT_NOTE_MEMBER : BENEFIT_NOTE_GUEST,
    };
  }

  return {
    kind: 'link',
    label:
      CTA_BY_SLUG[facility?.slug] ??
      CTA_BY_CATEGORY[facility?.category] ??
      'View Details',
    to: `/facilities/${facility?.slug}`,
  };
};
