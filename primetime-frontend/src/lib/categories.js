import {
  BedDouble,
  Dumbbell,
  Sparkles,
  Trophy,
  Wine,
} from 'lucide-react';

// Visual identity per facility category — icon + tile gradient.
export const CATEGORY_META = {
  fitness: {
    label: 'Fitness',
    Icon: Dumbbell,
    tile: 'from-orange-500/25 via-stone-900 to-stone-950',
    text: 'text-orange-300',
  },
  accommodation: {
    label: 'Accommodation',
    Icon: BedDouble,
    tile: 'from-sky-500/25 via-stone-900 to-stone-950',
    text: 'text-sky-300',
  },
  dining: {
    label: 'Dining & Nightlife',
    Icon: Wine,
    tile: 'from-rose-500/25 via-stone-900 to-stone-950',
    text: 'text-rose-300',
  },
  sports: {
    label: 'Sports',
    Icon: Trophy,
    tile: 'from-emerald-500/25 via-stone-900 to-stone-950',
    text: 'text-emerald-300',
  },
  other: {
    label: 'Wellness',
    Icon: Sparkles,
    tile: 'from-violet-500/25 via-stone-900 to-stone-950',
    text: 'text-violet-300',
  },
};

export const categoryMeta = (category) =>
  CATEGORY_META[category] ?? CATEGORY_META.other;
