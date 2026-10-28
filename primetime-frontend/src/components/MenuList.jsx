import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { naira } from '../lib/format';
import { menuCategoryMedia, menuItemMedia } from '../lib/venueMedia';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { EASE } from './motionKit';
import MediaCarousel from './MediaCarousel';
import MenuHighlights from './MenuHighlights';

const TAG_STYLES = {
  "Chef's pick": 'border-gold-400/40 bg-gold-400/15 text-gold-200',
  'House speciality': 'border-gold-400/40 bg-gold-400/15 text-gold-200',
  Signature: 'border-gold-400/40 bg-gold-400/15 text-gold-200',
  Hot: 'border-red-400/40 bg-red-400/10 text-red-200',
  'Local favourite': 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  'Bottle service': 'border-violet-400/40 bg-violet-400/10 text-violet-200',
};
const tagClass = (tag) =>
  TAG_STYLES[tag] ?? 'border-stone-700 bg-stone-900/70 text-stone-400';

/**
 * One item, as a card with its own footage running behind it.
 *
 * The type sits on a scrim that's near-solid at the bottom and clear at the
 * top, so the clip reads as atmosphere while the name and price stay at full
 * contrast — the thing that usually goes wrong when text is put over video.
 * In the order, the card takes a gold edge so a full round is legible at a
 * glance across the table.
 */
function MenuCard({ item, index, cart }) {
  const media = useMemo(
    () => menuItemMedia(item.media_key, index),
    [item.media_key, index]
  );
  const qty = cart?.quantityOf(item.id) ?? 0;
  const sold = !item.is_available;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.05, 0.35) }}
      className={`group/card relative overflow-hidden rounded-2xl border transition-colors ${
        qty > 0
          ? 'border-gold-400/70 shadow-lg shadow-gold-400/10'
          : 'border-stone-800/80 hover:border-stone-700'
      } ${sold ? 'opacity-60' : ''}`}
    >
      <div className="relative h-32 sm:h-40 lg:h-44">
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover/card:scale-105 motion-reduce:group-hover/card:scale-100">
          <MediaCarousel items={media} interval={11000} kenburns />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-stone-950/20"
          aria-hidden="true"
        />

        {(item.tags ?? []).length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${tagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quantity flag, so a card already in the order is obvious without
            reading the stepper. */}
        <AnimatePresence>
          {qty > 0 && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 18 }}
              className="absolute right-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-full bg-gold-400 px-2 font-display text-sm font-bold text-stone-950"
            >
              {qty}
            </motion.span>
          )}
        </AnimatePresence>

        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4">
          <div className="flex items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h4 className="font-display text-sm font-bold leading-tight text-white sm:text-lg">
                {item.name}
              </h4>
              {/* Description is the first thing to go at half-width — the
                  name, price and the add button are what you act on. */}
              {item.description && (
                <p className="mt-1 line-clamp-2 hidden text-xs leading-relaxed text-stone-300/85 sm:block">
                  {item.description}
                </p>
              )}
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 sm:mt-2">
                <span className="font-display text-base font-bold text-gold-300 sm:text-xl">
                  {naira(item.price)}
                </span>
                {item.serving && (
                  <span className="hidden text-[11px] uppercase tracking-wider text-stone-400 sm:inline">
                    {item.serving}
                  </span>
                )}
              </p>
            </div>
            {cart && <QuantityStepper item={item} cart={cart} qty={qty} />}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * Add / stepper control.
 *
 * Collapsed to a single "Add" affordance until the item is in the order, then
 * it expands into − n + so a table can build a round without a modal in the
 * way. 44px targets throughout — this is used one-handed, standing, in a
 * dark room.
 */
