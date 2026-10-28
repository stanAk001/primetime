import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useSpring,
} from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1];

/**
 * MaskText — editorial line-mask reveal. Each line rises out of an
 * overflow-hidden wrapper, staggered.
 *   <MaskText lines={[<>Where Ibadan</>, <>comes <i>alive.</i></>]} />
 */
export function MaskText({ lines, delay = 0, mode = 'mount', className = '' }) {
  return (
    <span className={`block ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block will-change-transform"
            initial={{ y: '112%' }}
            {...(mode === 'mount'
              ? { animate: { y: 0 } }
              : { whileInView: { y: 0 }, viewport: { once: true, amount: 0.6 } })}
            transition={{ duration: 0.95, delay: delay + i * 0.14, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Counter — counts up from 0 when scrolled into view.
 *   <Counter to={3000} prefix="₦" />
 */
export function Counter({ to, prefix = '', suffix = '', duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setValue(to);
      return undefined;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString('en-NG')}
      {suffix}
    </span>
  );
}

/**
 * Magnetic — the wrapped element gently follows the cursor (desktop,
 * fine-pointer devices only) and springs back on leave.
 */
export function Magnetic({ children, strength = 0.25, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 180, damping: 16, mass: 0.4 });
  const y = useSpring(0, { stiffness: 180, damping: 16, mass: 0.4 });

  const enabled =
    !reduce &&
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches;

  const onPointerMove = (e) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      style={enabled ? { x, y } : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}
