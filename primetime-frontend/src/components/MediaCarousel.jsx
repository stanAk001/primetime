import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';

/**
 * MediaCarousel — video-first background carousel for cinematic surfaces.
 *
 * items: [{ type: 'video' | 'image', src, poster?, name? }]
 *
 * - Crossfades between slides; auto-advances only while on screen.
 *   Pass `activeIndex` to drive the slide from outside (hero reel);
 *   omit it for self-running card carousels.
 * - Videos are muted loops that pause off-screen. Under reduced motion
 *   or data-saver they are swapped for their poster stills, and
 *   reduced motion also stops the cycling entirely.
 * - Any media that fails to load is dropped from rotation; when
 *   everything fails, `fallback` is rendered instead (e.g. the
 *   animated FacilityScene).
 */
export default function MediaCarousel({
  items,
  activeIndex = null,
  interval = 7000,
  kenburns = false,
  indicators = false, // 'mini' → non-interactive progress dashes
  fallback = null,
  className = 'absolute inset-0',
}) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.1 });
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(() => new Set());

  const saveData =
    typeof navigator !== 'undefined' && navigator.connection?.saveData === true;
  const allowVideo = !reduce && !saveData;

  const usable = useMemo(() => {
    const seen = new Set();
    return items
      .map((item) =>
        item.type === 'video' && !allowVideo && item.poster
          ? { type: 'image', src: item.poster, name: item.name }
          : item
      )
      .filter((item) => {
        if (failed.has(item.src) || seen.has(item.src)) return false;
        if (item.type === 'video' && !allowVideo) return false;
        seen.add(item.src);
        return true;
      });
  }, [items, failed, allowVideo]);

  const controlled = activeIndex !== null;
  const count = usable.length;
  const raw = controlled ? activeIndex : index;
  const safe = count ? ((raw % count) + count) % count : 0;
  const current = usable[safe];

  // Auto-advance (uncontrolled only), gated to viewport visibility.
  useEffect(() => {
    if (controlled || reduce || !inView || count < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearTimeout(t);
  }, [controlled, reduce, inView, count, interval, index]);

  // Keep the active video in step with visibility.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) {
      el.muted = true;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView, safe]);

  const markFailed = (src) => {
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });
    // Self-heal: a slow DNS lookup or flaky connection shouldn't drop a
    // slide for the whole session — put it back in rotation after a
    // while and let it try again.
    setTimeout(() => {
      setFailed((prev) => {
        if (!prev.has(src)) return prev;
        const next = new Set(prev);
        next.delete(src);
        return next;
      });
    }, 45000);
  };

  if (!count) return fallback;

  // Reduced motion: one still frame, no cycling.
  if (reduce) {
    const src = current.type === 'image' ? current.src : current.poster;
    return (
      <div ref={ref} aria-hidden="true" className={`${className} overflow-hidden`}>
        {src && (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            onError={() => markFailed(current.src)}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} aria-hidden="true" className={`${className} overflow-hidden`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={current.src}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        >
          {current.type === 'video' ? (
            <video
              // Guarded so the exiting slide's unmount can't null the
              // ref after the incoming video has claimed it.
              ref={(el) => {
                if (el) videoRef.current = el;
              }}
              src={current.src}
              poster={current.poster}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              onError={() => markFailed(current.src)}
            />
          ) : (
            <img
              src={current.src}
              alt=""
              loading="lazy"
              className={`h-full w-full object-cover ${kenburns ? 'scene-kenburns' : ''}`}
              onError={() => markFailed(current.src)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {indicators === 'mini' && count > 1 && (
        <div className="absolute right-4 top-4 z-10 flex gap-1.5">
          {usable.map((item, i) => (
            <span
              key={item.src}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === safe ? 'w-5 bg-gold-400' : 'w-2.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
