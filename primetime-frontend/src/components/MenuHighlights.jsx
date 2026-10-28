import { useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { naira } from '../lib/format';
import { menuItemMedia } from '../lib/venueMedia';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import MediaCarousel from './MediaCarousel';

const HERO_TAGS = ["Chef's pick", 'House speciality', 'Signature'];

/**
 * "Tonight's picks" — a swipeable rail above the full list.
 *
 * A 36-item grid is a catalogue, and a catalogue makes everyone order the
 * same beer. This gives the room a front page: the things the kitchen and
 * bar actually want to sell, big enough to be tempting, with the swipe
 * gesture people already use everywhere else on a phone.
 *
 * It bleeds past the page gutters on purpose — the card cut off at the right
 * edge is what tells you there's more without needing an arrow or a caption.
 */
function HighlightCard({ item, index }) {
  const cart = useCart();
  const flyer = useFlyToCart();
  const btnRef = useRef(null);
  const media = useMemo(() => menuItemMedia(item.media_key, index), [item, index]);
  const qty = cart?.quantityOf(item.id) ?? 0;

  const add = () => {
    cart?.add(item);
    flyer?.fly(btnRef.current, item.name);
  };

  return (
    <motion.li
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.3) }}
      className={`relative w-52 shrink-0 snap-start overflow-hidden rounded-2xl border sm:w-64 ${
        qty > 0 ? 'border-gold-400/70' : 'border-stone-800/80'
      }`}
    >
      <div className="relative h-32 sm:h-40">
        <MediaCarousel items={media} interval={12000} kenburns />
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent"
          aria-hidden="true"
        />

        <span className="absolute left-3 top-3 rounded-full border border-gold-400/40 bg-stone-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold-200 backdrop-blur-md">
          {item.tags?.[0] ?? 'Signature'}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5">
          <div className="min-w-0">
            <h4 className="font-display text-lg font-bold leading-tight text-white">
              {item.name}
            </h4>
            <p className="mt-1 font-display text-base font-bold text-gold-300">
              {naira(item.price)}
            </p>
          </div>
          {cart && (
            <button
              ref={btnRef}
              type="button"
              onClick={add}
              aria-label={`Add ${item.name} to your order`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-stone-950/60 text-white backdrop-blur-md transition-colors hover:border-gold-400 hover:bg-gold-400 hover:text-stone-950 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
            >
              {qty > 0 ? (
                <span className="font-display text-sm font-bold">{qty}</span>
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export default function MenuHighlights({ menu }) {
  const picks = useMemo(() => {
    const all = (menu ?? []).flatMap((c) => c.items);
    const tagged = all.filter((i) =>
      (i.tags ?? []).some((t) => HERO_TAGS.includes(t))
    );
    return tagged.slice(0, 8);
  }, [menu]);

  if (picks.length < 3) return null;

  return (
    <section aria-labelledby="picks-heading" className="mb-10 min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="picks-heading" className="font-display text-xl font-bold sm:text-2xl">
          Tonight's <span className="italic text-gold-300">picks</span>
        </h3>
        <p className="text-xs text-stone-500">Swipe →</p>
      </div>

      {/* Negative margins let the rail run to the screen edges while the
          heading above stays aligned to the page gutter. */}
      <ul className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {picks.map((item, i) => (
          <HighlightCard key={item.id} item={item} index={i} />
        ))}
      </ul>
    </section>
  );
}
