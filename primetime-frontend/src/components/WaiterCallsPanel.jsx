import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { BellRing, Check, Clock3, QrCode, RotateCcw } from 'lucide-react';
import { useUpdateWaiterCall, useWaiterCalls } from '../api/hooks';
import { getApiError } from '../api/client';
import { EASE } from './motionKit';
import Spinner from './Spinner';

// "2 min ago" — floor staff care about how long a table has been waiting,
// not what o'clock the call landed.
const waitingFor = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
};

function CallCard({ call, onUpdate, isPending }) {
  // Re-render on a timer so the "waiting for" figure stays honest between
  // the 15-second poll intervals.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);

  const isWaiting = call.status === 'pending';
  const stale = isWaiting && Date.now() - new Date(call.created_at) > 5 * 60 * 1000;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${
        stale
          ? 'border-red-400/50 bg-red-500/10'
          : isWaiting
            ? 'border-gold-400/40 bg-gold-400/10'
            : 'border-stone-800 bg-stone-900/60'
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
          isWaiting ? 'bg-gold-400 text-stone-950' : 'bg-stone-800 text-stone-400'
        }`}
        aria-hidden="true"
      >
        {call.table_label.replace(/[^0-9a-z]/gi, '').slice(0, 3) || '#'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-100">
          Table {call.table_label}
          {stale && (
            <span className="ml-2 rounded-full border border-red-400/50 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
              Waiting
            </span>
          )}
        </p>
        {call.note && (
          <p className="mt-0.5 truncate text-sm text-stone-400">“{call.note}”</p>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
          <Clock3 size={12} aria-hidden="true" />
          {waitingFor(call.created_at)}
          <span className="text-stone-700">·</span>
          {call.facility_name}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {call.status === 'pending' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onUpdate({ id: call.id, status: 'acknowledged' })}
            className="cursor-pointer rounded-full border border-stone-600 px-3.5 py-1.5 text-xs font-semibold text-stone-200 transition-colors hover:border-stone-400 disabled:opacity-50"
          >
            On my way
          </button>
        )}
        {call.status !== 'resolved' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onUpdate({ id: call.id, status: 'resolved' })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gold-400 px-3.5 py-1.5 text-xs font-bold text-stone-950 transition-colors hover:bg-gold-300 disabled:opacity-50"
          >
            <Check size={13} aria-hidden="true" /> Done
          </button>
        )}
      </div>
    </motion.li>
  );
}

// Staff print one of these per table. The table number is baked into the URL,
// so a guest who scans it can call a waiter without typing anything.
function TableQrMaker() {
  const [table, setTable] = useState('1');
  const [dataUrl, setDataUrl] = useState('');
  const url = `${window.location.origin}/menu?table=${encodeURIComponent(table.trim() || '1')}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 260,
      color: { dark: '#1c1917', light: '#f2c14e' },
    }).then((d) => !cancelled && setDataUrl(d));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <QrCode size={18} className="text-gold-400" aria-hidden="true" /> Table QR codes
      </h3>
      <p className="mt-1 text-sm text-stone-500">
        Print one per table. Scanning opens the menu with that table already
        selected.
      </p>

      <label htmlFor="qr-table" className="mt-4 block text-sm text-stone-400">
        Table number
      </label>
      <input
        id="qr-table"
        value={table}
        onChange={(e) => setTable(e.target.value)}
        maxLength={40}
        className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
      />

      {dataUrl && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <img
            src={dataUrl}
            alt={`QR code linking to the menu for table ${table}`}
            className="rounded-xl"
            width={200}
            height={200}
          />
          <p className="break-all text-center text-[11px] text-stone-600">{url}</p>
          <a
            href={dataUrl}
            download={`primetime-table-${table.trim() || '1'}.png`}
            className="btn-outline w-full justify-center"
          >
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
}

export default function WaiterCallsPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useWaiterCalls();
  const update = useUpdateWaiterCall();

  const calls = data?.calls ?? [];
  const open = calls.filter((c) => c.status !== 'resolved');
  const recent = calls.filter((c) => c.status === 'resolved').slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* min-w-0: a 1fr grid column will not shrink below its content, so
          anything scrollable inside it widens the page instead. */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold">
            <BellRing size={20} className="text-gold-400" aria-hidden="true" />
            Service calls
            {data?.pendingCount > 0 && (
              <motion.span
                key={data.pendingCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="rounded-full bg-gold-400 px-2.5 py-0.5 font-sans text-sm font-bold text-stone-950"
              >
                {data.pendingCount}
              </motion.span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-gold-300"
          >
            <RotateCcw
              size={13}
              className={isFetching ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Updates every 15 seconds. Tables turn red after five minutes waiting.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Loading calls…" />
          </div>
        ) : isError ? (
          <div className="card mt-6 p-6 text-center">
            <p className="text-sm text-red-400/90">{getApiError(error)}</p>
          </div>
        ) : open.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <p className="font-display text-lg text-stone-300">Nothing waiting</p>
            <p className="mt-1 text-sm text-stone-500">
              Every table has been served.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {open.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  onUpdate={update.mutate}
                  isPending={update.isPending}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {recent.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Recently cleared
            </h3>
            <ul className="mt-3 space-y-2">
              {recent.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-800/70 px-4 py-2.5 text-sm text-stone-500"
                >
                  <span>Table {c.table_label}</span>
                  <span className="text-xs">{waitingFor(c.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <TableQrMaker />
    </div>
  );
}
