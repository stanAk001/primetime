import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Receipt, RotateCcw } from 'lucide-react';
import { useOrders, useUpdateOrder } from '../api/hooks';
import { getApiError } from '../api/client';
import { naira } from '../lib/format';
import { EASE } from './motionKit';
import Spinner from './Spinner';

const since = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
};

const STATUS_STYLES = {
  placed: 'border-gold-400/40 bg-gold-400/10',
  preparing: 'border-sky-400/40 bg-sky-400/10',
  served: 'border-stone-800 bg-stone-900/60',
  cancelled: 'border-stone-800 bg-stone-900/40 opacity-60',
};

// What the bar does next with this ticket.
const NEXT_ACTION = {
  placed: { status: 'preparing', label: 'Start' },
  preparing: { status: 'served', label: 'Served' },
};

function OrderTicket({ order, onUpdate, isPending }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);

  const next = NEXT_ACTION[order.status];
  const stale =
    order.status === 'placed' && Date.now() - new Date(order.created_at) > 8 * 60 * 1000;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`rounded-2xl border p-4 ${
        stale ? 'border-red-400/50 bg-red-500/10' : STATUS_STYLES[order.status]
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-stone-100">
              Table {order.table_label}
            </span>
            <span className="rounded-full border border-stone-700 bg-stone-950/60 px-2 py-0.5 font-mono text-[11px] tracking-wider text-stone-400">
              {order.reference}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {since(order.created_at)} · {order.status}
          </p>
        </div>
        <span className="font-display text-xl font-bold text-gold-300">
          {naira(order.total_amount)}
        </span>
      </div>

      <ul className="mt-3 space-y-1 border-t border-stone-800/70 pt-3">
        {(order.items ?? []).map((line) => (
          <li key={line.id} className="flex justify-between gap-3 text-sm">
            <span className="text-stone-300">
              <span className="font-bold text-gold-300">{line.quantity}×</span>{' '}
              {line.name}
            </span>
            <span className="shrink-0 text-stone-500">{naira(line.line_total)}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 text-xs italic text-stone-400">
          “{order.note}”
        </p>
      )}

      {(next || order.status !== 'served') && (
        <div className="mt-4 flex gap-2">
          {next && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onUpdate({ id: order.id, status: next.status })}
              className="cursor-pointer rounded-full bg-gold-400 px-4 py-1.5 text-xs font-bold text-stone-950 transition-colors hover:bg-gold-300 disabled:opacity-50"
            >
              {next.label}
            </button>
          )}
          {order.status !== 'cancelled' && order.status !== 'served' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onUpdate({ id: order.id, status: 'cancelled' })}
              className="cursor-pointer rounded-full border border-stone-700 px-4 py-1.5 text-xs font-semibold text-stone-400 transition-colors hover:border-stone-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </motion.li>
  );
}

export default function OrdersPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders();
  const update = useUpdateOrder();

  const orders = data?.orders ?? [];
  const open = orders.filter((o) => ['placed', 'preparing'].includes(o.status));
  const done = orders.filter((o) => !['placed', 'preparing'].includes(o.status)).slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
          <Receipt size={20} className="text-gold-400" aria-hidden="true" />
          Table orders
          {data?.openCount > 0 && (
            <motion.span
              key={data.openCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="rounded-full bg-gold-400 px-2.5 py-0.5 font-sans text-sm font-bold text-stone-950"
            >
              {data.openCount}
            </motion.span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-gold-300"
        >
          <RotateCcw size={13} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Sent from the tables. Updates every 15 seconds; tickets turn red after
        eight minutes unstarted.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading orders…" />
        </div>
      ) : isError ? (
        <div className="card mt-6 p-6 text-center">
          <p className="text-sm text-red-400/90">{getApiError(error)}</p>
        </div>
      ) : open.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="font-display text-lg text-stone-300">No open tickets</p>
          <p className="mt-1 text-sm text-stone-500">The bar is clear.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {open.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                onUpdate={update.mutate}
                isPending={update.isPending}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Closed tonight
          </h3>
          <ul className="mt-3 space-y-2">
            {done.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-800/70 px-4 py-2.5 text-sm text-stone-500"
              >
                <span>
                  Table {o.table_label} · {o.reference}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs">{o.status}</span>
                  <span className="text-stone-400">{naira(o.total_amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
