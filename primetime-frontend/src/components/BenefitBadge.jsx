import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';

/**
 * The "Included with Membership" marker. Deliberately not a button — it has
 * no action behind it — so it reads as a status pill instead: gold on a
 * translucent gold wash, with a slow highlight that travels across it once
 * every few seconds to catch the eye the way a price would.
 *
 * The sweep is a transform on an overlay, so it composites on the GPU and
 * costs nothing per frame; it also disappears entirely under
 * prefers-reduced-motion, leaving the static pill.
 */
// 'xs' is for half-width cards on phones: the label may wrap to two lines
// there, so it drops to a rounded rectangle rather than a squashed pill.
const SIZES = {
  xs: 'rounded-lg px-2 py-1 text-[10px] leading-tight sm:rounded-full sm:px-3 sm:text-xs',
  sm: 'rounded-full px-3 py-1 text-xs',
  lg: 'rounded-full px-4 py-2 text-sm',
};

export default function BenefitBadge({ label, size = 'sm' }) {
  const reduce = useReducedMotion();
  const big = size === 'lg';

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 overflow-hidden border border-gold-400/40 bg-gold-400/15 font-semibold text-gold-200 ${SIZES[size]}`}
    >
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-gold-200/25 to-transparent"
          initial={{ x: '-150%' }}
          animate={{ x: '250%' }}
          transition={{
            duration: 1.6,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 4.5,
          }}
        />
      )}
      <Sparkles size={big ? 15 : 12} className="shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
