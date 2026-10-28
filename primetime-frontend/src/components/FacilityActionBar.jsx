import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Sparkles, UtensilsCrossed } from 'lucide-react';
import { naira } from '../lib/format';
import { facilityPricing } from '../lib/facilityCta';
import { useScrollDirection } from '../lib/useScrollDirection';

/**
 * The mobile action bar for a facility page.
 *
 * On desktop the booking panel sits in a sticky sidebar, always in view. On a
 * phone that same panel falls below the gallery, the description, the stats,
 * the room list or the whole drinks menu — so the one thing a visitor came to
 * do was several screens down. This keeps it in reach from the moment the
 * page opens, the way a hotel or restaurant app would.
 *
 * Hidden from lg upwards, where the sidebar already does the job.
 */
export default function FacilityActionBar({ facility, isMember = false }) {
  // Shares the dock's scroll state so the two never separate: when the dock
  // drops away the bar slides down into the space it left, instead of
  // hovering above a gap.
  const dockHidden = useScrollDirection();

  if (!facility) return null;

  const mode = facility.booking_mode ?? 'session';
  const pricing = facilityPricing(facility);

  // Where the button goes: the lounge menu is its own page, everything else
  // scrolls to the panel further down rather than navigating away.
  const config = {
    walk_in: {
      label: 'View the full menu',
      to: '/menu',
      Icon: UtensilsCrossed,
      note: 'Order at your table',
    },
    room: { label: 'Reserve a room', href: '#act', note: 'Priced per night' },
    membership: { label: 'View membership', href: '#act', note: 'Plans & registration' },
    benefit: {
      label: 'View Membership',
      to: '/facilities/gym',
      Icon: Sparkles,
      note: isMember ? 'Included with your membership' : 'Free for gym members',
    },
    session: { label: 'Check availability', href: '#act', note: 'Pick a date & time' },
  }[mode] ?? { label: 'Book', href: '#act' };

  const { Icon } = config;

  const headline =
    pricing.kind === 'benefit'
      ? 'Included'
      : pricing.kind === 'quote'
        ? pricing.label
        : `${pricing.kind === 'from' ? 'From ' : ''}${naira(
            pricing.amount ?? facility.price_per_session
          )}`;

  const inner = (
    <>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {config.label}
      {!Icon && <ArrowUpRight size={15} aria-hidden="true" />}
    </>
  );

  return (
    <motion.div
      initial={{ y: 120 }}
      animate={{ y: 0, marginBottom: dockHidden ? -76 : 0 }}
      transition={{
        y: { delay: 0.4, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        marginBottom: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
      // Sits above the dock on phones; the dock disappears at md, so from
      // there it drops to the bottom edge itself.
      className="fixed inset-x-0 bottom-20 z-40 border-y border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur-md md:bottom-0 md:mb-0 md:border-b-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-gold-300">
            {headline}
          </p>
          {config.note && (
            <p className="truncate text-[11px] text-stone-500">{config.note}</p>
          )}
        </div>

        {config.to ? (
          <Link
            to={config.to}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-gold-300"
          >
            {inner}
          </Link>
        ) : (
          <a
            href={config.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-5 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-gold-300"
          >
            {inner}
          </a>
        )}
      </div>
    </motion.div>
  );
}
