import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCreateBooking } from '../api/hooks';
import { getApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatTime, naira, todayISO } from '../lib/format';

const pad = (h) => `${String(h).padStart(2, '0')}:00`;

// Build hourly slot boundaries from the facility's opening hours.
// Overnight venues (closing past midnight, e.g. the bar lounge) offer
// same-day slots from opening until 23:59.
const slotHours = (opening, closing) => {
  const openH = Number(opening?.slice(0, 2) ?? 6);
  let closeH = Number(closing?.slice(0, 2) ?? 22);
  if (Number(closing?.slice(3, 5)) > 0) closeH += 1; // '23:59' behaves as 24
  if (closeH <= openH) closeH = 24; // overnight → cap at midnight
  const hours = [];
  for (let h = openH; h <= closeH; h += 1) hours.push(h);
  return hours;
};

const hourValue = (h) => (h === 24 ? '23:59' : pad(h));
const hourLabel = (h) => (h === 24 ? '11:59 PM' : formatTime(pad(h)));

export default function BookingForm({ facility }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const createBooking = useCreateBooking();

  const hours = useMemo(
    () => slotHours(facility.opening_time, facility.closing_time),
    [facility.opening_time, facility.closing_time]
  );

  const [form, setForm] = useState({
    bookingDate: todayISO(),
    startHour: hours[0],
    endHour: hours[1] ?? hours[0] + 1,
    guests: 1,
  });

  const endOptions = hours.filter((h) => h > form.startHour);
  const total = Number(facility.price_per_session) * (Number(form.guests) || 0);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: key === 'bookingDate' ? value : Number(value) };
      // Keep endHour ahead of startHour.
      if (key === 'startHour' && next.endHour <= next.startHour) {
        next.endHour = hours.find((h) => h > next.startHour) ?? next.startHour + 1;
      }
      return next;
    });
  };

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-stone-400">
          Sign in to book <span className="text-stone-200">{facility.name}</span> —
          it takes less than a minute.
        </p>
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="btn-gold mt-5 w-full"
        >
          Sign in to book
        </Link>
        <p className="mt-3 text-sm text-stone-500">
          New here?{' '}
          <Link
            to="/register"
            state={{ from: location.pathname }}
            className="font-medium text-gold-400 hover:text-gold-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    createBooking.mutate(
      {
        facilityId: facility.id,
        bookingDate: form.bookingDate,
        startTime: hourValue(form.startHour),
        endTime: hourValue(form.endHour),
        numberOfGuests: Number(form.guests),
      },
      { onSuccess: (booking) => navigate(`/checkout/${booking.id}`) }
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="bookingDate" className="field-label">
            Date <span className="text-gold-400" aria-hidden="true">*</span>
          </label>
          <input
            id="bookingDate"
            type="date"
            required
            min={todayISO()}
            value={form.bookingDate}
            onChange={set('bookingDate')}
            className="field-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startHour" className="field-label">
              From
            </label>
            <select
              id="startHour"
              value={form.startHour}
              onChange={set('startHour')}
              className="field-input"
            >
              {hours.slice(0, -1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="endHour" className="field-label">
              Until
            </label>
            <select
              id="endHour"
              value={form.endHour}
              onChange={set('endHour')}
              className="field-input"
            >
              {endOptions.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="guests" className="field-label">
            Guests <span className="text-gold-400" aria-hidden="true">*</span>
          </label>
          <input
            id="guests"
            type="number"
            required
            min={1}
            max={facility.capacity ?? 100}
            value={form.guests}
            onChange={set('guests')}
            className="field-input"
          />
          <p className="mt-1.5 text-xs text-stone-500">
            Up to {facility.capacity} guests · {naira(facility.price_per_session)} per guest
          </p>
        </div>
      </div>

      {createBooking.isError && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {getApiError(createBooking.error)}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-stone-800 pt-4">
        <span className="text-sm text-stone-400">Total</span>
        <motion.span
          key={total}
          initial={{ opacity: 0.3, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="font-display text-2xl font-bold text-gold-300"
        >
          {naira(total)}
        </motion.span>
      </div>

      <button
        type="submit"
        disabled={createBooking.isPending}
        className="btn-gold mt-4 w-full"
      >
        {createBooking.isPending ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            Reserving…
          </>
        ) : (
          'Reserve & continue to payment'
        )}
      </button>
      <p className="mt-3 text-center text-xs text-stone-500">
        You'll confirm and pay on the next step. Free cancellation before your session.
      </p>
    </form>
  );
}
