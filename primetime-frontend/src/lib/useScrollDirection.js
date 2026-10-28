import { useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';

/**
 * True while the page is being scrolled down past a threshold.
 *
 * Shared by the mobile dock and the facility action bar so the two bottom
 * surfaces move as one: if they reacted to scroll independently they would
 * drift apart mid-gesture and reveal a gap between them.
 *
 * Mirrors the behaviour the top navbar already uses, so the top and bottom
 * chrome retreat together while reading and return together.
 */
export function useScrollDirection({ threshold = 120 } = {}) {
  const [scrollingDown, setScrollingDown] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrollingDown(y > prev && y > threshold);
  });

  return scrollingDown;
}
