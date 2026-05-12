// MEV = Minimum Effective Volume, MAV = Maximum Adaptive Volume (sets/week)
// Source: Israetel, Hoffman & Smith — "Scientific Principles of Hypertrophy Training"
// Tier logic: red = below MEV, orange = MEV to midpoint, green = midpoint to MAV
// Note: side-delts has no matching polygon in the SVG library — tracked in chips only.
export const MUSCLE_GROUPS = [
  { id: 'chest',        label: 'Chest',        libraryNames: ['chest'],            mev: 8, mav: 16 },
  { id: 'lats',         label: 'Lats',         libraryNames: ['upper-back'],       mev: 8, mav: 16 },
  { id: 'upper-back',   label: 'Upper Back',   libraryNames: ['trapezius'],        mev: 6, mav: 14 },
  { id: 'lower-back',   label: 'Lower Back',   libraryNames: ['lower-back'],       mev: 4, mav: 10 },
  { id: 'front-delts',  label: 'Front Delts',  libraryNames: ['front-deltoids'],   mev: 4, mav: 12 },
  { id: 'side-delts',   label: 'Side Delts',   libraryNames: [],                   mev: 6, mav: 16 },
  { id: 'rear-delts',   label: 'Rear Delts',   libraryNames: ['back-deltoids'],    mev: 4, mav: 16 },
  { id: 'biceps',       label: 'Biceps',       libraryNames: ['biceps'],           mev: 6, mav: 14 },
  { id: 'triceps',      label: 'Triceps',      libraryNames: ['triceps'],          mev: 6, mav: 14 },
  { id: 'forearms',     label: 'Forearms',     libraryNames: ['forearm'],          mev: 4, mav: 14 },
  { id: 'core',         label: 'Core',         libraryNames: ['abs', 'obliques'],  mev: 4, mav: 16 },
  { id: 'quads',        label: 'Quads',        libraryNames: ['quadriceps'],       mev: 8, mav: 14 },
  { id: 'hamstrings',   label: 'Hamstrings',   libraryNames: ['hamstring'],        mev: 6, mav: 12 },
  { id: 'glutes',       label: 'Glutes',       libraryNames: ['gluteal'],          mev: 4, mav: 12 },
  { id: 'calves',       label: 'Calves',       libraryNames: ['calves'],           mev: 6, mav: 12 },
] as const;

export type MuscleGroupId = typeof MUSCLE_GROUPS[number]['id'];

// Push/Pull/Legs classification for balance tracking
export const MUSCLE_CATEGORY: Record<string, 'push' | 'pull' | 'legs'> = {
  chest:         'push',
  triceps:       'push',
  'front-delts': 'push',
  'side-delts':  'push',
  lats:          'pull',
  'upper-back':  'pull',
  'rear-delts':  'pull',
  biceps:        'pull',
  forearms:      'pull',
  quads:         'legs',
  hamstrings:    'legs',
  glutes:        'legs',
  calves:        'legs',
  'lower-back':  'legs',
  core:          'legs',
};
