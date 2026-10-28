// Curated Unsplash photography per facility — people-first shots led by
// African subjects to mirror Primetime's Ibadan guests, each one visually
// verified (2026-07-12, refreshed 2026-07-13). Hotlinked for the MVP —
// swap for Primetime's own Cloudinary shots before launch.
const u = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// Pexels stills, used where Unsplash had nothing that fit the brief — its
// West African library is far deeper. Same hotlink-for-now policy as above.
const px = (id, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// [0] is the lead/card shot and should always show people engaging.
// Primetime runs five facilities — there is no spa/wellness offering.
const FACILITY_PHOTO_IDS = {
  gym: [
    'photo-1572459815549-873917ec8c0a', // lifter mid-set, dramatic black & white
    'photo-1603503364272-6e28e046b37a', // dumbbell push-ups on the floor
    'photo-1633394782240-f81aba3f850d', // treadmill session in a dark gym
  ],
  hotel: [
    'photo-1761377197584-2eed555e2b0c', // arrival in the lobby, suitcase in hand
    'photo-1643923212255-07e0580c8ed3', // couple in robes laughing on the bed
    'photo-1611892440504-42a792e24d32', // warm suite turned down for the night
  ],
  // Wine, spirits and juice at the bar; grilled beef and cow leg pepper
  // soup off the fire; a stage where live acts perform — no cocktails.
  // Five photos, not the usual three: every one of those is a distinct,
  // named menu item and the carousel should actually show each of them.
  'bar-lounge': [
    'photo-1595422656857-ced3a4a0ce25', // live performer on stage, golden hour
    'photo-1707422058118-5169109ef116', // wine & spirits shelf behind the bar
    'photo-1637514957245-82f2bdd169bc', // fresh juice poured into a glass
    'photo-1687422808277-2334638f09fb', // suya vendor grilling beef skewers
    'photo-1763048443535-1243379234e2', // native stew held out, cow leg and all
  ],
  'football-ground': [
    'photo-1657268378575-2c223b92e279', // five-a-side duel on the court
    'photo-1652665314612-c48e10a01598', // pick-up football at full stretch
    'photo-1575361204480-aadea25e6e68', // ball waiting on the turf
  ],
};

// Indoor, low-lit and quiet — the members' games room, not a street table.
// An earlier pass used street table tennis in Accra; the market stalls and
// hard midday sun read as a roadside game rather than somewhere you'd play
// after a session, so these replace them. Visually verified 2026-08-17.
const PEXELS_PHOTO_IDS = {
  'table-tennis': [
    33438350, // games room under pendant lights, a rally in progress
    709134, //   mid-serve in a dim hall, the ball caught in the air
    4080060, //  bat resting on the ball, shallow focus, close to black
  ],
};

export const FACILITY_IMAGES = {
  ...Object.fromEntries(
    Object.entries(FACILITY_PHOTO_IDS).map(([slug, ids]) => [
      slug,
      ids.map((id) => u(id)),
    ])
  ),
  ...Object.fromEntries(
    Object.entries(PEXELS_PHOTO_IDS).map(([slug, ids]) => [
      slug,
      ids.map((id) => px(id)),
    ])
  ),
};

const CATEGORY_FALLBACK = {
  fitness: FACILITY_IMAGES.gym,
  accommodation: FACILITY_IMAGES.hotel,
  dining: FACILITY_IMAGES['bar-lounge'],
  sports: FACILITY_IMAGES['football-ground'],
};

export const facilityImage = (facility, index = 0) => {
  const set =
    FACILITY_IMAGES[facility.slug] ||
    CATEGORY_FALLBACK[facility.category] ||
    FACILITY_IMAGES.hotel;
  return set[index % set.length];
};

// Small square crop of a facility's lead shot (journey markers, avatars).
export const facilityThumb = (slug, w = 240) => {
  if (PEXELS_PHOTO_IDS[slug]) return px(PEXELS_PHOTO_IDS[slug][0], w);
  const ids = FACILITY_PHOTO_IDS[slug] ?? FACILITY_PHOTO_IDS.hotel;
  return u(ids[0], w);
};

export const CTA_IMAGES = [
  u('photo-1607504622473-62981bf57d13', 2000), // friends raising a toast
  u('photo-1643923212255-07e0580c8ed3', 2000), // couple in robes laughing
];
export const STORY_IMAGES = [
  u('photo-1595422656857-ced3a4a0ce25', 900), // live performer on the lounge stage
  u('photo-1649513786103-91257b1a9a2b', 900), // street five-a-side, black & white
];

// ——— Video ———
// Muted looping clips per facility with African subjects wherever people
// are on camera, verified via their poster frames (2026-07-12/13). Same
// MVP hotlink policy as the photography above.
const mixkit = (id, res = 720) =>
  `https://assets.mixkit.co/videos/${id}/${id}-${res}.mp4`;
const pexels = (id, file) =>
  `https://videos.pexels.com/video-files/${id}/${file}.mp4`;

// Cards can carry several clips; each plays in the carousel before the
// stills. SD renditions keep card payloads light — the hero reel streams
// the HD cuts.
const FACILITY_VIDEO_SRCS = {
  gym: [
    pexels(7690497, '7690497-sd_640_338_25fps'), // dumbbell lift in red-lit gym
    pexels(35585556, '15079423_1080_1920_30fps'), // treadmill run
  ],
  hotel: [mixkit(4196)], // slow pan across a dim, turned-down suite (no people)
  'bar-lounge': [
    pexels(9006072, '9006072-sd_640_360_25fps'), // live set, retro mic, stage lights
    pexels(3135953, '3135953-sd_640_360_30fps'), // suya grilling over charcoal at night
  ],
  'football-ground': [pexels(7187046, '7187046-sd_960_540_24fps')], // cone drills on the pitch
};

const SLUG_BY_CATEGORY = {
  fitness: 'gym',
  accommodation: 'hotel',
  dining: 'bar-lounge',
  sports: 'football-ground',
};

const facilitySlug = (facility) =>
  FACILITY_IMAGES[facility.slug]
    ? facility.slug
    : SLUG_BY_CATEGORY[facility.category] ?? 'hotel';

// Video-first media set for a facility card: the clips, then the stills.
export const facilityMedia = (facility) => {
  const slug = facilitySlug(facility);
  const images = FACILITY_IMAGES[slug];
  const videos = FACILITY_VIDEO_SRCS[slug] ?? [];
  return [
    ...videos.map((src, i) => ({
      type: 'video',
      src,
      poster: images[i % images.length],
    })),
    ...images.map((src) => ({ type: 'image', src })),
  ];
};

// Cinematic reel for the landing hero — one slide per real facility, in
// the order of the day (first rep to last call).
export const HERO_REEL = [
  {
    name: 'Gym',
    slug: 'gym',
    time: '8 AM',
    tagline: 'First reps of the day',
    video: pexels(6980128, '6980128-hd_2048_1080_30fps'),
  },
  {
    name: 'Football',
    slug: 'football-ground',
    time: '5 PM',
    tagline: 'Five-a-side under floodlights',
    video: pexels(7187046, '7187046-hd_1920_1080_24fps'),
  },
  {
    name: 'Lounge',
    slug: 'bar-lounge',
    time: '8 PM',
    tagline: 'Live music, wine & the grill',
    video: pexels(9006072, '9006072-hd_1920_1080_25fps'),
  },
  {
    name: 'Suite',
    slug: 'hotel',
    time: '10 PM',
    tagline: 'A suite to fall into',
    video: mixkit(4196),
  },
].map((stop) => ({
  ...stop,
  image: FACILITY_IMAGES[stop.slug][0],
}));
