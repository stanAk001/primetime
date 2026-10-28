import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock,
  IdCard,
  Sparkles,
  Tag,
  Users,
  Utensils,
} from 'lucide-react';
import {
  useFacility,
  useGymRegistration,
  useIsGymMember,
  useMembershipPlans,
  useMenu,
  useMyMemberships,
  useRooms,
} from '../api/hooks';
import { categoryMeta } from '../lib/categories';
import { facilityImage } from '../lib/images';
import { formatDate, formatTime, naira } from '../lib/format';
import { facilityPricing } from '../lib/facilityCta';
import BenefitBadge from '../components/BenefitBadge';
import BookingForm from '../components/BookingForm';
import FacilityActionBar from '../components/FacilityActionBar';
import MenuList from '../components/MenuList';
import RoomBookingForm from '../components/RoomBookingForm';
import RoomList from '../components/RoomList';
import PlanPicker from '../components/PlanPicker';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

function Gallery({ facility }) {
  // Prefer DB media; fall back to the curated photo set so the gallery is
  // never empty or icon-only.
  const media = (facility.media ?? []).length
    ? facility.media
    : [0, 1, 2].map((i) => ({
        id: `stock-${i}`,
        media_url: facilityImage(facility, i),
        alt_text: facility.name,
      }));

  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState({});

  const visible = media.filter((m) => !broken[m.id]);
  const activeMedia = visible[Math.min(active, Math.max(visible.length - 1, 0))];

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-stone-800 bg-stone-900 sm:aspect-[16/9]">
        <AnimatePresence mode="wait">
          {activeMedia && (
            <motion.img
              key={activeMedia.id}
              src={activeMedia.media_url}
              alt={activeMedia.alt_text || facility.name}
              className="h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onError={() => setBroken((b) => ({ ...b, [activeMedia.id]: true }))}
            />
          )}
        </AnimatePresence>
      </div>
      {visible.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Gallery thumbnails">
          {visible.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}: ${m.alt_text || facility.name}`}
              aria-current={i === active}
              className={`h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-stone-900 transition-colors ${
                i === active ? 'border-gold-400' : 'border-stone-700 hover:border-stone-500'
              }`}
            >
              <img
                src={m.media_url}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setBroken((b) => ({ ...b, [m.id]: true }))}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacilityDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: facility, isLoading, isError } = useFacility(slug);
  const isGym = facility?.slug === 'gym';
  const { data: plans } = useMembershipPlans(isGym ? 'gym' : undefined);
  const { data: memberships } = useMyMemberships({ enabled: Boolean(user) });
  const activeMembership =
    isGym && user
      ? memberships?.find((m) => m.facility_slug === 'gym' && m.is_valid_now)
      : null;
  // Enrollment (profile + one-time ₦5,000 fee) is its own step now —
  // plans stay locked until the backend says it's paid.
  const { data: registration } = useGymRegistration({
    enabled: Boolean(isGym && user),
  });
  const hasRegistered = Boolean(registration?.profile?.registration_fee_paid);
  const isMember = useIsGymMember({ enabled: Boolean(user) });
  const isBenefit = facility?.booking_mode === 'benefit';
  const hours =
    facility?.opening_time && facility?.closing_time
      ? `${formatTime(facility.opening_time)} – ${formatTime(facility.closing_time)}`
      : 'daily';
  const pricing = facilityPricing(facility);
  // How this facility is actually transacted. Everything in the sidebar
  // branches on this rather than on slugs scattered through the component.
  const mode = facility?.booking_mode ?? 'session';
  const { data: rooms } = useRooms(mode === 'room' ? facility?.slug : undefined);
  const { data: menu } = useMenu(mode === 'walk_in' ? facility?.slug : undefined);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Default to the cheapest room so the panel is never in an empty state.
  useEffect(() => {
    if (!selectedRoomId && rooms?.length) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);
  const cheapestPlan = plans?.length
    ? plans.reduce((min, p) => (Number(p.price) < Number(min.price) ? p : min))
    : null;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading facility…" />
      </div>
    );
  }

  if (isError || !facility) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Facility not found</h1>
        <p className="mt-2 text-stone-400">
          It may have been removed or the link is wrong.
        </p>
        <Link to="/facilities" className="btn-outline mt-6">
          <ArrowLeft size={16} aria-hidden="true" /> Back to facilities
        </Link>
      </div>
    );
  }

  const meta = categoryMeta(facility.category);
  const amenities = Array.isArray(facility.amenities) ? facility.amenities : [];

  return (
    // Bottom padding clears the action bar, and on phones the dock beneath it.
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 md:pb-28 lg:pb-10">
      <Link
        to="/facilities"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-gold-300"
      >
        <ArrowLeft size={15} aria-hidden="true" /> All facilities
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Left: gallery + info. min-w-0 is load-bearing — without it this
            column refuses to shrink below its content and the horizontally
            scrolling menu rail widens the entire page. */}
        <div className="min-w-0">
          <Gallery facility={facility} />

          <div className="mt-8">
            <span className={`text-xs font-semibold uppercase tracking-wider ${meta.text}`}>
              {meta.label}
            </span>
            <h1 className="mt-1 font-display text-[1.75rem] font-bold text-balance sm:text-4xl">
              {facility.name}
            </h1>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-pretty text-stone-300 sm:mt-4 sm:max-w-2xl sm:text-base">
              {facility.long_description || facility.description}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="card p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                  <Tag size={14} className="text-gold-400" aria-hidden="true" /> Price
                </dt>
                <dd className="mt-1.5 font-semibold text-stone-100">
                  {isBenefit ? (
                    <BenefitBadge label="Included with membership" />
                  ) : isGym ? (
                    <>
                      {cheapestPlan ? naira(cheapestPlan.price) : naira(facility.price_per_session)}{' '}
                      <span className="text-sm font-normal text-stone-400">
                        / {cheapestPlan?.duration_days === 1 ? 'day' : 'plan'}
                      </span>
                    </>
                  ) : pricing.kind === 'quote' ? (
                    <span className="italic text-gold-300">{pricing.label}</span>
                  ) : (
                    <>
                      {pricing.kind === 'from' && (
                        <span className="text-sm font-normal text-stone-400">from </span>
                      )}
                      {naira(pricing.amount ?? facility.price_per_session)}{' '}
                      <span className="text-sm font-normal text-stone-400">
                        {pricing.unit}
                      </span>
                    </>
                  )}
                </dd>
              </div>
              <div className="card p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                  <Clock size={14} className="text-gold-400" aria-hidden="true" /> Hours
                </dt>
                <dd className="mt-1.5 font-semibold text-stone-100">
                  {facility.opening_time && facility.closing_time
                    ? `${formatTime(facility.opening_time)} – ${formatTime(facility.closing_time)}`
                    : 'Open daily'}
                </dd>
              </div>
              <div className="card p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                  <Users size={14} className="text-gold-400" aria-hidden="true" /> Capacity
                </dt>
                <dd className="mt-1.5 font-semibold text-stone-100">
                  Up to {facility.capacity} guests
                </dd>
              </div>
            </dl>

            {/* Rooms and the drinks list are the substance of these two
                facilities — they belong above the amenity chips, not after
                them. Both are lazy: only the facility that needs them asks. */}
            {rooms?.length > 0 && (
              <div className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">Rooms &amp; suites</h2>
                  <p className="text-sm text-stone-500">
                    From {naira(rooms[0].price_per_night)} per night
                  </p>
                </div>
                <div className="mt-6">
                  <RoomList rooms={rooms} />
                </div>
              </div>
            )}

            {menu?.length > 0 && (
              <div className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">The menu</h2>
                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-300 transition-colors hover:text-gold-200"
                  >
                    Open the table menu <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-6">
                  <MenuList menu={menu} />
                </div>
              </div>
            )}

            {amenities.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold">Amenities</h2>
                <ul className="mt-4 grid grid-cols-2 gap-2.5">
                  {amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-sm text-stone-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/15">
                        <Check size={12} className="text-gold-300" aria-hidden="true" />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right: booking / membership card */}
        <aside id="act" className="min-w-0 scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            {isGym ? (
              <>
                <h2 className="font-display text-xl font-semibold">
                  {activeMembership ? 'Extend your membership' : 'Join the gym'}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Pick a plan — pay securely, get your digital card instantly.
                </p>
                {activeMembership && (
                  <p className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-gold-200">
                    You're already a member until{' '}
                    {formatDate(activeMembership.expires_at)}. Buying a plan below
                    extends your access from that date.
                  </p>
                )}
                <div className="mt-5">
                  {user && hasRegistered ? (
                    <PlanPicker facilitySlug="gym" />
                  ) : user ? (
                    <div>
                      <p className="flex items-start gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-gold-200">
                        <IdCard size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                        Step 1 of 2 — register as a member first. Tell us about
                        yourself and your goals, pay the one-time ₦5,000 fee,
                        and every plan below unlocks.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-stone-400">
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-gold-400" aria-hidden="true" />
                          Personal training profile &amp; goals
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-gold-400" aria-hidden="true" />
                          Digital access card with QR code
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-gold-400" aria-hidden="true" />
                          Paid once — never again
                        </li>
                      </ul>
                      <Link to="/gym/join" className="btn-gold mt-5 w-full">
                        Register — ₦5,000 one-time
                      </Link>
                      <p className="mt-3 text-center text-xs text-stone-500">
                        Already registered? Plans appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm leading-relaxed text-stone-400">
                        Sign in to join the gym — it takes less than a minute.
                      </p>
                      <Link to="/login" className="btn-gold mt-5 w-full">
                        Sign in to join
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : isBenefit ? (
              // Table tennis isn't reserved — it's part of a membership. No booking
              // form here, just what a member needs to know and, for everyone
              // else, the one action that actually unlocks it.
              <>
                <h2 className="font-display text-xl font-semibold">
                  Included with membership
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  No booking, no court fee
                </p>
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-gold-200">
                  <Sparkles size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {isMember
                    ? 'Your membership is active — the tables are yours whenever you want a break from the floor. Just show your digital card at the front desk.'
                    : 'The tables are free to play for anyone on an active gym membership — a break from the floor whenever you want one.'}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-stone-400">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    No reservation needed
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    Bats &amp; balls at the front desk
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    Two tables, open until close
                  </li>
                </ul>
                {isMember ? (
                  <Link to="/dashboard" className="btn-outline mt-5 w-full">
                    View my digital card
                  </Link>
                ) : (
                  <>
                    <Link to="/facilities/gym" className="btn-gold mt-5 w-full">
                      View Membership
                    </Link>
                    <p className="mt-3 text-center text-xs text-stone-500">
                      Table tennis is complimentary for active gym members.
                    </p>
                  </>
                )}
              </>
            ) : mode === 'walk_in' ? (
              // No reservation and no prepayment — you walk in, order at the
              // table and settle the bill. Offering a "book a session" form
              // here was simply the wrong model for a lounge.
              <>
                <h2 className="font-display text-xl font-semibold">Just walk in</h2>
                <p className="mt-1 text-sm text-stone-500">
                  No reservation, no cover charge
                </p>
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-gold-200">
                  <Utensils size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Find a table, scan the code on it, and order from your phone.
                  You only pay for what you order, at the table, when you're
                  done.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-stone-400">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    Open {hours}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    Order and call a waiter from your phone
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-gold-400" aria-hidden="true" />
                    Live music through the evening
                  </li>
                </ul>
                <Link to="/menu" className="btn-gold mt-5 w-full">
                  View the full menu
                </Link>
                <p className="mt-3 text-center text-xs text-stone-500">
                  Large group or a private table? Call us on arrival.
                </p>
              </>
            ) : mode === 'room' ? (
              <>
                <h2 className="font-display text-xl font-semibold">Reserve a room</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Priced per night, not per guest
                </p>
                <div className="mt-5">
                  <RoomBookingForm
                    facility={facility}
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold">Book {facility.name}</h2>
                <p className="mt-1 text-sm text-stone-500">Instant confirmation after payment</p>
                <div className="mt-5">
                  <BookingForm facility={facility} />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <FacilityActionBar facility={facility} isMember={isMember} />
    </section>
  );
}
