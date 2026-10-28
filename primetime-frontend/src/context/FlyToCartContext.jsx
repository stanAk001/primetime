import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const FlyToCartContext = createContext(null);

/**
 * The small physical detail that makes adding to an order feel like putting
 * something in a basket rather than incrementing a number.
 *
 * When an item is added, a chip flies from the card that was tapped to the
 * order bar. It is purely decorative — the cart state has already updated by
 * the time the chip lands — so it never blocks the interaction and can be
 * dropped entirely under reduced motion.
 *
 * Positions come from the DOM at fire time rather than being tracked in
 * state: the grid reflows as sections filter, and a stale coordinate would
 * send the chip to the wrong place.
 */
export function FlyToCartProvider({ children }) {
  const [flights, setFlights] = useState([]);
  const targetRef = useRef(null);
  const nextId = useRef(0);

  const registerTarget = useCallback((node) => {
    targetRef.current = node;
  }, []);

  const fly = useCallback((originEl, label) => {
    const target = targetRef.current;
    if (!originEl || !target) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const from = originEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const id = nextId.current++;

    setFlights((f) => [
      ...f,
      {
        id,
        label,
        from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
        to: { x: to.left + to.width / 2, y: to.top + to.height / 2 },
      },
    ]);

    setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 800);
  }, []);

  return (
    <FlyToCartContext.Provider value={{ fly, registerTarget }}>
      {children}

      {/* Rendered at the root so the chip is never clipped by a card's
          overflow-hidden or trapped inside a transformed ancestor. */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <AnimatePresence>
          {flights.map((f) => (
            <motion.span
              key={f.id}
              initial={{ x: f.from.x, y: f.from.y, scale: 1, opacity: 1 }}
              animate={{
                x: f.to.x,
                y: f.to.y,
                scale: 0.35,
                opacity: 0.9,
                // Arc upward on the way across rather than sliding flat.
                transition: {
                  duration: 0.62,
                  ease: [0.34, 0.9, 0.4, 1],
                  y: { duration: 0.62, ease: [0.6, -0.28, 0.735, 0.045] },
                },
              }}
              exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.12 } }}
              style={{ position: 'absolute', left: 0, top: 0 }}
              className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 px-3 py-1.5 font-display text-xs font-bold whitespace-nowrap text-stone-950 shadow-lg"
            >
              {f.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </FlyToCartContext.Provider>
  );
}

export const useFlyToCart = () => useContext(FlyToCartContext);
