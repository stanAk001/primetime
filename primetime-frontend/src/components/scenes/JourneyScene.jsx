import { useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { facilityThumb } from '../../lib/images';
import Reveal from '../Reveal';

/**
 * JourneyScene — "a day at Primetime" as a living diorama. A line-art
 * figure walks across the band as you scroll, passing each facility in
 * the order of the brand story (gym at dawn → suite after last call)
 * while the sun sets, the stars come out and the moon rises.
 *
 * The walk cycle itself is pure CSS (see .walk-* in index.css); scroll
 * only drives the figure's position, the daylight cross-fade and which
 * stops are lit.
 */

// The day as the complex actually runs it: doors at 8am, last call at 10pm,
// and the hotel carrying on after everything else has closed.
const STOPS = [
  { pos: 9, time: '8 AM', label: 'Gym', slug: 'gym' },
  { pos: 37, time: '5 PM', label: 'Football', slug: 'football-ground' },
  { pos: 65, time: '8 PM', label: 'Lounge', slug: 'bar-lounge' },
  { pos: 92, time: '10 PM', label: 'Suite', slug: 'hotel' },
];

const STARS = [
  { top: '14%', left: '46%', d: 0 },
  { top: '9%', left: '54%', d: 1.3 },
  { top: '22%', left: '60%', d: 0.5 },
  { top: '12%', left: '67%', d: 2.1 },
  { top: '28%', left: '72%', d: 1.6 },
  { top: '8%', left: '78%', d: 0.9 },
  { top: '19%', left: '84%', d: 2.6 },
  { top: '30%', left: '90%', d: 0.2 },
  { top: '11%', left: '94%', d: 1.9 },
  { top: '24%', left: '50%', d: 2.9 },
];

function Walker() {
  return (
    <svg
      viewBox="0 0 80 132"
      className="walker walk-bob h-28 w-auto"
      style={{ filter: 'drop-shadow(0 0 10px rgba(242,193,78,0.3))' }}
    >
      <defs>
        <linearGradient id="walker-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#d9a441" />
        </linearGradient>
      </defs>
      <g stroke="url(#walker-gold)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* far side — half a stride out of phase, dimmed for depth */}
        <g opacity="0.45">
          <g className="walk-arm walk-alt">
            <line x1="42" y1="31" x2="42" y2="53" strokeWidth="6" />
            <g className="walk-forearm walk-alt">
              <line x1="42" y1="53" x2="42" y2="73" strokeWidth="5.5" />
            </g>
          </g>
          <g className="walk-thigh walk-alt">
            <line x1="38" y1="66" x2="38" y2="96" strokeWidth="7" />
            <g className="walk-shin walk-alt">
              <line x1="38" y1="96" x2="38" y2="124" strokeWidth="6" />
              <line x1="38" y1="125" x2="47" y2="125" strokeWidth="5" />
            </g>
          </g>
        </g>

        {/* torso + head */}
        <path d="M42.5 25 C42 38 40 52 38 66" strokeWidth="7.5" />
        <circle cx="41.5" cy="13" r="8.5" fill="url(#walker-gold)" stroke="none" />

        {/* near side */}
        <g className="walk-thigh">
          <line x1="38" y1="66" x2="38" y2="96" strokeWidth="7" />
          <g className="walk-shin">
            <line x1="38" y1="96" x2="38" y2="124" strokeWidth="6" />
            <line x1="38" y1="125" x2="47" y2="125" strokeWidth="5" />
          </g>
        </g>
        <g className="walk-arm">
          <line x1="42" y1="31" x2="42" y2="53" strokeWidth="6" />
          <g className="walk-forearm">
            <line x1="42" y1="53" x2="42" y2="73" strokeWidth="5.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default function JourneyScene() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [passed, setPassed] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Walker position: 1% → 92% of the band, smoothed with a spring so the
  // figure glides rather than scrubs.
  const pctRaw = useTransform(scrollYProgress, [0.12, 0.88], [1, 92], { clamp: true });
  const pct = useSpring(pctRaw, { stiffness: 55, damping: 17, mass: 0.6 });
  const x = useMotionTemplate`${pct}%`;
  const trail = useTransform(pct, (v) => (v + 1) / 100);

  // Day → night as the figure crosses.
  const sunY = useTransform(scrollYProgress, [0.12, 0.7], [0, 90]);
  const sunOpacity = useTransform(scrollYProgress, [0.12, 0.66], [0.95, 0]);
  const moonY = useTransform(scrollYProgress, [0.45, 0.85], [26, 0]);
  const moonOpacity = useTransform(scrollYProgress, [0.45, 0.8], [0, 1]);
  const nightOpacity = useTransform(scrollYProgress, [0.15, 0.8], [0, 1]);
  const starsOpacity = useTransform(scrollYProgress, [0.4, 0.85], [0.05, 1]);

  useMotionValueEvent(pct, 'change', (v) => {
    const n = STOPS.reduce((acc, s) => acc + (v + 1 >= s.pos ? 1 : 0), 0);
    setPassed((p) => (p === n ? p : n));
  });

  const litCount = reduce ? STOPS.length : passed;

  return (
    <section
      ref={ref}
      aria-label="A day at Primetime"
      className="grain relative h-[26rem] overflow-hidden border-b border-stone-800/80 bg-[#100e0c] sm:h-[30rem]"
    >
      <p className="sr-only">
        One membership carries you through the whole day: the gym at 8 AM,
        football at 5 PM, the lounge — live music, wine and the grill — at
        8 PM, and a suite at 10 PM.
      </p>

      {/* Sky: dawn base with a night wash that fades in on scroll */}
      <div
        className="absolute inset-0 bg-[linear-gradient(100deg,rgba(242,193,78,0.16),rgba(146,64,14,0.06)_35%,transparent_65%)]"
        aria-hidden="true"
      />
      <motion.div
        style={reduce ? { opacity: 0.65 } : { opacity: nightOpacity }}
        className="absolute inset-0 bg-[linear-gradient(80deg,transparent_5%,rgba(30,27,75,0.5)_55%,rgba(2,6,23,0.85))]"
        aria-hidden="true"
      />

      {/* Stars */}
      <motion.div
        style={reduce ? { opacity: 0.8 } : { opacity: starsOpacity }}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {STARS.map((s, i) => (
          <span
            key={i}
            className="scene-twinkle absolute h-[3px] w-[3px] rounded-full bg-stone-100"
            style={{ top: s.top, left: s.left, animationDelay: `${s.d}s` }}
          />
        ))}
      </motion.div>

      {/* Sun sets, moon rises */}
      <motion.div
        style={reduce ? { opacity: 0.5 } : { y: sunY, opacity: sunOpacity }}
        className="absolute bottom-[9.5rem] left-[7%] h-14 w-14 rounded-full bg-[radial-gradient(circle,#fcd34d,#d9a441_60%)] shadow-[0_0_60px_20px_rgba(242,193,78,0.25)]"
        aria-hidden="true"
      />
      <motion.div
        style={reduce ? { opacity: 0.9 } : { y: moonY, opacity: moonOpacity }}
        className="absolute right-[9%] top-12 h-11 w-11 rounded-full bg-[#e2e8f0]/90 shadow-[0_0_36px_10px_rgba(186,230,253,0.22)]"
        aria-hidden="true"
      >
        <span className="absolute left-3 top-3.5 h-1.5 w-1.5 rounded-full bg-slate-300/70" />
        <span className="absolute left-6 top-6.5 h-1 w-1 rounded-full bg-slate-300/60" />
      </motion.div>

      {/* Heading */}
      <Reveal className="absolute inset-x-0 top-10 px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          A day at Primetime
        </p>
        <p className="mt-2 font-display text-2xl italic text-stone-300 sm:text-3xl">
          Sunrise to last call — <span className="text-gold-300">one address.</span>
        </p>
      </Reveal>

      {/* Ground + gold trail lit behind the walker */}
      <div className="absolute inset-x-0 bottom-24 h-px bg-white/10" aria-hidden="true" />
      <motion.div
        style={reduce ? { scaleX: 0.5 } : { scaleX: trail }}
        className="absolute inset-x-0 bottom-24 h-px origin-left bg-gradient-to-r from-gold-500/70 to-gold-300/70"
        aria-hidden="true"
      />

      {/* Facility stops */}
      {STOPS.map((s, i) => {
        const active = i < litCount;
        return (
          <div
            key={s.label}
            className="absolute inset-y-0"
            style={{ left: `${s.pos}%` }}
            aria-hidden="true"
          >
            {/* Photo medallion: greyed out until the walker arrives,
                then it flares gold and comes to life in colour. */}
            <div
              className={`absolute bottom-24 left-0 h-11 w-11 -translate-x-1/2 translate-y-1/2 overflow-hidden rounded-full border-2 bg-stone-900 transition-all duration-500 sm:h-12 sm:w-12 ${
                active
                  ? 'border-gold-400 opacity-100 shadow-[0_0_20px_rgba(242,193,78,0.4)] grayscale-0'
                  : 'border-stone-700 opacity-60 grayscale'
              }`}
            >
              <img
                src={facilityThumb(s.slug)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute bottom-7 left-0 w-max -translate-x-1/2 text-center">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 ${
                  active ? 'text-gold-300' : 'text-stone-500'
                }`}
              >
                {s.time}
              </p>
              <p className="hidden text-xs font-medium text-stone-400 sm:block">{s.label}</p>
            </div>
          </div>
        );
      })}

      {/* The walker — position driven by scroll, stride driven by CSS */}
      <motion.div
        style={reduce ? { x: '46%' } : { x }}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute bottom-[5.5rem] left-0 -translate-x-1/2">
          <Walker />
          <span className="absolute -bottom-1.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/50 blur-[2px]" />
        </div>
      </motion.div>
    </section>
  );
}
