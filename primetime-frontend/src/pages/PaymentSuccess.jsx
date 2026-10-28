import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { useVerifyPayment } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { bookingWhen, formatDate, naira } from '../lib/format';
import MembershipCard from '../components/MembershipCard';
import Spinner from '../components/Spinner';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const { data, isLoading, isError } = useVerifyPayment(reference);

  if (!reference) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CircleAlert size={44} className="mx-auto text-gold-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold">No payment reference</h1>
        <p className="mt-2 text-stone-400">
          We couldn't find a payment to verify. Check your bookings instead.
        </p>
        <Link to="/dashboard" className="btn-gold mt-6">
          My bookings
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <Spinner label="Confirming your payment with Paystack…" />
        <p className="text-xs text-stone-500">This usually takes a couple of seconds.</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <XCircle size={44} className="mx-auto text-red-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold">Verification failed</h1>
        <p className="mt-2 text-stone-400">
          We couldn't verify this payment. If you were charged, it will be
          reconciled automatically — check your bookings in a few minutes.
        </p>
        <Link to="/dashboard" className="btn-gold mt-6">
          My bookings
        </Link>
      </div>
    );
  }

  const { status, booking, membership, registration } = data;

  // Registration fee paid — enrollment done, plans are now unlocked.
  if (status === 'success' && registration) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <CheckCircle2 size={52} className="mx-auto text-emerald-400" aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl font-bold">
          You're registered!
        </h1>
        <p className="mt-2 text-stone-400">
          Your member file is open and your one-time fee is paid — for good.
          One step left: pick the plan that fits your rhythm.
        </p>

        <div className="card mt-8 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Next step
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Choose a plan — day pass, weekly or monthly. Pay for it and your
            digital access card (with your personal QR code) is issued
            instantly.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/facilities/gym" className="btn-gold">
            Choose my plan
          </Link>
          <Link to="/dashboard" className="btn-outline">
            My dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (status === 'success' && membership) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <CheckCircle2 size={52} className="mx-auto text-emerald-400" aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl font-bold">You're a member!</h1>
        <p className="mt-2 text-stone-400">
          Your digital card is ready — show its QR code at the door.
        </p>

        <div className="mt-8 text-left">
          <MembershipCard
            membership={membership}
            memberName={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="btn-gold">
            View my membership
          </Link>
          <Link to="/facilities" className="btn-outline">
            Explore facilities
          </Link>
        </div>
      </section>
    );
  }

  if (status === 'success') {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <CheckCircle2 size={52} className="mx-auto text-emerald-400" aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl font-bold">Payment confirmed!</h1>
        <p className="mt-2 text-stone-400">
          Your booking is locked in. A confirmation email is on its way.
        </p>

        {booking && (
          <div className="card mt-8 p-6 text-left">
            <h2 className="font-display text-xl font-semibold">{booking.facility_name}</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-stone-400">
                  <CalendarDays size={15} aria-hidden="true" /> Date
                </dt>
                <dd className="font-medium text-stone-200">
                  {formatDate(booking.booking_date)}
                </dd>
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
              <div className="flex items-center justify-between border-t border-stone-800 pt-2.5">
                <dt className="text-stone-400">Paid</dt>
                <dd className="font-semibold text-gold-300">{naira(booking.total_amount)}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="btn-gold">
            View my bookings
          </Link>
          <Link to="/facilities" className="btn-outline">
            Book another facility
          </Link>
        </div>
      </section>
    );
  }

  if (status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <XCircle size={44} className="mx-auto text-red-400" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold">Payment failed</h1>
        <p className="mt-2 text-stone-400">
          Your card wasn't charged successfully. You can try again from checkout.
        </p>
        {booking?.id && (
          <Link to={`/checkout/${booking.id}`} className="btn-gold mt-6">
            Try again
          </Link>
        )}
        {data.payment?.membership_id && (
          <Link to="/facilities/gym" className="btn-gold mt-6">
            Try again
          </Link>
        )}
        {data.payment?.gym_profile_id && (
          <Link to="/gym/join" className="btn-gold mt-6">
            Try again
          </Link>
        )}
      </div>
    );
  }

  // abandoned / ongoing
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <CircleAlert size={44} className="mx-auto text-gold-400" aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl font-bold">Payment not completed</h1>
      <p className="mt-2 text-stone-400">
        {data.payment?.membership_id
          ? "It looks like the payment wasn't finished — your membership hasn't started yet."
          : data.payment?.gym_profile_id
            ? "It looks like the payment wasn't finished — your registration isn't complete yet. Your details are saved, so it takes one tap to retry."
            : 'It looks like the payment was not finished. Your booking is still held as pending — you can complete payment any time.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {data.payment?.booking_id && (
          <Link to={`/checkout/${data.payment.booking_id}`} className="btn-gold">
            Resume payment
          </Link>
        )}
        {data.payment?.membership_id && (
          <Link to="/facilities/gym" className="btn-gold">
            Pick a plan
          </Link>
        )}
        {data.payment?.gym_profile_id && (
          <Link to="/gym/join" className="btn-gold">
            Finish registration
          </Link>
        )}
        <Link to="/dashboard" className="btn-outline">
          My dashboard
        </Link>
      </div>
    </div>
  );
}
