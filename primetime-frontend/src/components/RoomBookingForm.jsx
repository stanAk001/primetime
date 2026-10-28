import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarDays, Users } from 'lucide-react';
import { useCreateBooking } from '../api/hooks';
import { getApiError } from '../api/client';
import { naira, todayISO } from '../lib/format';

const addDays = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const nightsBetween = (from, to) => {
  if (!from || !to || to <= from) return 0;
  return Math.round(
    (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000
  );
};

/**
 * Booking a room, not a session: you pick the room first, then the nights.
 *
 * The total is nightly rate × nights and never touches guest count — a room
 * costs what the room costs. Guests are only checked against how many the
 * room sleeps.
 */
export default function RoomBookingForm({ facility, rooms, selectedRoomId, onSelectRoom }) {
  const navigate = useNavigate();
  const createBooking = useCreateBooking();

  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 1));
  const [guests, setGuests] = useState(2);

  const room = rooms?.find((r) => r.id === selectedRoomId) ?? null;
  const nights = nightsBetween(checkIn, checkOut);
  const total = useMemo(
    () => (room ? Number(room.price_per_night) * nights : 0),
    [room, nights]
  );

  const tooManyGuests = room?.capacity ? guests > room.capacity : false;
  const canSubmit = room && nights > 0 && !tooManyGuests && !createBooking.isPending;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    createBooking.mutate(
      {
        facilityId: facility.id,
        roomId: room.id,
        bookingDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: Number(guests),
      },
      { onSuccess: (booking) => navigate(`/checkout/${booking.id}`) }
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="room-select" className="block text-sm text-stone-400">
        Room
      </label>
      <select
        id="room-select"
        value={selectedRoomId ?? ''}
        onChange={(e) => onSelectRoom(e.target.value)}
        className="mt-1.5 w-full cursor-pointer rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
      >
        <option value="" disabled>
          Choose a room…
        </option>
        {(rooms ?? []).map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} — {naira(r.price_per_night)}/night
          </option>
        ))}
      </select>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="check-in" className="block text-sm text-stone-400">
            Check in
          </label>
          <input
            id="check-in"
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => {
              const next = e.target.value;
              setCheckIn(next);
              if (checkOut <= next) setCheckOut(addDays(next, 1));
            }}
            className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
          />
        </div>
        <div>
          <label htmlFor="check-out" className="block text-sm text-stone-400">
            Check out
          </label>
          <input
            id="check-out"
            type="date"
            value={checkOut}
            min={addDays(checkIn, 1)}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
          />
        </div>
      </div>

      <label htmlFor="room-guests" className="mt-4 block text-sm text-stone-400">
        Guests
      </label>
      <input
        id="room-guests"
        type="number"
        min={1}
        max={room?.capacity ?? 8}
        value={guests}
        onChange={(e) => setGuests(Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
      />
      {room && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
          <Users size={12} aria-hidden="true" />
          {room.name} sleeps {room.capacity} · {room.bed}
        </p>
      )}
      {tooManyGuests && (
        <p className="mt-2 text-sm text-red-400/90">
          {room.name} sleeps {room.capacity}. Choose a larger room.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-stone-800 pt-4">
        <span className="flex items-center gap-1.5 text-sm text-stone-400">
          <CalendarDays size={14} aria-hidden="true" />
          {nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Pick your dates'}
        </span>
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
      {room && nights > 0 && (
        <p className="mt-1 text-right text-xs text-stone-500">
          {naira(room.price_per_night)} × {nights} night{nights === 1 ? '' : 's'}
        </p>
      )}

      {createBooking.isError && (
        <p className="mt-3 text-sm text-red-400/90">
          {getApiError(createBooking.error)}
        </p>
      )}

      <button type="submit" disabled={!canSubmit} className="btn-gold mt-5 w-full disabled:opacity-60">
        {createBooking.isPending ? 'Holding your room…' : 'Reserve this room'}
      </button>
      <p className="mt-3 text-center text-xs text-stone-500">
        Pay to confirm — your room is held until then.
      </p>
    </form>
  );
}
