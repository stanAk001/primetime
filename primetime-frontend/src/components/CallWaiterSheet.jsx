import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, HandCoins, HelpCircle, Loader2, Sparkles, Utensils, X } from 'lucide-react';
import { useCallWaiter } from '../api/hooks';
import { getApiError } from '../api/client';
import { EASE } from './motionKit';

/**
 * Calling a waiter, on its own path — nothing to do with the order.
 *
 * Getting someone's attention is the single most common thing anyone does at
 * a table, and it must never depend on having chosen a drink first. It is
 * also the one request that is urgent, so it stays to one tap when the QR
 * already told us the table.
 *
 * The reasons aren't decoration: "bring the bill" and "ready to order" send a
 * waiter carrying the right thing, which is one trip instead of two. Staff
 * see the reason on the ticket in the admin panel.
 */
const REASONS = [
  { id: 'order', label: "We're ready to order", Icon: Utensils },
  { id: 'round', label: 'Another round', Icon: Sparkles },
  { id: 'bill', label: 'Bring the bill', Icon: HandCoins },
  { id: 'help', label: 'Something needs fixing', Icon: HelpCircle },
];

export default function CallWaiterSheet({
  facilitySlug = 'bar-lounge',
  table = '',
  onClose,
  onCalled,
}) {
  const [tableLabel, setTableLabel] = useState(table);
  const [sending, setSending] = useState(null);
  const call = useCallWaiter();

  useEffect(() => setTableLabel(table), [table]);

  const send = async (reason) => {
    const label = tableLabel.trim();
    if (!label) return;
    setSending(reason?.id ?? 'plain');
    try {
      const res = await call.mutateAsync({
        facilitySlug,
        tableLabel: label,
        note: reason?.label,
      });
      onCalled(res);
    } catch {
      setSending(null);
    }
  };

  const ready = Boolean(tableLabel.trim());

  return (
    <motion.div
      onClick={(e) => e.stopPropagation()}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.35, ease: EASE }}
      className="w-full max-w-lg rounded-t-3xl border border-stone-800 bg-stone-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="call-title" className="flex items-center gap-2 font-display text-xl font-bold">
            <BellRing size={19} className="text-gold-400" aria-hidden="true" />
            Call a waiter
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {table
              ? `Table ${table} — someone will be over shortly`
              : 'Tell us where you are and we’ll come to you'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Only asked for when the QR didn't carry it. */}
      {!table && (
        <>
          <label htmlFor="call-table" className="mt-5 block text-sm text-stone-400">
            Table number
          </label>
          <input
            id="call-table"
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
            autoFocus
            maxLength={40}
            placeholder="e.g. 12 or Terrace 3"
            className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
          />
        </>
      )}

      {/* The plain call, first and largest — most of the time nobody wants to
          explain themselves, they just want someone to come over. */}
      <button
        type="button"
        disabled={!ready || sending}
        onClick={() => send(null)}
        className="btn-gold mt-5 w-full disabled:opacity-60"
      >
        {sending === 'plain' ? (
          <Loader2 size={17} className="animate-spin" aria-hidden="true" />
        ) : (
          <BellRing size={17} aria-hidden="true" />
        )}
        {sending === 'plain' ? 'Calling…' : 'Just come over'}
      </button>

      <p className="mt-5 text-xs uppercase tracking-[0.15em] text-stone-500">
        Or say what you need
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {REASONS.map((reason) => {
          const { Icon } = reason;
          const busy = sending === reason.id;
          return (
            <button
              key={reason.id}
              type="button"
              disabled={!ready || sending}
              onClick={() => send(reason)}
              className="flex min-h-16 cursor-pointer flex-col items-start justify-center gap-1.5 rounded-2xl border border-stone-700 px-3.5 py-3 text-left text-sm font-medium text-stone-200 transition-colors hover:border-gold-400 hover:text-gold-200 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin text-gold-400" aria-hidden="true" />
              ) : (
                <Icon size={16} className="text-gold-400" aria-hidden="true" />
              )}
              <span className="leading-tight text-pretty">{reason.label}</span>
            </button>
          );
        })}
      </div>

      {call.isError && (
        <p className="mt-3 text-sm text-red-400/90">{getApiError(call.error)}</p>
      )}
    </motion.div>
  );
}
