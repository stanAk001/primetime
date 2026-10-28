export const naira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount));

// '2026-07-12' -> 'Sun, 12 Jul 2026' (parse as local, not UTC)
export const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// '06:00:00' -> '6:00 AM'. Returns null for a missing time rather than
// throwing: since room stays arrived, a booking may legitimately have no
// time of day at all, and a crash here takes a whole page down.
export const formatTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const timeRange = (start, end) =>
  start && end ? `${formatTime(start)} – ${formatTime(end)}` : null;

const nightsBetween = (from, to) =>
  Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));

/**
 * When a booking is for — in whatever terms that booking is actually sold.
 *
 * A pitch is a window on one day; a room is a number of nights between two
 * dates. Rendering both through a time range was what blanked the admin page:
 * a room stay has no start_time, and formatTime threw on null.
 */
export const bookingWhen = (booking) => {
  if (!booking) return '—';

  if (booking.check_out_date) {
    const from = String(booking.booking_date).slice(0, 10);
    const to = String(booking.check_out_date).slice(0, 10);
    const nights = nightsBetween(from, to);
    return `${nights} night${nights === 1 ? '' : 's'} · checkout ${formatDate(to)}`;
  }

  return timeRange(booking.start_time, booking.end_time) ?? 'All day';
};

export const todayISO = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
};
