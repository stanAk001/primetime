import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Home, LayoutGrid, UserRound, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useScrollDirection } from '../lib/useScrollDirection';

/**
 * The phone navigation.
 *
 * A hamburger is a desktop pattern borrowed onto mobile — it hides every
 * destination behind a tap and puts them at the top of a one-handed screen.
 * This is a dock instead: the four places anyone actually goes, always
 * visible, in the half of the screen a thumb reaches.
 *
 * The active pill slides between items with a shared layout animation rather
 * than cutting, so moving around the app reads as one surface changing state
 * instead of separate pages loading.
 */
const ITEMS = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/facilities', label: 'Explore', Icon: LayoutGrid },
  { to: '/menu', label: 'Menu', Icon: UtensilsCrossed },
];

export default function MobileDock() {
  const { user } = useAuth();
  const location = useLocation();
  const scrollingDown = useScrollDirection();

  const items = [
    ...ITEMS,
    user
      ? { to: '/dashboard', label: 'Bookings', Icon: CalendarDays }
      : { to: '/login', label: 'Sign in', Icon: UserRound },
  ];

  return (
    <>
      {/* Content has to *end* before it reaches the dock, not slide behind
          it. Without this, a gold hero button passing under a gold dock pill
          read as two controls colliding. The page now dissolves into the
          background just above the bar. */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: scrollingDown ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-stone-950 via-stone-950/85 to-transparent md:hidden"
      />

      <motion.nav
        aria-label="Primary"
        // Retreats while reading down the page, returns the moment you scroll
        // back — the same behaviour as the top bar, so both edges of the
        // screen behave consistently.
        animate={{ y: scrollingDown ? 120 : 0, opacity: scrollingDown ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch gap-1 rounded-full border border-white/10 bg-stone-950/95 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {items.map(({ to, label, Icon, end }) => {
          const active = end
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
            >
              {/* One pill, moved between items by the layout engine — the
                  detail that makes the dock feel like an object rather than
                  four separate buttons. */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="dock-pill"
                    className="absolute inset-0 rounded-full bg-gold-400"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </AnimatePresence>

              <span
                className={`relative z-10 transition-colors duration-200 ${
                  active ? 'text-stone-950' : 'text-stone-400'
                }`}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <span
                className={`relative z-10 text-[10px] font-semibold transition-colors duration-200 ${
                  active ? 'text-stone-950' : 'text-stone-500'
                }`}
              >
                {label}
              </span>
              </NavLink>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
