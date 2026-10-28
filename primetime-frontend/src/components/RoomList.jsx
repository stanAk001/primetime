import { motion } from 'motion/react';
import { BedDouble, Check, Maximize, Users } from 'lucide-react';
import { naira } from '../lib/format';
import { roomMedia } from '../lib/venueMedia';
import { EASE } from './motionKit';
import MediaCarousel from './MediaCarousel';

// Tier is the one thing a guest scans for, so it gets a colour rather than
// another grey chip. Luxury borrows the brand gold; the rest stay quiet.
const TIER_META = {
  basic: { label: 'Basic', chip: 'border-stone-600 bg-stone-800/80 text-stone-300' },
  standard: { label: 'Standard', chip: 'border-sky-400/40 bg-sky-400/10 text-sky-200' },
  luxury: { label: 'Luxurious', chip: 'border-gold-400/50 bg-gold-400/15 text-gold-200' },
};

function RoomCard({ room, index }) {
  const tier = TIER_META[room.tier] ?? TIER_META.basic;
  const media = roomMedia(room.media_key);
  const amenities = Array.isArray(room.amenities) ? room.amenities : [];
  const featured = room.tier === 'luxury';

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
      className={`group overflow-hidden rounded-3xl border bg-stone-900 transition-colors ${
        featured
          ? 'border-gold-400/40 hover:border-gold-400/70'
          : 'border-stone-800/80 hover:border-stone-700'
      }`}
    >
      <div className="relative h-36 overflow-hidden sm:h-60">
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100">
          <MediaCarousel items={media} interval={9000} kenburns />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/25 to-transparent"
          aria-hidden="true"
        />
        <span
          className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${tier.chip}`}
        >
          {tier.label}
        </span>
      </div>

      <div className="p-3.5 sm:p-6">
        {/* Name over price on a phone; side by side once there's width. */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h3 className="font-display text-base font-bold text-white sm:text-xl">
            {room.name}
          </h3>
          <p className="shrink-0 sm:text-right">
            <span className="font-display text-base font-bold text-gold-300 sm:text-xl">
              {naira(room.price_per_night)}
            </span>
            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-stone-500 sm:ml-0 sm:block sm:text-[11px]">
              per night
            </span>
          </p>
        </div>

        <p className="mt-2 hidden text-sm leading-relaxed text-stone-400 sm:block">
          {room.description}
        </p>

        <dl className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-stone-400 sm:mt-4 sm:gap-x-5 sm:gap-y-2 sm:text-xs">
          {room.bed && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Bed</dt>
              <BedDouble size={14} className="text-gold-400" aria-hidden="true" />
              <dd>{room.bed}</dd>
            </div>
          )}
          {room.capacity && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Sleeps</dt>
              <Users size={14} className="text-gold-400" aria-hidden="true" />
              <dd>Sleeps {room.capacity}</dd>
            </div>
          )}
          {room.size_sqm && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Size</dt>
              <Maximize size={14} className="text-gold-400" aria-hidden="true" />
              <dd>{room.size_sqm} m²</dd>
            </div>
          )}
        </dl>

        {amenities.length > 0 && (
          <ul className="mt-3 hidden flex-wrap gap-1.5 sm:mt-4 sm:flex">
            {amenities.slice(0, 5).map((a) => (
              <li
                key={a}
                className="inline-flex items-center gap-1 rounded-full border border-stone-800 bg-stone-900/60 px-2.5 py-1 text-[11px] text-stone-400"
              >
                <Check size={10} className="text-gold-300" aria-hidden="true" />
                {a}
              </li>
            ))}
            {amenities.length > 5 && (
              <li className="inline-flex items-center px-1.5 py-1 text-[11px] text-stone-500">
                +{amenities.length - 5} more
              </li>
            )}
          </ul>
        )}
      </div>
    </motion.article>
  );
}

export default function RoomList({ rooms }) {
  if (!rooms?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
      {rooms.map((room, i) => (
        <RoomCard key={room.id} room={room} index={i} />
      ))}
    </div>
  );
}
