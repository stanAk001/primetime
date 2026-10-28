import { motion } from 'motion/react';
import { naira } from '../lib/format';

/**
 * The order confirmation, as an actual printed receipt.
 *
 * A generic "success" modal is forgettable; a slip of warm paper torn off a
 * till is the thing people photograph and show the waiter. It's the one
 * moment in the ordering flow worth designing properly, so it breaks the
 * dark palette deliberately — cream paper against the near-black room is the
 * whole effect, and it reads as an object rather than a dialog.
 *
 * The torn edges are a repeating conic-gradient mask rather than images, so
 * they stay crisp at any width and cost nothing to load.
 */
const TORN_EDGE =
  'repeating-conic-gradient(from 135deg at 50% 0, #f5f0e6 0deg 90deg, transparent 90deg 180deg) 0 0 / 14px 8px repeat-x';

export default function OrderReceipt({ order, onClose }) {
  const placedAt = new Date(order.created_at ?? Date.now());

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: 30, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-xs"
    >
      {/* Torn top edge */}
      <div className="h-2 w-full" style={{ background: TORN_EDGE }} aria-hidden="true" />

      <div className="bg-[#f5f0e6] px-5 pb-5 pt-4 text-stone-900 shadow-2xl">
        <div className="text-center">
          <p className="font-display text-lg font-bold tracking-[0.08em]">
            PRIME<span className="italic text-[#8a6a1f]">TIME</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Bar Lounge · Ibadan
          </p>
        </div>

        <div
          className="my-3 border-t border-dashed border-stone-400"
          aria-hidden="true"
        />

        <dl className="flex justify-between font-mono text-[11px] text-stone-600">
          <dt className="sr-only">Table</dt>
          <dd>TABLE {order.table_label}</dd>
          <dt className="sr-only">Time</dt>
          <dd>
            {placedAt.toLocaleTimeString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </dl>

        <div
          className="my-3 border-t border-dashed border-stone-400"
          aria-hidden="true"
        />

        {/* Itemisation, monospaced so quantities and amounts column up the
            way they do on a real till slip. */}
        <ul className="space-y-1.5 font-mono text-[11px]">
          {(order.items ?? []).map((line, i) => (
            <motion.li
              key={line.id ?? `${line.name}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.25 }}
              className="flex justify-between gap-3"
            >
              <span className="min-w-0 truncate">
                <span className="font-bold">{line.quantity}×</span> {line.name}
              </span>
              <span className="shrink-0 tabular-nums">
                {naira(line.line_total)}
              </span>
            </motion.li>
          ))}
        </ul>

        {order.note && (
          <p className="mt-3 border-l-2 border-stone-400 pl-2 font-mono text-[10px] italic text-stone-600">
            {order.note}
          </p>
        )}

        <div
          className="my-3 border-t border-dashed border-stone-400"
          aria-hidden="true"
        />

        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-stone-600">
            Total
          </span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {naira(order.total_amount)}
          </span>
        </div>

        <div
          className="my-3 border-t border-dashed border-stone-400"
          aria-hidden="true"
        />

        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Order reference
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em]">
            {order.reference}
          </p>
          {/* Barcode as pure CSS bars — decorative, and the reference above
              is the thing staff actually read out. */}
          <div
            className="mx-auto mt-2.5 h-7 w-40"
            aria-hidden="true"
            style={{
              background:
                'repeating-linear-gradient(90deg, #1c1917 0 2px, transparent 2px 4px, #1c1917 4px 5px, transparent 5px 9px, #1c1917 9px 12px, transparent 12px 14px)',
            }}
          />
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-stone-500">
            SENT TO THE BAR · NOT YET PAID
            <br />
            Settle at your table when you're done
          </p>
        </div>
      </div>

      {/* Torn bottom edge, mirrored */}
      <div
        className="h-2 w-full rotate-180"
        style={{ background: TORN_EDGE }}
        aria-hidden="true"
      />

      <button type="button" onClick={onClose} className="btn-gold mt-5 w-full">
        Back to the menu
      </button>
    </motion.div>
  );
}
