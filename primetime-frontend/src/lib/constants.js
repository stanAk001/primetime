import {
  Activity,
  Dumbbell,
  Flame,
  Heart,
  HeartPulse,
  Scale,
  Sparkles,
  Zap,
} from 'lucide-react';

// Mirrors REGISTRATION_FEE in primetime-backend/models/GymProfile.js —
// used only to preview the fee before checkout; the backend always
// computes and charges the authoritative amount.
export const REGISTRATION_FEE = 5000;

// Training goals offered on the gym enrollment form. `id` is what's
// stored in gym_profiles.goals — labels can be reworded freely without
// touching stored data.
export const GYM_GOALS = [
  { id: 'muscle-gain', label: 'Muscle Gain', blurb: 'Build size and raw strength', Icon: Dumbbell },
  { id: 'weight-loss', label: 'Weight Loss', blurb: 'Burn fat, drop the numbers', Icon: Flame },
  { id: 'six-pack', label: 'Six-Pack Abs', blurb: 'Carve out the core', Icon: Zap },
  { id: 'flat-tummy', label: 'Flat Tummy', blurb: 'Tighten and tone the midsection', Icon: Sparkles },
  { id: 'glutes', label: 'Glutes & Curves', blurb: 'Grow and shape the lower body', Icon: Heart },
  { id: 'weight-gain', label: 'Healthy Weight Gain', blurb: 'Add mass the right way', Icon: Scale },
  { id: 'endurance', label: 'Endurance & Cardio', blurb: 'Go longer, recover faster', Icon: HeartPulse },
  { id: 'general-fitness', label: 'General Fitness', blurb: 'Feel strong, move well, stay sharp', Icon: Activity },
];

export const goalById = (id) => GYM_GOALS.find((g) => g.id === id);
export const goalLabel = (id) => goalById(id)?.label ?? id;
