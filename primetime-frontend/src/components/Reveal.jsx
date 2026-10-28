import { motion } from 'motion/react';
import { EASE } from './motionKit';

// Scroll-triggered reveal.
//  variant="up"   — fade + lift (default)
//  variant="mask" — cinematic clip-path wipe, for imagery
export default function Reveal({
  children,
  delay = 0,
  y = 32,
  variant = 'up',
  className,
}) {
  if (variant === 'mask') {
    return (
      <motion.div
        className={className}
        initial={{ clipPath: 'inset(14% 8% 14% 8% round 24px)', scale: 1.06, opacity: 0.4 }}
        whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 24px)', scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
