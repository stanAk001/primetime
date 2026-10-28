import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Users,
  XCircle,
} from 'lucide-react';
import { useCancelBooking, useMyBookings, useMyMemberships } from '../api/hooks';
import { getApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { categoryMeta } from '../lib/categories';
import { facilityImage } from '../lib/images';
import { bookingWhen, formatDate, naira, todayISO } from '../lib/format';
import MembershipCard from '../components/MembershipCard';
import PlanPicker from '../components/PlanPicker';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

function BookingRow({ booking, onCancel, cancelling }) {
  const meta = categoryMeta(booking.facility_category);
  const isFuture = booking.booking_date >= todayISO();
  const canCancel = ['pending', 'confirmed'].includes(booking.status) && isFuture;
  const canPay = booking.status === 'pending' && isFuture;

  return (
    <li className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <img
        src={facilityImage({ slug: booking.facility_slug, category: booking.facility_category })}
        alt=""
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-xl border border-stone-800 object-cover sm:h-14 sm:w-14"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-display text-lg font-semibold">{booking.facility_name}</h3>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            {formatDate(booking.booking_date)}
          </span>
          <span>{bookingWhen(booking)}</span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" />
            {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <p className="font-semibold text-gold-300">{naira(booking.total_amount)}</p>
        <div className="flex gap-2">
          {canPay && (
            <Link
              to={`/checkout/${booking.id}`}
              className="btn-gold !min-h-9 !px-4 !py-1.5 text-sm"
            >
              <CreditCard size={14} aria-hidden="true" /> Pay now
            </Link>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => onCancel(booking)}
              className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm hover:!border-red-400/60 hover:!text-red-300"
            >
              <XCircle size={14} aria-hidden="true" /> Cancel
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: bookings, isLoading, isError, error } = useMyBookings();
  const { data: memberships } = useMyMemberships();
  const cancelBooking = useCancelBooking();
  const [renewing, setRenewing] = useState(false);

  const gymMemberships = memberships?.filter((m) => m.facility_slug === 'gym') ?? [];
  // Prefer a currently valid membership; failing that, the most recent
  // one that was ever actually activated (so an abandoned, never-paid
  // attempt started after it doesn't hijack the card).
  const gymMembership =
    gymMemberships.find((m) => m.is_valid_now) ??
    gymMemberships.find((m) => m.starts_at) ??
    null;
  const hasRegistered = gymMemberships.some((m) => m.registration_fee_paid && m.starts_at);
  // Order history — every plan ever actually paid for, newest first.
  const membershipHistory = gymMemberships.filter((m) => m.starts_at);

  const handleCancel = (booking) => {
    const ok = window.confirm(
      `Cancel your ${booking.facility_name} booking on ${formatDate(booking.booking_date)}?`
    );
    if (!ok) return;
    cancelBooking.mutate(
      { id: booking.id, reason: 'Cancelled by customer' },
      { onError: (err) => window.alert(getApiError(err)) }
    );
  };

  const upcoming =
    bookings?.filter(
      (b) => b.status === 'confirmed' && b.booking_date >= todayISO()
    ).length ?? 0;
  const awaitingPayment =
    bookings?.filter((b) => b.status === 'pending').length ?? 0;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-[1.75rem] font-bold text-balance sm:text-4xl">
        Welcome back, <span className="text-gold-300">{user.firstName}</span>
      </h1>
      <p className="mt-2 text-stone-400">Your bookings at Primetime, all in one place.</p>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-4">
          <dt className="text-xs uppercase tracking-wider text-stone-500">Upcoming</dt>
          <dd className="mt-1 font-display text-3xl font-bold text-gold-300">{upcoming}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs uppercase tracking-wider text-stone-500">Awaiting payment</dt>
          <dd className="mt-1 font-display text-3xl font-bold text-gold-300">
            {awaitingPayment}
          </dd>
        </div>
      </dl>

      {gymMembership && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Gym membership</h2>
          <div className="mt-5 max-w-md">
            <MembershipCard
              membership={gymMembership}
              memberName={`${user.firstName} ${user.lastName ?? ''}`.trim()}
            />
            {renewing ? (
              <div className="card mt-4 p-5">
                <h3 className="font-display text-lg font-semibold">Renew or extend</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Buying a plan now extends from{' '}
                  {gymMembership.is_valid_now
                    ? formatDate(gymMembership.expires_at)
                    : 'today'}
                  .
                </p>
                <div className="mt-4">
                  <PlanPicker facilitySlug="gym" hasRegistered={hasRegistered} />
                </div>
                <button
                  type="button"
                  onClick={() => setRenewing(false)}
                  className="mt-3 text-sm text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRenewing(true)}
                className="btn-outline mt-4 w-full"
              >
                {gymMembership.is_valid_now ? 'Extend membership' : 'Renew membership'}
              </button>
            )}

            {membershipHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-stone-300">Membership history</h3>
                <ul className="mt-3 space-y-2">
                  {membershipHistory.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-stone-200">
                          {m.plan_name}
                          {m.registration_fee_paid && (
                            <span className="ml-2 text-xs font-normal text-gold-400/80">
                              + registration
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {formatDate(m.starts_at)} – {formatDate(m.expires_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-medium text-stone-300">{naira(m.total_amount)}</span>
                        <span
                          className={`text-xs font-medium ${
                            m.is_valid_now ? 'text-emerald-300' : 'text-stone-500'
                          }`}
                        >
                          {m.is_valid_now ? 'Active' : 'Expired'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">My bookings</h2>
          <Link
            to="/facilities"
            className="inline-flex items-center gap-1 text-sm font-medium text-gold-400 transition-colors hover:text-gold-300"
          >
            New booking <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner label="Loading your bookings…" />
            </div>
          ) : isError ? (
            <div className="card p-8 text-center text-stone-400">{getApiError(error)}</div>
          ) : bookings?.length === 0 ? (
            <div className="card p-10 text-center">
              <CalendarDays size={36} className="mx-auto text-stone-600" aria-hidden="true" />
              <p className="mt-4 font-medium text-stone-300">No bookings yet</p>
              <p className="mt-1 text-sm text-stone-500">
                Your gym sessions, hotel stays and lounge nights will show up here.
              </p>
              <Link to="/facilities" className="btn-gold mt-6">
                Explore facilities
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookings.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancel}
                  cancelling={cancelBooking.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
