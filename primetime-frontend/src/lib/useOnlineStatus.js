import { useEffect, useState } from 'react';

/**
 * Whether the browser currently believes it has a connection.
 *
 * navigator.onLine is famously optimistic — it reports true for a captive
 * portal or a connection that resolves nothing — so it is treated as a hint
 * for the UI, never as permission to skip a request. The queue is what
 * actually guarantees delivery; this only decides what the guest is told.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}