function QuantityStepper({ item, cart, qty }) {
  const flyer = useFlyToCart();
  const btnRef = useRef(null);

  // Add, then throw a chip at the order bar from wherever the button is.
  const add = () => {
    cart.add(item);
    flyer?.fly(btnRef.current, item.name);
  };

  if (!item.is_available) {
    return (
      <span className="shrink-0 text-xs italic text-stone-400">Finished</span>
    );
  }

  return (
    <div className="shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add"
            ref={btnRef}
            type="button"
            onClick={add}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Add ${item.name} to your order`}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-stone-950/60 text-white backdrop-blur-md transition-colors hover:border-gold-400 hover:bg-gold-400 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:h-11 sm:w-11"
          >
            <Plus size={18} aria-hidden="true" />
          </motion.button>
        ) : (
          <motion.div
            key="stepper"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-0.5 rounded-full border border-gold-400/60 bg-stone-950/80 p-1 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => cart.setQuantity(item.id, qty - 1)}
              aria-label={`Remove one ${item.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gold-200 transition-colors hover:bg-gold-400/20 sm:h-9 sm:w-9"
            >
              <Minus size={15} aria-hidden="true" />
            </button>
            <motion.span
              key={qty}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="min-w-5 text-center font-display text-base font-bold text-gold-200"
              aria-live="polite"
            >
              {qty}
            </motion.span>
            <button
              ref={btnRef}
              type="button"
              onClick={add}
              aria-label={`Add another ${item.name}`}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gold-200 transition-colors hover:bg-gold-400/20 sm:h-9 sm:w-9"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategorySection({ category, cart }) {
  const media = useMemo(
    () => menuCategoryMedia(category.media_key),
    [category.media_key]
  );

  return (
    <section id={`menu-${category.slug}`} className="scroll-mt-24">
      <div className="overflow-hidden rounded-3xl border border-stone-800/80 bg-stone-900">
        {/* Living header: the clip plays behind the section title, so each
            part of the list is introduced by the thing it sells. */}
        <div className="relative h-28 overflow-hidden sm:h-36">
          {media.length > 0 && (
            <MediaCarousel items={media} interval={8000} kenburns className="absolute inset-0" />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/20"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {category.name}
            </h3>
            {category.tagline && (
              <p className="mt-1 text-sm italic text-gold-300/90">{category.tagline}</p>
            )}
          </div>
        </div>

        {/* Two per row on a phone — a drinks list one card at a time is a
            lot of scrolling for 36 items. */}
        <ul className="grid grid-cols-2 gap-2.5 p-2.5 sm:gap-4 sm:p-4 lg:grid-cols-3">
          {category.items.map((item, i) => (
            <MenuCard key={item.id} item={item} index={i} cart={cart} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function MenuList({ menu }) {
  const [active, setActive] = useState('');
  // Null on the marketing page (no CartProvider above it), which renders the
  // list read-only; present on the table menu, which can take an order.
  const cart = useCart();

  const shown = useMemo(
    () => (active ? menu.filter((c) => c.slug === active) : menu),
    [menu, active]
  );

  if (!menu?.length) return null;

  return (
    <div className="min-w-0">
      {/* Only when nothing is filtered — once you've picked a section, the
          picks rail is noise between you and what you asked for. */}
      {!active && <MenuHighlights menu={menu} />}
      {/* Section pills double as jump links on a long list — the same filter
          pattern the facilities page already uses. */}
      <div
        className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-stone-800/70 bg-stone-950/85 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-full sm:border sm:px-3"
        role="group"
        aria-label="Menu sections"
      >
        <button
          type="button"
          onClick={() => setActive('')}
          aria-pressed={active === ''}
          className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
            active === ''
              ? 'border-gold-400 bg-gold-400/15 text-gold-300'
              : 'border-stone-700 text-stone-300 hover:border-stone-500'
          }`}
        >
          Everything
        </button>
        {menu.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setActive(c.slug === active ? '' : c.slug)}
            aria-pressed={active === c.slug}
            className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
              active === c.slug
                ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                : 'border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            {c.name}
            <span className="ml-1.5 text-xs text-stone-500">{c.items.length}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        <AnimatePresence mode="popLayout">
          {shown.map((category) => (
            <motion.div
              key={category.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <CategorySection category={category} cart={cart} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
