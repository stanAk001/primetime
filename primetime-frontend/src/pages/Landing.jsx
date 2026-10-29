import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useFacilities } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { CTA_IMAGES, HERO_REEL, STORY_IMAGES } from '../lib/images';
import FacilityCard from '../components/FacilityCard';
import MediaCarousel from '../components/MediaCarousel';
import Reveal from '../components/Reveal';
import JourneyScene from '../components/scenes/JourneyScene';
import Spinner from '../components/Spinner';
import VenuePulse from '../components/VenuePulse';
import { Counter, EASE, Magnetic, MaskText } from '../components/motionKit';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const MARQUEE_ITEMS = [
  'Gym',
  'Hotel',
  'Bar Lounge',
  'Football Ground',
  'Table Tennis',
];

// The complex is not one product with one checkout, and pretending otherwise
// was the problem with the old "booked in three moves" section: it described
// the football pitch and misdescribed everything else. Each entry below is a
// real booking_mode, so this section cannot drift away from what the site
// actually does — the facilities that belong to each are read from the API.
const WAYS_IN = [
  {
    // Table tennis is a 'benefit', not its own way in — it arrives with a
    // membership, so it belongs in this column rather than uncovered.
    modes: ['membership', 'benefit'],
    n: '01',
    title: 'Join once',
    text: 'Register, pick a plan, and the gym is yours daily. Table tennis comes with it — no booking, no court fee.',
    cta: { label: 'View membership', to: '/facilities/gym' },
  },
  {
    modes: ['room'],
    n: '02',
    title: 'Stay the night',
    text: 'Choose a room, choose your dates, and pay per night. Your room is held the moment you reserve it.',
    cta: { label: 'View rooms', to: '/facilities/hotel' },
  },
  {
    modes: ['session'],
    n: '03',
    title: 'Book the pitch',
    text: 'Check what is free, take a slot, and pay to confirm. Availability is checked the second you book.',
    cta: { label: 'Check availability', to: '/facilities/football-ground' },
  },
  {
    modes: ['walk_in'],
    n: '04',
    title: 'Just walk in',
    text: 'No reservation for the lounge. Find a table, scan the code on it, order from your phone and settle the bill there.',
    cta: { label: 'See the menu', to: '/menu' },
  },
];

function SectionHeading({ index, eyebrow, title, children }) {
  return (
    <div>
      <Reveal>
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400 sm:gap-3 sm:text-xs sm:tracking-[0.25em]">
          <span className="font-display italic">{index}</span>
          <span className="h-px w-7 bg-gold-400/50 sm:w-10" aria-hidden="true" />
          {eyebrow}
        </p>
      </Reveal>
      <h2 className="mt-3 max-w-[18ch] font-display text-[1.75rem] font-bold leading-[1.15] text-balance sm:mt-4 sm:max-w-2xl sm:text-5xl sm:leading-tight">
        <MaskText mode="view" lines={title} />
      </h2>
      {children}
    </div>
  );
}

