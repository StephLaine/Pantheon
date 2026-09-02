// The blue/cyan/Fredoka palette ported from quiz-master-home.html. HomeScreen owns
// the canonical definition; other screens import this to share the same chrome
// colors without adopting Home's fonts or layout.
export const HC = {
  cyan: '#0FD2E6',
  cyanDp: '#00A7C4',
  blue: '#2962FF',
  blueLt: '#5B86FF',
  orange: '#FF9800',
  green: '#4CAF50',
  greenLt: '#8BE04E',
  red: '#FF3B4E',
  ink: '#0F2350',
  inkSoft: '#5D6E9C',
} as const;

export const HF = {
  disp: 'Fredoka_600SemiBold',
  dispBold: 'Fredoka_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtra: 'Nunito_800ExtraBold',
} as const;
