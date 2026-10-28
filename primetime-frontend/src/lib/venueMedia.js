// Artwork for the lounge menu and the hotel room types, keyed by the
// `media_key` stored on each row so the DB never holds a URL and Primetime
// can swap in its own footage without a migration.
//
// A note on scope: these are *category* and *room-type* clips, not one clip
// per drink. No free library has footage of a specific bottle of Trophy, and
// inventing 36 near-identical pours would look worse than one good one per
// section. Each section leads with its clip; the items beneath it are set as
// a proper printed menu — which is what a premium bar list actually looks
// like. Same hotlink-for-now policy as lib/images.js.
const px = (id, w = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const pv = (id, file) =>
  `https://videos.pexels.com/video-files/${id}/${file}.mp4`;

// SD renditions throughout — these autoplay behind a menu someone is reading
// on mobile data at a table, so payload matters more than sharpness.
const MENU_MEDIA = {
  beer: {
    videos: [pv(5847828, '5847828-sd_960_540_30fps')], // draft pour, close
    images: [px(5055175), px(12430630)],
  },
  cocktails: {
    videos: [pv(31750560, '13527217_1920_1080_25fps')], // red pour over ice
    images: [px(7016364)],
  },
  spirits: {
    videos: [pv(14058816, '14058816-sd_960_506_24fps')], // whisky into a jigger
    images: [px(3355400), px(941864)],
  },
  wine: {
    videos: [],
    images: [px(35778056)],
  },
  juice: {
    videos: [],
    images: [px(17612820)],
  },
  grill: {
    videos: [pv(3135953, '3135953-sd_640_360_30fps')], // suya over charcoal
    images: [px(13915043), px(36323856)],
  },
};

const ROOM_MEDIA = {
  'room-basic': {
    videos: [pv(19403230, '19403230-sd_960_540_25fps')],
    images: [px(279805), px(189293)],
  },
  'room-standard': {
    videos: [pv(12188719, '12188719-sd_960_540_25fps')],
    images: [px(32021575), px(14547139)],
  },
  'room-luxury': {
    videos: [pv(11051002, '11051002-sd_960_540_30fps')],
    images: [px(34496702), px(34496715)],
  },
};

// Videos first, then stills — matching how facility cards are built, and
// giving MediaCarousel a still to fall back to under reduced motion or
// data-saver, when it drops video entirely.
const toItems = (set) => {
  if (!set) return [];
  const poster = set.images[0];
  return [
    ...set.videos.map((src) => ({ type: 'video', src, poster })),
    ...set.images.map((src) => ({ type: 'image', src })),
  ];
};

// ——— Per-item backgrounds ———
// Each item is mapped to footage of *that drink or dish*, not to a generic
// clip from its section: champagne actually pours behind the Moët, a whole
// fish grills behind the catfish, red liquid goes over ice behind the
// Chapman. Chosen by what is in frame — colour, vessel, cooking method.
//
// The honest limit: no free library holds footage of a Nigerian brand or of
// nkwobi specifically, so where a dish is unique to here the clip matches its
// *form* (a bowl of hot peppery broth, meat over charcoal) rather than the
// exact recipe. Every one of those is noted below. Replace them first when
// Primetime shoots its own.
//
// All SD renditions — a dozen of these can be on screen at once on a phone,
// and MediaCarousel pauses everything scrolled out of view.
const ITEM_VIDEO = {
  // Beer — lager pours for the lagers, a bottle pour for the bottled import,
  // a dark stout pour for the stouts.
  'beer-star': pv(852344, '852344-sd_640_360_30fps'),
  'beer-gulder': pv(5847828, '5847828-sd_640_360_30fps'),
  'beer-trophy': pv(12511847, '12511847-hd_1920_1080_30fps'),
  'beer-heineken': pv(5847860, '5847860-sd_540_960_30fps'), // poured from the bottle
  'beer-guinness': pv(7080968, '7080968-sd_540_960_30fps'), // dark, thick head
  'beer-legend': pv(7080968, '7080968-sd_540_960_30fps'), // also a stout
  'beer-33': pv(852344, '852344-sd_640_360_30fps'),

  // Cocktails
  'cocktail-chapman': pv(31750560, '13527217_1920_1080_25fps'), // red, over ice
  'cocktail-zobo': pv(8677740, '8677740-sd_540_960_30fps'), // red drink, ice, citrus
  'cocktail-palm': pv(5501747, '5501747-sd_540_960_30fps'), // pale drink, tall glass
  'cocktail-mojito': pv(4774629, '4774629-sd_640_360_25fps'), // mint and lime
  'cocktail-colada': pv(5230367, '5230367-sd_640_360_25fps'), // creamy, garnished

  // Spirits — cognac and whisky over ice; red bitters for Campari.
  'spirit-hennessy': pv(10317805, '10317805-sd_640_338_25fps'),
  'spirit-jw': pv(5909919, '5909919-sd_640_338_25fps'),
  'spirit-jack': pv(14058816, '14058816-sd_640_338_24fps'),
  'spirit-jameson': pv(8546321, '8546321-sd_640_360_25fps'),
  'spirit-smirnoff': pv(5501747, '5501747-sd_540_960_30fps'), // clear spirit
  'spirit-campari': pv(31750560, '13527217_1920_1080_25fps'), // bitter red
  'spirit-alomo': pv(10317805, '10317805-sd_640_338_25fps'), // dark herbal shot

  // Wine — sparkling for the two celebration bottles, red for the reds.
  'wine-moet': pv(4170286, '4170286-sd_640_360_24fps'),
  'wine-rossi': pv(19826924, '19826924-sd_640_360_24fps'),
  'wine-four': pv(6289658, '6289658-sd_960_506_25fps'),
  'wine-neder': pv(19826924, '19826924-sd_640_360_24fps'),

  // Juice
  'juice-orange': pv(6739355, '6739355-sd_640_360_24fps'), // orange being poured
  'juice-pineapple': pv(8676948, '8676948-sd_540_960_30fps'), // fruit juice pour
  'juice-zobo': pv(8677740, '8677740-sd_540_960_30fps'), // red hibiscus over ice
  'juice-watermelon': pv(8676996, '8676996-sd_540_960_30fps'), // pink-red pour

  // Grill — skewers over charcoal for suya and asun, a bowl of steaming
  // broth for the pepper soup and the palm-oil bowls, a whole fish on the
  // fire for the catfish.
  'grill-suya': pv(3135953, '3135953-sd_640_360_30fps'), // suya over charcoal
  'grill-asun': pv(3209799, '3209799-sd_640_360_25fps'), // fired goat pieces
  // Red, steaming and peppery — the first bowl clip I tried was a pale Asian
  // congee, which read completely wrong next to a Nigerian menu.
  'grill-peppersoup': pv(4477972, '4477972-sd_640_360_25fps'), // spicy red broth
  'grill-nkwobi': pv(11507519, '11507519-sd_960_540_25fps'), // bowl being filled
  'grill-isiewu': pv(4477972, '4477972-sd_960_540_25fps'), // spicy red broth
  'grill-snail': pv(6841012, '6841012-sd_960_540_30fps'), // searing over fire
  'grill-catfish': pv(11801343, '11801343-sd_640_360_25fps'), // whole fish, charcoal
  'grill-chicken': pv(12664284, '12664284-sd_960_540_25fps'), // chicken pieces grilling
  'grill-smallchops': pv(6841012, '6841012-sd_960_540_30fps'), // fried, form-match only
};

// media_keys are prefixed with their section ('grill-suya'), so the still
// fallback follows from the key without extra wiring.
const sectionOf = (mediaKey = '') => {
  const prefix = mediaKey.split('-')[0];
  if (prefix === 'cocktail') return 'cocktails';
  if (prefix === 'spirit') return 'spirits';
  return MENU_MEDIA[prefix] ? prefix : 'cocktails';
};

/**
 * Background media for one menu item: its own clip, with the section still
 * behind it as the poster and the reduced-motion / data-saver fallback.
 */
export const menuItemMedia = (mediaKey, index = 0) => {
  const stills = MENU_MEDIA[sectionOf(mediaKey)]?.images ?? [];
  const poster = stills[index % Math.max(stills.length, 1)] ?? stills[0];
  const video = ITEM_VIDEO[mediaKey] ?? null;

  return [
    ...(video ? [{ type: 'video', src: video, poster }] : []),
    ...(poster ? [{ type: 'image', src: poster }] : []),
  ];
};

export const menuCategoryMedia = (key) => toItems(MENU_MEDIA[key]);
export const roomMedia = (key) => toItems(ROOM_MEDIA[key]);
export const roomStill = (key) => ROOM_MEDIA[key]?.images[0] ?? null;

// Match nights borrow the lounge's live-stage clip and the pitch footage —
// the evening is those two rooms, and neither needs new artwork.
const MATCH_MEDIA = {
  'match-featured': {
    videos: [pv(9006072, '9006072-sd_640_360_25fps')],
    images: [px(7016364)],
  },
  'match-side': {
    videos: [pv(7187046, '7187046-sd_960_540_24fps')],
    images: [px(13915043)],
  },
};

export const matchMedia = (key) => toItems(MATCH_MEDIA[key] ?? MATCH_MEDIA['match-side']);
