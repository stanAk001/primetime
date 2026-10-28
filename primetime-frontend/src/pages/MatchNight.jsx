import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Check, RotateCcw, Trophy, Users, X } from 'lucide-react';
import { useMatchNights, useReserveMatchNight } from '../api/hooks';
import { getApiError } from '../api/client';
import { naira } from '../lib/format';
import { matchMedia } from '../lib/venueMedia';
import MediaCarousel from '../components/MediaCarousel';
import Reveal from '../components/Reveal';
import Spinner from '../components/Spinner';
import { EASE, MaskText } from '../components/motionKit';

const kickoffParts = (iso) => {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-NG', { weekday: 'short' }),
    date: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
  };
};

function FixtureCard({ fixture, onReserve, index }) {
  const media = useMemo(() => matchMedia(fixture.media_key), [fixture.media_key]);
  const k = kickoffParts(fixture.kickoff_at);
  const capacity = Number(fixture.room_capacity) || 0;
  const taken = Number(fixture.seats_taken) || 0;
  const left = Math.max(capacity - taken, 0);
  const fillPct = capacity ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  // Only shout about it once it is genuinely filling — a "selling fast" badge
  // on an empty room is the fastest way to stop being believed.
  const fillingUp = fillPct >= 60;
  const full = left === 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.06, 0.3) }}
      className={`group overflow-hidden rounded-2xl border bg-stone-900 sm:rounded-3xl ${
        fixture.is_featured ? 'border-gold-400/40' : 'border-stone-800/80'
      }`}
    >
      <div className="relative h-36 sm:h-48">
        <MediaCarousel items={media} interval={10000} kenburns />
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/20"
          aria-hidden="true"
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/15 bg-stone-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-200 backdrop-blur-md">
            {fixture.competition}
          </span>
          {fixture.is_featured && (
            <span className="rounded-full border border-gold-400/40 bg-gold-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-200 backdrop-blur-md">
              Main screen
            </span>
          )}
        </div>

        {/* Kickoff as a torn-off date block — a fixture is a moment in time
            before it is anything else. */}
        <div className="absolute bottom-3 left-3 flex items-end gap-3">
          <div className="rounded-xl border border-white/15 bg-stone-950/75 px-2.5 py-1.5 text-center backdrop-blur-md">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
              {k.day}
            </p>
            <p className="font-display text-sm font-bold leading-none text-white">{k.date}</p>
          </div>
          <p className="font-display text-lg font-bold text-gold-300">{k.time}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="font-display text-lg font-bold leading-tight text-balance sm:text-xl">
          {fixture.home_team} <span className="text-stone-500">v</span> {fixture.away_team}
        </h3>

        {fixture.undercard_at && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
            <Trophy size={11} aria-hidden="true" />
            Five-a-side first, {kickoffParts(fixture.undercard_at).time}
          </p>
        )}

        {fixture.note && (
          <p className="mt-2 hidden text-xs leading-relaxed text-pretty text-stone-400 sm:block">
            {fixture.note}
          </p>
        )}

        {/* How full the room is, stated plainly. */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className={full ? 'text-red-300' : fillingUp ? 'text-gold-300' : 'text-stone-500'}>
              {full ? 'Fully booked' : fillingUp ? 'Filling up' : 'Tables available'}
            </span>
            <span className="text-stone-500">{left} left</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-800">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.max(fillPct, 2)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className={`h-full rounded-full ${
                full ? 'bg-red-400' : fillingUp ? 'bg-gold-400' : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={full}
          onClick={() => onReserve(fixture)}
          className="btn-gold mt-4 w-full !px-3 !py-2.5 text-xs disabled:opacity-50 sm:!px-6 sm:!py-3 sm:text-sm"
        >
          {full ? 'Fully booked' : 'Reserve a table'}
        </button>
      </div>
    </motion.article>
  );
}