function Hero({ user }) {
  const heroRef = useRef(null);
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  // Cinematic showreel — one clip per facility. Restarts the clock on a
  // manual jump because `slide` is in the deps.
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_REEL.length), 8000);
    return () => clearInterval(t);
  }, [reduce, slide]);

  return (
    <section
      ref={heroRef}
      className="grain relative flex min-h-[calc(100svh-4rem)] items-end overflow-hidden"
    >
      {/* Video reel + scroll parallax */}
      <motion.div className="absolute inset-x-0 -top-[12%] -bottom-[12%]" style={{ y: imgY }}>
        <MediaCarousel
          className="relative h-full w-full"
          items={HERO_REEL.map((r) =>
            r.video
              ? { type: 'video', src: r.video, poster: r.image, name: r.name }
              : { type: 'image', src: r.image, name: r.name }
          )}
          activeIndex={slide}
          kenburns
        />
      </motion.div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/55 to-stone-950/25"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(242,193,78,0.14),transparent_60%)]"
        aria-hidden="true"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ y: contentY, opacity: contentOpacity }}
        // Tighter top on phones — the old 9rem pushed the headline and the
        // buttons below the fold. The bottom clears the fixed MobileDock and
        // its fade, which otherwise sat over the stats and showreel control.
        className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-20 sm:px-6 sm:pb-24 sm:pt-36"
      >
        {/* Day-ticker badge — slides in step with the showreel, walking
            the visitor through one day at Primetime. */}
        <motion.p
          variants={fadeUp}
          layout
          // Smaller type and tracking on phones: at desktop sizes the longest
          // tagline made the pill ~450px wide and the hero clipped its end.
          // max-w-full + truncate below is the backstop for narrower screens.
          className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-medium tracking-[0.14em] uppercase text-stone-200 backdrop-blur-md sm:px-4 sm:text-xs sm:tracking-[0.2em]"
        >
          <span className="sr-only">
            Ibadan, Nigeria — one address, open from first light to last call.
          </span>
          <span aria-hidden="true" className="inline-flex min-w-0 items-center gap-2.5">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-gold-400" />
            {/* The city label gives way on phones so the time and tagline —
                the part that changes with the reel — fit unclipped. */}
            <span className="hidden shrink-0 text-gold-300 sm:inline">Ibadan</span>
            <span className="hidden h-3 w-px shrink-0 bg-white/20 sm:block" />
            <span className="relative block h-4 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={slide}
                  initial={{ y: '120%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="flex items-center gap-2 whitespace-nowrap leading-4"
                >
                  <span className="shrink-0 text-gold-300/90">{HERO_REEL[slide].time}</span>
                  <span className="min-w-0 truncate text-stone-300">{HERO_REEL[slide].tagline}</span>
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </motion.p>

        {/* Measured in characters, not pixels: a max-width in rem still lets
            the headline run the full width of a narrow phone. Capping it at
            ~14 characters forces the deliberate two-line break the design
            was drawn around, at every screen size. */}
        <h1 className="mt-5 max-w-[14ch] font-display text-[2rem] font-bold leading-[1.05] text-balance text-white sm:mt-6 sm:max-w-4xl sm:text-6xl lg:text-8xl">
          <MaskText
            delay={0.35}
            lines={[
              <>Five worlds.</>,
              <>
                One <span className="italic text-gold-300">membership.</span>
              </>,
            ]}
          />
        </h1>

        <motion.p
          variants={fadeUp}
          // ~40 characters per line on a phone — the range type is actually
          // comfortable to read at. The old copy ran to four full-width
          // lines, which is a paragraph, not a hero subhead.
          className="mt-4 max-w-[38ch] text-sm leading-relaxed text-pretty text-stone-300 sm:mt-6 sm:max-w-xl sm:text-lg"
        >
          The gym, the pitch, the lounge and a suite to wake up in — open from
          8am, all on one membership.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-6 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4"
        >
          <Magnetic>
            <Link to="/facilities" className="btn-gold !px-6 !py-3 text-sm sm:!px-8 sm:!py-3.5 sm:text-base">
              Explore the complex <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Magnetic>
          {!user && (
            <Link
              to="/register"
              className="btn-outline !border-white/25 !px-6 !py-3 text-sm !text-white hover:!border-gold-300 hover:!text-gold-300 sm:!px-8 sm:!py-3.5 sm:text-base"
            >
              Become a member
            </Link>
          )}
        </motion.div>

        <motion.dl
          variants={fadeUp}
          className="mt-8 grid max-w-2xl grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-5 sm:mt-16 sm:pt-6"
        >
          {/* Label above figure: the eye lands on the gold number, then has
              the caption already read. Reversing them also stops the three
              figures sitting on a ragged baseline when one wraps. */}
          <div className="pr-3 sm:pr-4">
            <dt className="text-[9px] uppercase tracking-[0.15em] text-stone-500 sm:text-[10px]">
              Facilities
            </dt>
            <dd className="mt-1.5 font-display text-2xl font-bold leading-none text-gold-300 sm:text-3xl">
              <Counter to={5} />
            </dd>
          </div>
          <div className="px-3 sm:px-4">
            <dt className="text-[9px] uppercase tracking-[0.15em] text-stone-500 sm:text-[10px]">
              Open daily
            </dt>
            <dd className="mt-1.5 font-display text-lg font-bold leading-none whitespace-nowrap text-gold-300 sm:text-3xl">
              8am–10pm
            </dd>
          </div>
          <div className="pl-3 sm:pl-4">
            {/* The lounge and the pitch no longer quote a per-session price,
                so "sessions from ₦3,000" was quoting a figure the site
                doesn't show any more. Membership is the real entry point. */}
            <dt className="text-[9px] uppercase tracking-[0.15em] text-stone-500 sm:text-[10px]">
              Membership from
            </dt>
            <dd className="mt-1.5 font-display text-2xl font-bold leading-none text-gold-300 sm:text-3xl">
              <Counter to={5000} prefix="₦" />
            </dd>
          </div>
        </motion.dl>

        {/* Showreel control, in the flow — phones only. Tapping a bar jumps
            the reel; the name doubles as the caption the corner version
            carries on desktop. */}
        <motion.div
          variants={fadeUp}
          className="mt-5 flex items-center justify-between gap-4 sm:hidden"
          role="group"
          aria-label="Facility showreel"
        >
          <span className="font-display text-sm italic text-gold-300">
            {HERO_REEL[slide].name}
          </span>
          <div className="flex gap-1.5">
            {HERO_REEL.map((r, i) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Show ${r.name}`}
                aria-current={i === slide}
                className={`h-6 cursor-pointer border-y-[0.6rem] border-transparent bg-clip-content transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
                  i === slide ? 'w-7 bg-gold-400' : 'w-3.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">Scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-white/15">
          <span className="animate-scroll-hint absolute left-0 top-0 h-4 w-px bg-gold-400" />
        </span>
      </motion.div>

      {/* Showreel control — pinned to the corner only where there is room
          for it. On a phone it lives inline under the stats instead, because
          floating it over the hero landed it on top of them. */}
      <motion.div
        className="absolute bottom-6 right-4 hidden items-center gap-3 sm:right-6 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        role="group"
        aria-label="Facility showreel"
      >
        <span className="w-16 text-right font-display text-sm italic text-gold-300 sm:w-20">
          {HERO_REEL[slide].name}
        </span>
        <div className="flex gap-1.5">
          {HERO_REEL.map((r, i) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`Show ${r.name}`}
              aria-current={i === slide}
              className={`h-5 cursor-pointer border-y-8 border-transparent bg-clip-content transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 ${
                i === slide ? 'w-8 bg-gold-400' : 'w-4 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function Story() {
  const storyRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start end', 'end start'],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], [100, -70]);

  return (
    <section className="border-y border-stone-800/80 bg-stone-900/30">
      <div
        ref={storyRef}
        className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:gap-12 sm:px-6 sm:py-28 lg:grid-cols-2"
      >
        <div>
          <SectionHeading
            index="02"
            eyebrow="The experience"
            title={[<>From first rep</>, <>to last call</>]}
          >
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-md leading-relaxed text-stone-400">
                Primetime was built for days that refuse to end. Train hard in a
                fully-kitted gym, settle a five-a-side score under floodlights,
                then trade your boots for a booth in the lounge — and if the
                night runs long, your suite is thirty steps away.
              </p>
              <div className="mt-8">
                <Link to="/facilities" className="btn-outline">
                  Plan your day <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </SectionHeading>
        </div>

        <div className="relative mx-auto w-full max-w-md pb-14 lg:max-w-none">
          <motion.div style={{ y: y1 }}>
            <Reveal variant="mask">
              <img
                src={STORY_IMAGES[0]}
                alt="A live performer on stage at the Primetime bar lounge"
                loading="lazy"
                className="aspect-[4/5] w-3/4 rounded-3xl border border-stone-700/60 object-cover shadow-2xl shadow-stone-950"
              />
            </Reveal>
          </motion.div>
          <motion.div style={{ y: y2 }} className="absolute -bottom-2 right-0 w-1/2">
            <Reveal variant="mask" delay={0.15}>
              <img
                src={STORY_IMAGES[1]}
                alt="Five-a-side football in full flight"
                loading="lazy"
                className="aspect-square w-full rounded-3xl border-4 border-stone-950 object-cover shadow-2xl shadow-stone-950"
              />
            </Reveal>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { data: facilities, isLoading } = useFacilities();
  const [featured, ...rest] = facilities ?? [];

  return (
    <>
      <Hero user={user} />

      {/* ——— Live venue state ——— */}
      <VenuePulse />

      {/* ——— Marquee ——— */}
      <div
        className="overflow-hidden border-y border-stone-800/80 bg-stone-900/40 py-4"
        aria-hidden="true"
      >
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-8">
              {MARQUEE_ITEMS.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="flex items-center gap-8 font-display text-lg italic text-stone-400"
                >
                  {item}
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-400/70" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ——— Facilities ——— */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24" aria-labelledby="facilities-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            index="01"
            eyebrow="The facilities"
            title={[<span id="facilities-heading">Five worlds,</span>, <>one address</>]}
          />
          <Reveal delay={0.15}>
            <Link
              to="/facilities"
              className="inline-flex items-center gap-1.5 border-b border-gold-400/40 pb-1 text-sm font-medium text-gold-300 transition-colors hover:border-gold-300 hover:text-gold-200"
            >
              View all facilities <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-12">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner label="Loading facilities…" />
            </div>
          ) : (
            // Two across on phones — most visitors are on one, and a single
            // column meant scrolling past one facility at a time to see what
            // the complex even has. The lead card still spans the row.
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {featured && (
                <Reveal className="col-span-2" y={40}>
                  <FacilityCard facility={featured} featured />
                </Reveal>
              )}
              {rest.slice(0, 1).map((f) => (
                <Reveal key={f.id} y={40} delay={0.1} className="lg:col-span-1">
                  <FacilityCard facility={f} featured />
                </Reveal>
              ))}
              {rest.slice(1).map((f, i) => (
                <Reveal key={f.id} y={40} delay={0.05 * i}>
                  <FacilityCard facility={f} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Story />

      {/* ——— A day at Primetime (scroll-driven journey) ——— */}
      <JourneyScene />

      {/* ——— Ways in ——— */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        <SectionHeading
          index="03"
          eyebrow="Getting in"
          title={[<>Five spaces,</>, <>four ways in</>]}
        >
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-[42ch] text-sm text-pretty text-stone-400 sm:max-w-xl sm:text-base">
              Not everything here is booked the same way — and nothing is booked
              that shouldn't be. Here is how each part of the complex works.
            </p>
          </Reveal>
        </SectionHeading>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5">
          {WAYS_IN.map((way, i) => {
            // Named from the API rather than hardcoded, so adding a facility
            // puts it in the right column here automatically.
            const covers = (facilities ?? [])
              .filter((f) => way.modes.includes(f.booking_mode ?? 'session'))
              .map((f) => f.name);

            return (
              <Reveal key={way.title} delay={0.06 * i}>
                <div className="group flex h-full flex-col border-t border-stone-800 pt-4 transition-colors duration-300 hover:border-gold-400/60 sm:pt-6">
                  <div className="flex items-baseline gap-3">
                    <p className="font-display text-2xl font-bold italic text-gold-400/80 transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:group-hover:translate-y-0 sm:text-3xl">
                      {way.n}
                    </p>
                    <h3 className="font-display text-lg font-semibold sm:text-2xl">
                      {way.title}
                    </h3>
                  </div>

                  {covers.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {covers.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-stone-800 bg-stone-900/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-400"
                        >
                          {name}
                        </span>
                      ))}
                    </p>
                  )}

                  <p className="mt-2.5 max-w-[40ch] text-xs leading-relaxed text-pretty text-stone-400 sm:text-sm">
                    {way.text}
                  </p>

                  <Link
                    to={way.cta.to}
                    className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-gold-300 underline-offset-4 transition-colors hover:text-gold-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 sm:mt-auto sm:pt-4 sm:text-sm"
                  >
                    {way.cta.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ——— CTA ——— */}
      <section className="grain relative overflow-hidden">
        <MediaCarousel
          items={CTA_IMAGES.map((src) => ({ type: 'image', src }))}
          interval={8500}
          kenburns
        />
        <div className="absolute inset-0 bg-stone-950/75" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-32">
          <h2 className="mx-auto max-w-[16ch] font-display text-[1.75rem] font-bold leading-[1.15] text-balance text-white sm:max-w-2xl sm:text-5xl sm:leading-tight lg:text-6xl">
            <MaskText
              mode="view"
              lines={[
                <>Your table, your pitch,</>,
                <>
                  your suite — <span className="italic text-gold-300">reserved.</span>
                </>,
              ]}
            />
          </h2>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-4 max-w-[38ch] text-sm text-pretty text-stone-300 sm:mt-5 sm:max-w-md sm:text-base">
              Join free today. Book your first session before the weekend fills up.
            </p>
            <div className="mt-7 sm:mt-9">
              <Magnetic>
                <Link
                  to={user ? '/facilities' : '/register'}
                  className="btn-gold !px-6 !py-3 text-sm sm:!px-8 sm:!py-3.5 sm:text-base"
                >
                  {user ? 'Book a facility' : 'Join Primetime'}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
