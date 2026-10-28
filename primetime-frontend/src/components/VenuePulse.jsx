import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BedDouble, Dumbbell, Trophy, Wine } from 'lucide-react';
import { useVenuePulse } from '../api/hooks';
import { naira } from '../lib/format';
import { formatTime } from '../lib/format';

/**
 * What is happening in the complex, right now.
 *
 * Most venues can't build this because they have no live data. Every number
 * here is already in the database — gym scans, pitch bookings, room stays,
 * open tabs — and until now none of it was ever shown to a visitor.
 *
 * The honesty rule: nothing here is inflated. A quiet gym says "quiet",
 * which is genuinely useful information to someone deciding whether to come
 * now or at eight. Manufactured scarcity would be noticed and would cost
 * more trust than it bought.
 */
const BUSY_COPY = {
  quiet: { label: 'Quiet now', tone: 'text-emerald-300', bar: 'bg-emerald-400' },
  steady: { label: 'Steady', tone: 'text-gold-300', bar: 'bg-gold-400' },
  busy: { label: 'Busy', tone: 'text-orange-300', bar: 'bg-orange-400' },
};

function Stat({ Icon, label, value, sub, to, accent = 'text-gold-300', children }) {
  const body = (
    <div className="flex h-full flex-col rounded-2xl border border-stone-800/80 bg-stone-900/50 p-3.5 transition-colors duration-300 hover:border-stone-700 sm:p-5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
        <Icon size={13} className="text-stone-500" aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-2 font-display text-xl font-bold leading-none sm:text-2xl ${accent}`}>
        {value}
      </p>
      {children}
      {sub && <p className="mt-1.5 text-[11px] text-stone-500">{sub}</p>}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function VenuePulse() {
  const { data: pulse, isLoading } = useVenuePulse();

  if (isLoading || !pulse) return null;

  const busy = BUSY_COPY[pulse.gym.busyness] ?? BUSY_COPY.quiet;

  return (
    <section
      aria-label="What's happening right now"
      className="border-y border-stone-800/70 bg-stone-950"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400 sm:text-xs sm:tracking-[0.25em]">
            {/* The pulsing dot is the whole point — it says "this is live",
                which is the claim the section is making. */}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  pulse.open ? 'animate-ping bg-emerald-400' : 'bg-stone-600'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  pulse.open ? 'bg-emerald-400' : 'bg-stone-600'
                }`}
              />
            </span>
            {pulse.open ? 'Open now' : 'Closed'}
          </p>
          <p className="text-[11px] text-stone-500">
            {pulse.open
              ? `Until ${formatTime(pulse.closesAt)}`
              : `Opens ${formatTime(pulse.opensAt)}`}
          </p>
        </div>

        <h2 className="mt-3 max-w-[16ch] font-display text-[1.75rem] font-bold leading-[1.15] text-balance sm:max-w-none sm:text-4xl">
          Inside the complex, <span className="italic text-gold-300">right now</span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        >
          <Stat
            Icon={Dumbbell}
            label="The gym"
            value={busy.label}
            accent={busy.tone}
            sub="Based on scans in the last 90 minutes"
            to="/facilities/gym"
          >
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-stone-800">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.max(pulse.gym.occupancy, 4)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full rounded-full ${busy.bar}`}
              />
            </div>
          </Stat>

          <Stat
            Icon={Trophy}
            label="The pitch"
            value={
              pulse.football.slotsLeftToday > 0
                ? `${pulse.football.slotsLeftToday} left`
                : 'Fully booked'
            }
            sub={
              pulse.football.slotsLeftToday > 0
                ? 'Slots still open today'
                : 'Try tomorrow'
            }
            to="/facilities/football-ground"
          />

          <Stat
            Icon={BedDouble}
            label="The hotel"
            value={
              pulse.hotel.roomsFreeTonight > 0
                ? `${pulse.hotel.roomsFreeTonight} free`
                : 'No rooms'
            }
            sub={
              pulse.hotel.roomsFreeTonight > 0 && pulse.hotel.fromPrice
                ? `Tonight, from ${naira(pulse.hotel.fromPrice)}`
                : 'Fully booked tonight'
            }
            to="/facilities/hotel"
          />

          <Stat
            Icon={Wine}
            label="The lounge"
            value={pulse.open ? 'Serving' : 'Closed'}
            sub={pulse.open ? 'Walk in — no booking needed' : `Opens ${formatTime(pulse.opensAt)}`}
            to="/menu"
          />
        </motion.div>
      </div>
    </section>
  );
}
