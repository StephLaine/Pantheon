// Pantheon Path design tokens — ported from the quiz-master-*.html mockups.

export const colors = {
  // marble & stone
  marble: '#F6F1E4',
  marbleDk: '#E6DBC0',
  stone: '#B7AE9A',
  stoneDk: '#8B8270',

  // gold & bronze
  gold: '#FFC93C',
  goldLt: '#FFE79A',
  goldDp: '#C79A2E',
  bronze: '#8A5A22',
  bronzeDk: '#4A2E06',

  // ink & accents
  ink: '#241B3A',
  inkSoft: '#6B5F86',
  red: '#FF3B4E',
  green: '#4CAF50',
  orangeLike: '#FF8A3D',
  white: '#FFFFFF',

  // sky (used behind the climb, between scenery bands)
  skyTop: '#4E7FCE',
  skyMid: '#8FB4E4',
  skyBottom: '#CFE0F2',

  // pantheon chapter accents
  cHermes: '#38C6D9',
  cAthena: '#3A5FE0',
  cPoseidon: '#159C86',
  cAres: '#C23B4B',
  cZeus: '#FFD84D',
} as const;

export const fonts = {
  disp: 'Cinzel_700Bold',
  dispSemi: 'Cinzel_600SemiBold',
  heroDisp: 'CinzelDecorative_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtra: 'Nunito_800ExtraBold',
  bodyBlack: 'Nunito_900Black',
} as const;

export const radii = { lg: 24, md: 20, sm: 16 } as const;

export const shadow = {
  sm: {
    shadowColor: '#0A0520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  md: {
    shadowColor: '#0A0520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  lg: {
    shadowColor: '#0A0520',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.38,
    shadowRadius: 28,
    elevation: 14,
  },
} as const;

export function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let res = '';
  for (const [v, s] of map) {
    while (num >= v) { res += s; num -= v; }
  }
  return res;
}
