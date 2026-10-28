/**
 * Orders that were placed while the network was down.
 *
 * Connectivity in Ibadan is not a binary — it drops for thirty seconds in the
 * middle of a tap and comes back. Losing a table's order to that is the worst
 * possible failure for this app, so an order is written to disk *before* the
 * network is attempted and only cleared once the server has confirmed it.
 *
 * Every queued order carries a clientRef minted here, on the phone. The
 * server treats a repeat of that reference as the same order and returns the
 * original, so flushing twice — or flushing something that actually did get
 * through before the connection dropped — can never produce a second round.
 *
 * localStorage rather than IndexedDB on purpose: a handful of small records,
 * synchronous reads, and no schema to migrate. IndexedDB would be more
 * machinery than the problem deserves.
 */
const KEY = 'primetime.pendingOrders.v1';

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // Corrupt or unavailable storage must not take the menu down with it.
    return [];
  }
};

const write = (queue) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* private mode / quota — the order still goes out over the network */
  }
};

const newRef = () =>
  globalThis.crypto?.randomUUID?.() ??
  `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const pendingOrders = () => read();
export const pendingCount = () => read().length;

/** Records an order before any network attempt. Returns its clientRef. */
export const enqueueOrder = (payload) => {
  const clientRef = payload.clientRef ?? newRef();
  const queue = read();
  queue.push({ ...payload, clientRef, queuedAt: Date.now(), attempts: 0 });
  write(queue);
  return clientRef;
};

export const dequeueOrder = (clientRef) => {
  write(read().filter((o) => o.clientRef !== clientRef));
};

const markAttempt = (clientRef) => {
  write(
    read().map((o) =>
      o.clientRef === clientRef ? { ...o, attempts: (o.attempts ?? 0) + 1 } : o
    )
  );
};

// Orders are for one sitting. A tab that never sent and is now hours old is
// almost certainly abandoned, and firing it at the bar tomorrow morning would
// be worse than dropping it.
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export const prunePending = () => {
  const now = Date.now();
  write(
    read().filter(
      (o) => now - o.queuedAt < MAX_AGE_MS && (o.attempts ?? 0) < MAX_ATTEMPTS
    )
  );
};

/**
 * Attempts every queued order in turn.
 *
 * `send` is injected rather than imported so this stays testable without a
 * network, and so the caller owns the axios instance and its auth.
 * Resolves with what happened, so the UI can say so.
 */
export const flushQueue = async (send) => {
  prunePending();
  const queue = read();
  if (queue.length === 0) return { sent: 0, failed: 0, orders: [] };

  let sent = 0;
  let failed = 0;
  const orders = [];

  for (const item of queue) {
    try {
      const res = await send(item);
      orders.push(res);
      dequeueOrder(item.clientRef);
      sent += 1;
    } catch (err) {
      // A rejection from the server (item sold out, bad payload) will never
      // succeed on retry, so drop it rather than looping forever. Only
      // genuine network failures stay queued.
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) {
        dequeueOrder(item.clientRef);
      } else {
        markAttempt(item.clientRef);
      }
      failed += 1;
    }
  }

  return { sent, failed, orders };
};
