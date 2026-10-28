import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Check, Clock, RotateCcw, Users } from 'lucide-react';
import { getApiError } from '../api/client';
import { useFacilities, useIsGymMember } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_META, categoryMeta } from '../lib/categories';
import { facilityCta, facilityPricing } from '../lib/facilityCta';
import BenefitBadge from '../components/BenefitBadge';
import { facilityMedia } from '../lib/images';
import { formatTime, naira } from '../lib/format';
import MediaCarousel from '../components/MediaCarousel';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import FacilityScene, { FacilityAccents } from '../components/scenes/FacilityScene';
import { EASE, Magnetic, MaskText } from '../components/motionKit';

const FILTERS = [
  { value: '', label: 'All' },
  ...Object.entries(CATEGORY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

/**
 * One editorial spread per facility: living media on one side, the story
 * and booking facts on the other, alternating left/right down the page.
 */
function ShowcaseRow({ facility, index, isMember }) {
  const meta = categoryMeta(facility.category);
  const { Icon } = meta;
  const cta = facilityCta(facility, { isMember });
  const isBenefit = cta.kind === 'benefit';
  const pricing = facilityPricing(facility);
  const flip = index % 2 === 1;
  const amenities = (Array.isArray(facility.amenities) ? facility.amenities : []).slice(0, 4);
  const hours =
    facility.opening_time && facility.closing_time
      ? `${formatTime(facility.opening_time)} – ${formatTime(facility.closing_time)}`
      : 'Open daily';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      exit={{ opacity: 0, y: -24, transition: { duration: 0.3 } }}
      transition={{ duration: 0.7, ease: EASE }}
      // Below lg this is a stack — name, then media, then the action. From lg
      // it becomes the editorial spread: media filling one column, the story
      // stacked in the other, sides alternating down the page.
      className="flex flex-col gap-2.5 sm:gap-3 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-16 lg:gap-y-5"
    >
      {/* Name first. A photograph with no caption above it makes a visitor
          decode the image before they know what they're looking at; the
          label answers that before they start. */}
      <header
        className={`order-1 ${flip ? 'lg:col-start-2' : 'lg:col-start-1'} lg:row-start-1`}
      >
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] sm:gap-3 sm:text-xs sm:tracking-[0.25em]">
          <span className="font-display text-sm italic text-gold-400 sm:text-base">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="hidden h-px w-10 bg-gold-400/50 sm:block" aria-hidden="true" />
          <span className={`inline-flex items-center gap-1.5 ${meta.text}`}>
            <Icon size={12} aria-hidden="true" />
            {meta.label}
          </span>
        </p>

        <h2 className="mt-1 font-display text-lg font-bold text-balance sm:mt-3 sm:text-3xl lg:text-4xl">
          <Link
            to={`/facilities/${facility.slug}`}
            className="transition-colors duration-300 hover:text-gold-300"
          >
            {facility.name}
          </Link>
        </h2>
      </header>

      {/* Living media */}
      <Link
        to={`/facilities/${facility.slug}`}
        aria-label={`${cta.label} — ${facility.name}`}
        className={`group relative order-2 block overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:rounded-3xl lg:row-span-2 lg:row-start-1 ${
          flip ? 'lg:col-start-1' : 'lg:col-start-2'
        }`}
      >
        <div className="relative h-40 overflow-hidden sm:h-96 lg:h-[26rem]">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100">
            <MediaCarousel
              items={facilityMedia(facility)}
              interval={7200 + (index % 5) * 800}
              kenburns
              indicators="mini"
              fallback={<FacilityScene facility={facility} />}
            />
            <FacilityAccents facility={facility} />
          </div>
          <div
            className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent"
            aria-hidden="true"
          />
          <span className="absolute bottom-2.5 left-2.5 rounded-full border border-white/15 bg-stone-950/70 px-2.5 py-1 text-[11px] backdrop-blur-md sm:bottom-4 sm:left-4 sm:px-4 sm:py-1.5 sm:text-sm">
            {isBenefit ? (
              <span className="font-semibold text-gold-300">
                Included with membership
              </span>
            ) : pricing.kind === 'quote' ? (
              <span className="font-display font-semibold italic text-gold-300 sm:text-base">
                {pricing.label}
              </span>
            ) : (
              <>
                {pricing.kind === 'from' && <span className="text-stone-400">from </span>}
                <span className="font-display font-bold text-gold-300 sm:text-base">
                  {naira(pricing.amount ?? facility.price_per_session)}
                </span>{' '}
                {/* The unit is the first thing to drop — at this size the
                    figure alone carries the meaning. */}
                <span className="hidden text-stone-400 sm:inline">{pricing.unit}</span>
              </>
            )}
          </span>
          <span
            className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:border-gold-400 group-hover:bg-gold-400 group-hover:text-stone-950 sm:bottom-4 sm:right-4 sm:h-11 sm:w-11"
            aria-hidden="true"
          >
            <ArrowUpRight size={16} className="sm:hidden" />
            <ArrowUpRight size={18} className="hidden sm:block" />
          </span>
        </div>
      </Link>

      {/* Story + booking facts */}
      <div
        className={`order-3 ${flip ? 'lg:col-start-2' : 'lg:col-start-1'} lg:row-start-2`}
      >
        {/* The long story is what the editorial layout exists for, and dead
            weight in a narrow card — it only appears once the spread does. */}
        <p className="hidden max-w-xl leading-relaxed text-pretty text-stone-400 lg:block">
          {facility.long_description || facility.description}
        </p>

        <dl className="mt-6 hidden flex-wrap gap-x-8 gap-y-3 text-sm text-stone-300 lg:flex">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Hours</dt>
            <Clock size={15} className="text-gold-400" aria-hidden="true" />
            <dd>{hours}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Capacity</dt>
            <Users size={15} className="text-gold-400" aria-hidden="true" />
            <dd>Up to {facility.capacity} guests</dd>
          </div>
        </dl>

        {amenities.length > 0 && (
          <ul className="mt-6 hidden flex-wrap gap-2 lg:flex">
            {amenities.map((a) => (
              <li
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-800 bg-stone-900/60 px-3 py-1.5 text-xs text-stone-300"
              >
                <Check size={11} className="text-gold-300" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        )}

        <div className="lg:mt-8">
          {isBenefit ? (
            // No action to take — table tennis comes with a membership — so this
            // is a status label, not a button. The gym link beside it is the
            // real next step for anyone who isn't a member yet.
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-y-3">
              <span className="hidden sm:block">
                <BenefitBadge label={cta.label} size="lg" />
              </span>
              <span className="sm:hidden">
                <BenefitBadge label="Included" />
              </span>
              <p className="hidden text-sm text-stone-400 sm:block">{cta.note}</p>
              {!isMember && (
                <Link
                  to="/facilities/gym"
                  className="hidden text-sm font-semibold text-gold-300 underline-offset-4 transition-colors hover:text-gold-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:block"
                >
                  View Membership
                </Link>
              )}
            </div>
          ) : (
            <Magnetic>
              <Link
                to={cta.to}
                className="btn-gold w-full justify-center !px-3 !py-2 text-xs sm:w-auto sm:!px-6 sm:!py-3 sm:text-sm"
              >
                {cta.label}{' '}
                <ArrowUpRight size={14} className="hidden sm:inline" aria-hidden="true" />
              </Link>
            </Magnetic>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Facilities() {
  const [category, setCategory] = useState('');
  const { data: facilities, isLoading, isError, error, refetch } = useFacilities();
  const { user } = useAuth();
  const isMember = useIsGymMember({ enabled: Boolean(user) });

  // One fetch, client-side filtering — keeps switching instant and lets
  // the pills show live counts.
  const shown = useMemo(
    () =>
      category
        ? (facilities ?? []).filter((f) => f.category === category)
        : facilities ?? [],
    [facilities, category]
  );
  const counts = useMemo(
    () =>
      (facilities ?? []).reduce(
        (acc, f) => ({ ...acc, [f.category]: (acc[f.category] ?? 0) + 1 }),
        {}
      ),
    [facilities]
  );

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
      {/* ——— Editorial header ——— */}
      <Reveal>
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
          <span className="h-px w-10 bg-gold-400/50" aria-hidden="true" />
          The complex
        </p>
      </Reveal>
      <h1 className="mt-3 max-w-[12ch] font-display text-[2rem] font-bold leading-[1.05] text-balance sm:mt-4 sm:max-w-2xl sm:text-6xl">
        <MaskText
          lines={[
            <>Choose your</>,
            <>
              <span className="italic text-gold-300">world.</span>
            </>,
          ]}
        />
      </h1>
      <Reveal delay={0.15}>
        <p className="mt-4 max-w-[40ch] text-sm text-pretty text-stone-400 sm:mt-5 sm:max-w-xl sm:text-base">
          Five spaces under one roof — each with its own way in, from a gym
          membership to a room for the night to a pitch by the hour.
        </p>
      </Reveal>

      {/* ——— Filter bar ——— */}
      <Reveal delay={0.2}>
        <div
          className="mt-10 flex flex-wrap items-center gap-2 border-y border-stone-800/70 py-4"
          role="group"
          aria-label="Filter by category"
        >
          {FILTERS.map((f) => {
            const count = f.value ? counts[f.value] ?? 0 : facilities?.length ?? 0;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setCategory(f.value)}
                aria-pressed={category === f.value}
                className={`min-h-11 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
                  category === f.value
                    ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                    : 'border-stone-700 text-stone-300 hover:border-stone-500'
                }`}
              >
                {f.label}
                {facilities && (
                  <span
                    className={`ml-1.5 text-xs ${
                      category === f.value ? 'text-gold-400/80' : 'text-stone-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {facilities && (
            <span className="ml-auto hidden text-xs uppercase tracking-[0.2em] text-stone-500 sm:block">
              {shown.length} of {facilities.length} spaces
            </span>
          )}
        </div>
      </Reveal>

      {/* ——— Showcase ——— */}
      <div className="mt-16">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Spinner label="Loading facilities…" />
          </div>
        ) : isError ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="text-stone-300">We couldn't load the facilities.</p>
            <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
            <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
              <RotateCcw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="card mx-auto max-w-md p-8 text-center text-stone-400">
            No facilities in this category yet.
          </div>
        ) : (
          // Phones get a compact two-up grid; the full editorial spread —
          // alternating sides, numbered sections, the long story — only
          // makes sense once there's width for it.
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-24">
            <AnimatePresence mode="popLayout">
              {shown.map((facility, i) => (
                <ShowcaseRow
                  key={facility.id}
                  facility={facility}
                  index={i}
                  isMember={isMember}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
