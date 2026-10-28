import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useBooking, useInitializePayment } from '../api/hooks';
import { getApiError } from '../api/client';
import { bookingWhen, formatDate, naira } from '../lib/format';
import Spinner from '../components/Spinner';

export default function Checkout() {
  const { bookingId } = useParams();
  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const initialize = useInitializePayment();

  const handlePay = () => {
    initialize.mutate(bookingId, {
      onSuccess: ({ authorizationUrl }) => {
        // Hand over to Paystack's hosted checkout.
        window.location.assign(authorizationUrl);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading your booking…" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Booking not found</h1>
        <Link to="/dashboard" className="btn-outline mt-6">
          <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
        </Link>
      </div>
    );
  }

  if (booking.status !== 'pending') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 size={44} className="mx-auto text-emerald-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold">
          This booking is {booking.status}
        </h1>
        <p className="mt-2 text-stone-400">No payment is due on it right now.</p>
        <Link to="/dashboard" className="btn-gold mt-6">
          View my bookings
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft size={15} aria-hidden="true" /> My bookings
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-stone-400">Confirm your booking and pay securely.</p>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">{booking.facility_name}</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-stone-400">
              <CalendarDays size={15} aria-hidden="true" /> Date
            </dt>
            <dd className="font-medium text-stone-200">{formatDate(booking.booking_date)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-stone-400">Time</dt>
            <dd className="font-medium text-stone-200">
              {bookingWhen(booking)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-stone-400">
              <Users size={15} aria-hidden="true" /> Guests
            </dt>
            <dd className="font-medium text-stone-200">{booking.number_of_guests}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-stone-800 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-stone-300">Total due</span>
            <span className="font-display text-3xl font-bold text-gold-300">
              {naira(booking.total_amount)}
            </span>
          </div>
        </div>

        {initialize.isError && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {getApiError(initialize.error)}
          </p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={initialize.isPending}
          className="btn-gold mt-5 w-full"
        >
          {initialize.isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Connecting to Paystack…
            </>
          ) : (
            <>
              <Lock size={16} aria-hidden="true" />
              Pay {naira(booking.total_amount)} with Paystack
            </>
          )}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-500">
          <ShieldCheck size={14} className="text-emerald-400" aria-hidden="true" />
          Secured by Paystack — cards, bank transfer &amp; USSD
        </p>
      </div>

      <div className="card mt-4 border-gold-400/20 bg-gold-400/5 p-4 text-xs leading-relaxed text-stone-400">
        <p className="font-semibold text-gold-300">Test mode</p>
        <p className="mt-1">
          Use Paystack's test card <span className="font-mono text-stone-200">4084 0840 8408 4081</span>,
          any future expiry, CVV <span className="font-mono text-stone-200">408</span>, OTP{' '}
          <span className="font-mono text-stone-200">123456</span>.
        </p>
      </div>
    </section>
  );
}