function ReserveSheet({ fixture, packages, onClose }) {
  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    partySize: 4,
    packageId: '',
    note: '',
  });
  const [done, setDone] = useState(null);
  const reserve = useReserveMatchNight();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await reserve.mutateAsync({
        fixtureId: fixture.id,
        packageId: form.packageId || undefined,
        guestName: form.guestName,
        phone: form.phone,
        partySize: Number(form.partySize),
        note: form.note,
      });
      setDone(res);
    } catch {
      /* surfaced inline */
    }
  };

  const k = kickoffParts(fixture.kickoff_at);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/75 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reserve-title"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.35, ease: EASE }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-stone-800 bg-stone-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        {done ? (
          <div className="py-4 text-center">
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
            >
              <Check size={30} aria-hidden="true" />
            </motion.span>
            <h2 className="mt-5 font-display text-2xl font-bold">Table held</h2>
            <p className="mt-2 text-sm text-stone-400">
              {fixture.home_team} v {fixture.away_team} · {k.day} {k.date}, {k.time}
            </p>
            <p className="mt-5 rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">
              Reference{' '}
              <span className="font-display text-lg font-bold tracking-widest">
                {done.reservation.reference}
              </span>
              <span className="mt-1 block text-xs text-gold-200/80">
                Give this at the door. Nothing to pay now — the bill is settled
                at your table, same as any other night.
              </span>
            </p>
            <button type="button" onClick={onClose} className="btn-gold mt-6 w-full">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="reserve-title" className="font-display text-xl font-bold">
                  Reserve a table
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {fixture.home_team} v {fixture.away_team} · {k.day} {k.date}, {k.time}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="mn-name" className="field-label">
                  Your name
                </label>
                <input
                  id="mn-name"
                  value={form.guestName}
                  onChange={set('guestName')}
                  required
                  minLength={2}
                  maxLength={120}
                  className="field-input"
                  placeholder="Akeem Gbolahan"
                />
              </div>
              <div>
                <label htmlFor="mn-phone" className="field-label">
                  Phone
                </label>
                <input
                  id="mn-phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="field-input"
                  placeholder="+234 801 234 5678"
                />
              </div>
              <div>
                <label htmlFor="mn-size" className="field-label">
                  Party size
                </label>
                <input
                  id="mn-size"
                  type="number"
                  min={1}
                  max={40}
                  value={form.partySize}
                  onChange={set('partySize')}
                  required
                  className="field-input"
                />
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="field-label">
                Package <span className="text-stone-600">(optional)</span>
              </legend>
              <div className="mt-1 space-y-2">
                {packages.map((p) => {
                  const selected = form.packageId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, packageId: selected ? '' : p.id }))
                      }
                      aria-pressed={selected}
                      className={`w-full cursor-pointer rounded-2xl border p-3.5 text-left transition-colors ${
                        selected
                          ? 'border-gold-400 bg-gold-400/10'
                          : 'border-stone-700 hover:border-stone-500'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-display font-bold text-stone-100">
                          {p.name}
                        </span>
                        <span className="font-display font-bold text-gold-300">
                          {naira(p.price)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-400">{p.tagline}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Users size={11} aria-hidden="true" /> Serves {p.serves}
                      </p>
                      {selected && (
                        <ul className="mt-2 space-y-1">
                          {(p.includes ?? []).map((inc) => (
                            <li
                              key={inc}
                              className="flex items-center gap-1.5 text-[11px] text-stone-300"
                            >
                              <Check size={10} className="text-gold-400" aria-hidden="true" />
                              {inc}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label htmlFor="mn-note" className="field-label mt-5">
              Anything we should know? <span className="text-stone-600">(optional)</span>
            </label>
            <input
              id="mn-note"
              value={form.note}
              onChange={set('note')}
              maxLength={280}
              className="field-input"
              placeholder="Near the screen, birthday, etc."
            />

            {reserve.isError && (
              <p className="mt-3 text-sm text-red-400/90">{getApiError(reserve.error)}</p>
            )}

            <button
              type="submit"
              disabled={reserve.isPending}
              className="btn-gold mt-6 w-full disabled:opacity-60"
            >
              {reserve.isPending ? 'Holding your table…' : 'Hold my table'}
            </button>
            <p className="mt-3 text-center text-xs text-stone-500">
              No payment now — settle at your table on the night.
            </p>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function MatchNight() {
  const { data, isLoading, isError, error, refetch } = useMatchNights();
  const [active, setActive] = useState(null);

  const fixtures = data?.fixtures ?? [];
  const packages = data?.packages ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-28 sm:pt-14">
      <Reveal>
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400 sm:text-xs sm:tracking-[0.25em]">
          <span className="h-px w-7 bg-gold-400/50 sm:w-10" aria-hidden="true" />
          Match nights
        </p>
      </Reveal>
      <h1 className="mt-3 max-w-[14ch] font-display text-[2rem] font-bold leading-[1.05] text-balance sm:mt-4 sm:max-w-2xl sm:text-6xl">
        <MaskText
          lines={[
            <>Play first.</>,
            <>
              <span className="italic text-gold-300">Then watch.</span>
            </>,
          ]}
        />
      </h1>
      <Reveal delay={0.15}>
        <p className="mt-4 max-w-[42ch] text-sm text-pretty text-stone-400 sm:max-w-xl sm:text-base">
          Five-a-side on our pitch, then the real match on the big screen with
          the grill going. Tables are free to hold — you only pay for what you
          eat and drink.
        </p>
      </Reveal>

      <div className="mt-8 sm:mt-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading fixtures…" />
          </div>
        ) : isError ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="text-stone-300">We couldn&apos;t load the fixtures.</p>
            <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
            <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
              <RotateCcw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="card mx-auto max-w-md p-10 text-center">
            <CalendarDays size={28} className="mx-auto text-stone-600" aria-hidden="true" />
            <p className="mt-3 font-display text-lg text-stone-300">No fixtures listed yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Check back — the next round goes up as soon as it is confirmed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {fixtures.map((f, i) => (
              <FixtureCard key={f.id} fixture={f} index={i} onReserve={setActive} />
            ))}
          </div>
        )}
      </div>

      {packages.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Match packages</h2>
          <p className="mt-1.5 max-w-[42ch] text-sm text-pretty text-stone-400">
            Optional, and ordered on the night — pick one when you reserve so
            the kitchen can plan.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {packages.map((p) => (
              <div
                key={p.id}
                className="flex h-full flex-col rounded-2xl border border-stone-800/80 bg-stone-900/50 p-4 sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-bold sm:text-lg">{p.name}</h3>
                  <span className="font-display text-base font-bold text-gold-300 sm:text-lg">
                    {naira(p.price)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
                  <Users size={11} aria-hidden="true" /> Serves {p.serves}
                </p>
                <p className="mt-2 hidden text-xs text-pretty text-stone-400 sm:block">
                  {p.tagline}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {(p.includes ?? []).map((inc) => (
                    <li
                      key={inc}
                      className="flex items-start gap-1.5 text-[11px] leading-snug text-stone-400"
                    >
                      <Check size={10} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {active && (
          <ReserveSheet
            fixture={active}
            packages={packages}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
