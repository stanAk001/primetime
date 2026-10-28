import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE } from './motionKit';

const LETTERS = 'PRIMETIME'.split('');

/**
 * Branded intro — the wordmark rises letter by letter, a gold hairline
 * draws across, then the curtain lifts. Plays once per browser session
 * and never for reduced-motion users.
 */
export default function Preloader() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(
    () => !reduce && !sessionStorage.getItem('pt-intro-seen')
  );

  useEffect(() => {
    if (!show) return undefined;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      sessionStorage.setItem('pt-intro-seen', '1');
      setShow(false);
    }, 2300);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-950"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: EASE }}
          aria-hidden="true"
        >
          <motion.svg
            width="44"
            height="44"
            viewBox="0 0 32 32"
            className="mb-4 text-gold-400"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          >
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M16 2 A14 14 0 0 1 16 30 Z" fill="currentColor" />
            <circle cx="16" cy="16" r="2" className="fill-stone-950" />
          </motion.svg>
          <div className="flex overflow-hidden">
            {LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                className={`font-display text-4xl font-bold tracking-[0.18em] sm:text-6xl ${
                  i >= 5 ? 'italic text-gold-400' : 'text-white'
                }`}
                initial={{ y: '115%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.055, ease: EASE }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.div
            className="mt-5 h-px w-40 origin-left bg-gold-400/70 sm:w-56"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.95, ease: EASE }}
          />
          <motion.p
            className="mt-4 text-[11px] uppercase tracking-[0.35em] text-stone-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.05 }}
          >
            Ibadan, Nigeria
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
