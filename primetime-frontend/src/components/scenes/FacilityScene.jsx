/**
 * FacilityScene — motion-designed card backgrounds, one bespoke scene per
 * facility. Replaces static photography with living, on-brand animation:
 * every loop runs on the GPU compositor (transform/opacity keyframes in
 * index.css) and falls back to a still composition under reduced motion.
 */

// —— Gym: a barbell doing reps over a pulsing intensity equalizer ——
const EQ_BARS = [34, 58, 42, 76, 50, 88, 44, 66, 38, 72, 54, 92, 48, 62, 36, 80, 58, 46];

function GymScene() {
  return (
    <div className="absolute inset-0 bg-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(251,146,60,0.18),transparent_65%)]" />
      <div className="scene-grid absolute inset-0 opacity-[0.05]" />

      {/* Intensity equalizer */}
      <div className="absolute inset-x-8 bottom-0 flex h-28 items-end gap-1.5">
        {EQ_BARS.map((h, i) => (
          <span
            key={i}
            className="scene-eq flex-1 rounded-t bg-gradient-to-t from-orange-400/50 to-orange-300/5"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.13}s`,
              animationDuration: `${1.4 + (i % 4) * 0.22}s`,
            }}
          />
        ))}
      </div>

      {/* Barbell rep */}
      <svg
        viewBox="0 0 240 170"
        className="absolute left-1/2 top-1/2 h-36 w-auto -translate-x-1/2 -translate-y-[62%]"
      >
        <ellipse cx="120" cy="158" rx="72" ry="6" fill="rgba(0,0,0,0.45)" />
        <g className="scene-rep">
          {/* plates — inner to outer */}
          <rect x="58" y="48" width="13" height="76" rx="4" fill="rgba(251,146,60,0.85)" />
          <rect x="44" y="56" width="12" height="60" rx="4" fill="rgba(251,146,60,0.65)" />
          <rect x="31" y="64" width="10" height="44" rx="4" fill="rgba(251,146,60,0.45)" />
          <rect x="169" y="48" width="13" height="76" rx="4" fill="rgba(251,146,60,0.85)" />
          <rect x="184" y="56" width="12" height="60" rx="4" fill="rgba(251,146,60,0.65)" />
          <rect x="199" y="64" width="10" height="44" rx="4" fill="rgba(251,146,60,0.45)" />
          {/* bar + collars */}
          <rect x="18" y="82" width="204" height="7" rx="3.5" fill="rgba(231,229,228,0.75)" />
          <rect x="74" y="79" width="5" height="13" rx="2" fill="rgba(253,186,116,0.9)" />
          <rect x="161" y="79" width="5" height="13" rx="2" fill="rgba(253,186,116,0.9)" />
        </g>
      </svg>
    </div>
  );
}

// —— Hotel: night skyline, windows glowing awake, moon and stars ——
const HOTEL_STARS = [
  { top: '8%', left: '12%', d: 0 },
  { top: '18%', left: '30%', d: 1.1 },
  { top: '6%', left: '46%', d: 2.2 },
  { top: '22%', left: '60%', d: 0.6 },
  { top: '10%', left: '74%', d: 1.7 },
  { top: '26%', left: '88%', d: 2.8 },
  { top: '32%', left: '18%', d: 1.4 },
  { top: '15%', left: '92%', d: 0.3 },
];

const BUILDINGS = [
  { x: 8, w: 56, h: 96 },
  { x: 74, w: 44, h: 128 },
  { x: 128, w: 62, h: 84 },
  { x: 200, w: 48, h: 140 },
  { x: 258, w: 58, h: 104 },
  { x: 326, w: 50, h: 122 },
];

// Deterministic window grid — most lit windows are static, a handful flicker.
const WINDOWS = BUILDINGS.flatMap((b, bi) => {
  const cols = Math.floor((b.w - 12) / 13);
  const rows = Math.floor((b.h - 16) / 15);
  const out = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const hash = (bi * 13 + c * 7 + r * 5) % 10;
      out.push({
        x: b.x + 8 + c * 13,
        y: 180 - b.h + 10 + r * 15,
        lit: hash < 6,
        flicker: hash === 0,
        d: ((bi + c * 2 + r * 3) % 6) * 0.9,
      });
    }
  }
  return out;
});

function HotelScene() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0b1220,#151312_78%)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_55%)]" />

      {HOTEL_STARS.map((s, i) => (
        <span
          key={i}
          className="scene-twinkle absolute h-[3px] w-[3px] rounded-full bg-sky-100"
          style={{ top: s.top, left: s.left, animationDelay: `${s.d}s` }}
        />
      ))}

      {/* Moon */}
      <div className="absolute right-[12%] top-7 h-10 w-10 rounded-full bg-[#e2e8f0]/90 shadow-[0_0_34px_8px_rgba(186,230,253,0.25)]">
        <span className="absolute left-2.5 top-3 h-1.5 w-1.5 rounded-full bg-slate-300/70" />
        <span className="absolute left-5 top-6 h-1 w-1 rounded-full bg-slate-300/60" />
      </div>

      {/* Skyline */}
      <svg
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-3/4 w-full"
      >
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={180 - b.h} width={b.w} height={b.h} fill="#191614" />
        ))}
        {WINDOWS.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width="6"
            height="8"
            rx="1"
            className={w.flicker ? 'scene-window' : undefined}
            style={w.flicker ? { animationDelay: `${w.d}s` } : undefined}
            fill={w.lit ? 'rgba(252,211,77,0.8)' : 'rgba(255,255,255,0.05)'}
          />
        ))}
      </svg>
    </div>
  );
}

// —— Bar lounge: a stage spotlight over a standing mic, embers rising
// off the grill — wine, grills and live music, not cocktails ——
const EMBERS = [
  { left: '30%', size: 3, d: 0, dur: 3.2 },
  { left: '38%', size: 4, d: 0.8, dur: 3.8 },
  { left: '46%', size: 3, d: 1.6, dur: 3.4 },
  { left: '54%', size: 4, d: 0.3, dur: 3.9 },
  { left: '62%', size: 3, d: 2.1, dur: 3.1 },
  { left: '70%', size: 4, d: 1.1, dur: 3.6 },
  { left: '42%', size: 3, d: 2.6, dur: 3.5 },
  { left: '58%', size: 3, d: 1.9, dur: 3.3 },
  { left: '50%', size: 4, d: 0.6, dur: 4 },
];

function BarScene() {
  return (
    <div className="absolute inset-0 bg-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(252,211,77,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(154,52,18,0.24),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(127,29,29,0.16),transparent_60%)]" />

      {/* Stage spotlight sweeping over the mic */}
      <div className="scene-beam absolute -top-4 left-1/2 h-[78%] w-28 -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(252,211,77,0.32),transparent_78%)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />

      {/* Standing mic, lit by the spot */}
      <svg
        viewBox="0 0 120 170"
        className="absolute left-1/2 top-1/2 h-36 w-auto -translate-x-1/2 -translate-y-[58%]"
      >
        <ellipse cx="60" cy="158" rx="42" ry="6" fill="rgba(0,0,0,0.4)" />
        <g stroke="rgba(214,211,209,0.55)" strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="60" y1="76" x2="60" y2="150" />
          <line x1="34" y1="150" x2="86" y2="150" />
          <line x1="60" y1="150" x2="44" y2="138" />
        </g>
        <ellipse cx="60" cy="60" rx="15" ry="20" fill="rgba(252,211,77,0.85)" />
        <g fill="rgba(41,37,36,0.55)">
          <rect x="48" y="52" width="24" height="4" rx="2" />
          <rect x="48" y="60" width="24" height="4" rx="2" />
          <rect x="48" y="68" width="24" height="4" rx="2" />
        </g>
      </svg>

      {/* Embers rising off the grill */}
      {EMBERS.map((b, i) => (
        <span
          key={i}
          className="scene-bubble absolute bottom-[6%] rounded-full bg-orange-400 opacity-0"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            boxShadow: '0 0 5px rgba(251,146,60,0.9)',
            animationDelay: `${b.d}s`,
            animationDuration: `${b.dur}s`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(ellipse_at_bottom,rgba(234,88,12,0.35),transparent_75%)]" />
    </div>
  );
}

// —— Football: floodlit pitch in perspective, a ball rolling end to end ——
function FootballScene() {
  return (
    <div className="absolute inset-0 bg-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(52,211,153,0.16),transparent_62%)]" />

      {/* Floodlight beams */}
      <div className="scene-beam absolute -top-4 left-[9%] h-[72%] w-24 bg-[linear-gradient(to_bottom,rgba(110,231,183,0.28),transparent_78%)] [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
      <div className="scene-beam absolute -top-4 right-[9%] h-[72%] w-24 bg-[linear-gradient(to_bottom,rgba(110,231,183,0.28),transparent_78%)] [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] [animation-delay:-3.7s]" />

      {/* Pitch markings */}
      <svg
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-2/3 w-full"
      >
        <g stroke="rgba(255,255,255,0.11)" strokeWidth="1.5" fill="none">
          <line x1="30" y1="220" x2="150" y2="40" />
          <line x1="370" y1="220" x2="250" y2="40" />
          <line x1="63" y1="170" x2="337" y2="170" />
          <line x1="96" y1="120" x2="304" y2="120" />
          <line x1="123" y1="80" x2="277" y2="80" />
          <ellipse cx="200" cy="170" rx="64" ry="16" />
          <circle cx="200" cy="170" r="2.5" fill="rgba(255,255,255,0.25)" stroke="none" />
        </g>
      </svg>

      {/* Rolling ball */}
      <div className="scene-ball-x absolute inset-x-0 bottom-5 h-10">
        <span className="scene-ball-bounce absolute bottom-0 left-0 block">
          <svg viewBox="0 0 28 28" className="scene-ball-spin h-7 w-7">
            <circle cx="14" cy="14" r="12.5" fill="#e7e5e4" />
            <path
              d="M14 8.5 L19 12.2 L17.1 18 L10.9 18 L9 12.2 Z"
              fill="#292524"
            />
            <g stroke="#292524" strokeWidth="1.4" fill="none">
              <path d="M14 8.5 L14 2.5" />
              <path d="M19 12.2 L24.5 10" />
              <path d="M9 12.2 L3.5 10" />
              <path d="M17.1 18 L20.5 23" />
              <path d="M10.9 18 L7.5 23" />
            </g>
          </svg>
        </span>
      </div>
    </div>
  );
}

// —— Spa: breathing light, expanding ripples, drifting steam ——
const STEAM = [
  { left: '30%', d: 0 },
  { left: '50%', d: 2.4 },
  { left: '66%', d: 4.6 },
];

function SpaScene() {
  return (
    <div className="absolute inset-0 bg-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.15),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(12,8,20,0.8),transparent_70%)]" />

      {/* Ripples + breathing orb */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="scene-ripple absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/50 opacity-30"
            style={{ animationDelay: `${i * 1.8}s` }}
          />
        ))}
        <span className="scene-breathe block h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(221,214,254,0.75),rgba(167,139,250,0.15)_65%,transparent_75%)]" />
      </div>

      {/* Steam wisps */}
      {STEAM.map((s, i) => (
        <span
          key={i}
          className="scene-steam absolute bottom-8 h-24 w-10 rounded-full bg-violet-200/10 opacity-0 blur-xl"
          style={{ left: s.left, animationDelay: `${s.d}s` }}
        />
      ))}
    </div>
  );
}

const SLUG_SCENE = {
  gym: GymScene,
  hotel: HotelScene,
  'bar-lounge': BarScene,
  'football-ground': FootballScene,
};

const CATEGORY_SCENE = {
  fitness: GymScene,
  accommodation: HotelScene,
  dining: BarScene,
  sports: FootballScene,
  other: SpaScene,
};

export default function FacilityScene({ facility }) {
  const Scene =
    SLUG_SCENE[facility.slug] ?? CATEGORY_SCENE[facility.category] ?? SpaScene;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-stone-950">
      <Scene />
    </div>
  );
}

/* ————————————————————————————————————————————————————————————————
 * FacilityAccents — the ambient half of each scene, designed to sit
 * on top of photography: a category color grade plus a restrained
 * animated layer (sparkle, steam, floodlight…). No centerpiece
 * graphics — the photo is the subject.
 * ———————————————————————————————————————————————————————————————— */

function GymAccents() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(251,146,60,0.22),transparent_60%)]" />
      <div className="absolute inset-x-10 bottom-0 flex h-14 items-end gap-1.5 opacity-30 mix-blend-screen">
        {EQ_BARS.slice(0, 12).map((h, i) => (
          <span
            key={i}
            className="scene-eq flex-1 rounded-t bg-gradient-to-t from-orange-400 to-orange-300/10"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.13}s`,
              animationDuration: `${1.4 + (i % 4) * 0.22}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function HotelAccents() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_55%)]" />
      {HOTEL_STARS.map((s, i) => (
        <span
          key={i}
          className="scene-twinkle absolute h-1.5 w-1.5 rounded-full bg-gold-300/90 blur-[1px]"
          style={{ top: s.top, left: s.left, animationDelay: `${s.d}s` }}
        />
      ))}
    </>
  );
}

function BarAccents() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(252,211,77,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(127,29,29,0.14),transparent_55%)]" />
      {EMBERS.slice(0, 7).map((b, i) => (
        <span
          key={i}
          className="scene-bubble absolute bottom-[4%] rounded-full bg-orange-400/80 opacity-0"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            boxShadow: '0 0 5px rgba(251,146,60,0.85)',
            animationDelay: `${b.d}s`,
            animationDuration: `${b.dur}s`,
          }}
        />
      ))}
    </>
  );
}

function FootballAccents() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(52,211,153,0.2),transparent_60%)]" />
      <div className="scene-beam absolute -top-4 left-[16%] h-[80%] w-24 bg-[linear-gradient(to_bottom,rgba(209,250,229,0.35),transparent_80%)] mix-blend-screen [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
      <div className="scene-beam absolute -top-4 right-[16%] h-[80%] w-24 bg-[linear-gradient(to_bottom,rgba(209,250,229,0.3),transparent_80%)] mix-blend-screen [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)] [animation-delay:-3.7s]" />
    </>
  );
}

function SpaAccents() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.18),transparent_60%)]" />
      {STEAM.map((s, i) => (
        <span
          key={i}
          className="scene-steam absolute bottom-6 h-24 w-12 rounded-full bg-violet-100/15 opacity-0 blur-xl"
          style={{ left: s.left, animationDelay: `${s.d}s` }}
        />
      ))}
    </>
  );
}

const SLUG_ACCENTS = {
  gym: GymAccents,
  hotel: HotelAccents,
  'bar-lounge': BarAccents,
  'football-ground': FootballAccents,
};

const CATEGORY_ACCENTS = {
  fitness: GymAccents,
  accommodation: HotelAccents,
  dining: BarAccents,
  sports: FootballAccents,
  other: SpaAccents,
};

export function FacilityAccents({ facility }) {
  const Accents =
    SLUG_ACCENTS[facility.slug] ?? CATEGORY_ACCENTS[facility.category] ?? SpaAccents;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Accents />
    </div>
  );
}
