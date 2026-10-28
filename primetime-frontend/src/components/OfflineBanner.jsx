import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CloudOff, RefreshCw, Check } from 'lucide-react';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { useFlushOrderQueue } from '../api/hooks';
import { pendingCount, prunePending } from '../lib/offlineQueue';

/**
 * Tells a guest the truth about their connection, and — more importantly —
 * that their order is not lost.
 *
 * The failure this exists for is specific: the network drops for half a
 * minute mid-tap, the order fails, and nobody at the table knows whether the
 * bar got it. Silence there is worse than the outage. So an order held on the
 * phone says so plainly, and says it will go by itself.
 *
 * Flushing is driven by the browser's `online` event and by a check on mount,
 * not by a polling timer — there is nothing to poll for while offline.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  const flush = useFlushOrderQueue();
  const [queued, setQueued] = useState(0);
  const [justSent, setJustSent] = useState(0);

  const refresh = () => setQueued(pendingCount());

  useEffect(() => {
    prunePending();
    refresh();
    // Other tabs at the same table share this storage.
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Attempt delivery whenever the connection returns, and once on mount in
  // case the phone came back while the page was closed.
  useEffect(() => {
    if (!online) {
      refresh();
      return;
    }
    if (pendingCount() === 0) return;

    flush.mutateAsync().then((res) => {
      refresh();
      if (res?.sent > 0) {
        setJustSent(res.sent);
        setTimeout(() => setJustSent(0), 6000);
      }
    }).catch(refresh);
    // flush is stable enough for this purpose; re-running on every render
    // would re-post the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Keep the count honest while the guest keeps ordering offline.
  useEffect(() => {
    if (online) return undefined;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [online]);

  const show = !online || queued > 0 || justSent > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
        >
          <div
            className={`mx-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-xl ${
              justSent > 0
                ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                : online
                  ? 'border-gold-400/40 bg-gold-400/15 text-gold-100'
                  : 'border-stone-700 bg-stone-900/95 text-stone-200'
            }`}
          >
            {justSent > 0 ? (
              <>
                <Check size={14} aria-hidden="true" />
                {justSent === 1
                  ? 'Your order reached the bar'
                  : `${justSent} orders reached the bar`}
              </>
            ) : online ? (
              <>
                <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                Sending {queued === 1 ? 'your order' : `${queued} orders`}…
              </>
            ) : (
              <>
                <CloudOff size={14} aria-hidden="true" />
                {queued > 0
                  ? `No signal — ${queued === 1 ? 'your order is' : `${queued} orders are`} saved and will send automatically`
                  : 'No signal — you can still browse the menu'}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
