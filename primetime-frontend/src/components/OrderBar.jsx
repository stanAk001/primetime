import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, Minus, Plus, Receipt, X } from 'lucide-react';
import OrderReceipt from './OrderReceipt';
import CallWaiterSheet from './CallWaiterSheet';
import { usePlaceOrder } from '../api/hooks';
import { getApiError } from '../api/client';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';
import { naira } from '../lib/format';
import { EASE } from './motionKit';

/**
 * The ordering surface for a table: a summary bar that rises once anything is
 * in the order, a review sheet, and the waiter call.
 *
 * Nothing is charged here. The tab is settled at the table, which is how a
 * lounge actually works — so this flow ends at "sent to the bar", not at a
 * payment page.
 */
export default function OrderBar({ facilitySlug = 'bar-lounge', table = '' }) {
  const cart = useCart();
  const flyer = useFlyToCart();
  const [open, setOpen] = useState(false);
  const [tableLabel, setTableLabel] = useState(table);
  const [note, setNote] = useState('');
  const [placed, setPlaced] = useState(null);
  const [called, setCalled] = useState(null);
  const [calling, setCalling] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const placeOrder = usePlaceOrder();

  useEffect(() => setTableLabel(table), [table]);

  useEffect(() => {
    if (!called) return undefined;
    const t = setTimeout(() => setCalled(null), 6000);
    return () => clearTimeout(t);
  }, [called]);

  const submit = async (e) => {
    e?.preventDefault();
    const label = tableLabel.trim();
    if (!label || cart.lines.length === 0) return;
    try {
      const res = await placeOrder.mutateAsync({
        facilitySlug,
        tableLabel: label,
        note,
        items: cart.lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
      });
      setPlaced(res.order);
      setOpen(false);
      setNote('');
      cart.clear();
    } catch (err) {
      // No network: the order is already saved on the phone and the banner
      // will deliver it. Clearing the cart is correct — the order is real,
      // it just hasn't been handed over yet.
      if (err?.queued) {
        setQueuedOffline(true);
        setOpen(false);
        setNote('');
        cart.clear();
        setTimeout(() => setQueuedOffline(false), 7000);
      }
      /* otherwise surfaced in the sheet */
    }
  };

  // Calling a waiter is its own flow. It used to fall through to the order
  // sheet when the table was unknown, which meant a walk-in who only wanted
  // the bartender's attention hit a "Send order" button that stays disabled
  // until something is in the cart — a dead end for the most common request
  // in the room.
  const call = () => setCalling(true);

  const onCalled = (res) => {
    setCalling(false);
    setCalled(res);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AnimatePresence>
          {queuedOffline && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role="status"
              className="pointer-events-auto rounded-full border border-gold-400/40 bg-gold-400/15 px-4 py-2 text-xs font-semibold text-gold-100 backdrop-blur-md"
            >
              Saved — your order sends the moment signal returns
            </motion.p>
          )}
          {called && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role="status"
              className="pointer-events-auto rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-100 backdrop-blur-md"
            >
              {called.duplicate
                ? 'Someone is already on the way'
                : called.call?.note
                  ? `On the way — ${called.call.note.toLowerCase()}`
                  : 'A waiter is on the way'}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto flex w-full max-w-lg items-center gap-2">
          {/* Always visible and always labelled. An unlabelled bell icon left
              people unsure the lounge could be called at all — and calling a
              waiter is half the point of the code on the table, so it keeps
              its words even when the order bar is competing for the space. */}
          <button
            type="button"
            onClick={call}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-gold-400/50 bg-stone-900/90 py-4 text-sm font-bold text-gold-200 shadow-lg backdrop-blur-md transition-colors hover:border-gold-400 hover:bg-stone-900 ${
              cart.count > 0 ? 'px-4' : 'flex-1 justify-center px-5'
            }`}
          >
            <motion.span
              animate={{ rotate: [0, -12, 10, -6, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
              style={{ transformOrigin: '50% 15%' }}
              aria-hidden="true"
            >
              <BellRing size={18} />
            </motion.span>
            {/* Collapses to just "Waiter" once the order button needs room. */}
            <span className={cart.count > 0 ? 'hidden sm:inline' : ''}>
              {cart.count > 0 ? 'Waiter' : 'Call a waiter'}
            </span>
          </button>

          <AnimatePresence mode="wait">
            {cart.count > 0 ? (
              <motion.button
                key="review"
                type="button"
                onClick={() => setOpen(true)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: EASE }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-1 items-center justify-between gap-3 rounded-full bg-gold-400 px-5 py-4 text-stone-950 shadow-lg shadow-gold-400/20 transition-colors hover:bg-gold-300"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  {/* The chip thrown by the menu card lands here. */}
                  <motion.span
                    ref={flyer?.registerTarget}
                    key={cart.count}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ duration: 0.45, times: [0, 0.4, 1], ease: 'easeOut' }}
                    className="flex h-6 min-w-6 items-center justify-center rounded-full bg-stone-950/85 px-1.5 text-xs text-gold-300"
                  >
                    {cart.count}
                  </motion.span>
                  Review order
                </span>
                {/* The running tab rolls rather than snapping, so the total
                    reads as a tab being kept, not a field being rewritten. */}
                <motion.span
                  key={`total-${cart.total}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="font-display text-lg font-bold"
                >
                  {naira(cart.total)}
                </motion.span>
              </motion.button>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden flex-1 rounded-full border border-stone-800 bg-stone-900/80 px-5 py-3.5 text-center text-xs text-stone-500 backdrop-blur-md sm:block"
              >
                Tap <Plus size={11} className="inline" aria-hidden="true" /> on
                anything to start an order
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Call a waiter — independent of the order entirely */}
      <AnimatePresence>
        {calling && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCalling(false)}
          >
            <CallWaiterSheet
              facilitySlug={facilitySlug}
              table={tableLabel}
              onClose={() => setCalling(false)}
              onCalled={onCalled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order confirmation */}
      <AnimatePresence>
        {placed && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlaced(null)}
            role="dialog"
            aria-modal="true"
          >
            <OrderReceipt order={placed} onClose={() => setPlaced(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-title"
          >
            <motion.form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: EASE }}
              className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-stone-800 bg-stone-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="order-title" className="flex items-center gap-2 font-display text-xl font-bold">
                  <Receipt size={19} className="text-gold-400" aria-hidden="true" />
                  Your order
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="cursor-pointer rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {cart.lines.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-500">
                  Nothing in your order yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-stone-800">
                  {cart.lines.map((line) => (
                    <li key={line.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-100">
                          {line.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {naira(line.price)}
                          {line.serving ? ` · ${line.serving}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-stone-700 p-1">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(line.id, line.quantity - 1)}
                          aria-label={`Remove one ${line.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-stone-800"
                        >
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold text-stone-100">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(line.id, line.quantity + 1)}
                          aria-label={`Add one ${line.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-stone-800"
                        >
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <span className="w-20 shrink-0 text-right font-display text-base font-bold text-gold-300">
                        {naira(line.price * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-4">
                <span className="text-sm text-stone-400">Total</span>
                <motion.span
                  key={cart.total}
                  initial={{ opacity: 0.4, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-2xl font-bold text-gold-300"
                >
                  {naira(cart.total)}
                </motion.span>
              </div>

              <label htmlFor="order-table" className="mt-5 block text-sm text-stone-400">
                Table number
              </label>
              <input
                id="order-table"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                required
                maxLength={40}
                placeholder="e.g. 12 or Terrace 3"
                className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
              />

              <label htmlFor="order-note" className="mt-4 block text-sm text-stone-400">
                Anything for the kitchen? <span className="text-stone-600">(optional)</span>
              </label>
              <input
                id="order-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                placeholder="e.g. extra yaji, no onions"
                className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 outline-none transition-colors focus:border-gold-400"
              />

              {placeOrder.isError && (
                <p className="mt-3 text-sm text-red-400/90">
                  {getApiError(placeOrder.error)}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  placeOrder.isPending || !tableLabel.trim() || cart.lines.length === 0
                }
                className="btn-gold mt-6 w-full disabled:opacity-60"
              >
                {placeOrder.isPending ? 'Sending…' : 'Send order to the bar'}
              </button>
              <p className="mt-3 text-center text-xs text-stone-500">
                No payment now — settle the bill at your table.
              </p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
