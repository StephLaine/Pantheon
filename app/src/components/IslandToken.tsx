import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Ellipse, Path, G, ClipPath } from 'react-native-svg';
import { lighten, darken } from '../utils/color';

// Ported from level_node_hermes.svg (viewBox 512x300), which has a blue gem center.
// The gem keeps that same treatment (radial-lit color, same gold rim) for every
// unlocked level — recolored per-chapter — and only turns to muted stone when locked.
const VB_W = 512;
const VB_H = 300;
export const TOKEN_ASPECT = VB_H / VB_W;
export const TOKEN_TOP_CENTER_RATIO = 112 / VB_H;

export type TokenVariant = 'unlocked' | 'locked';

interface Props {
  uid: string | number;
  width: number;
  variant: TokenVariant;
  topColor?: string; // chapter accent gem color — required when unlocked
}

const GOLD = {
  side: ['#E3BC63', '#A9752D', '#D2A84F', '#7B5420', '#B78234'],
  rim: ['#FFF4BE', '#E8C96B', '#AF7A30', '#F0D98A', '#8D6222'],
  inner: ['#FDE8A1', '#C89537', '#F8DF8D', '#A86E27'],
  rimCutout: '#B2782B',
  bevel: '#F2D893',
  underLip: '#754A1A',
  seamDark: '#6C4618',
  seamLight: '#F9DE9B',
  rimHi: '#FFF3C9',
  rimLo: '#7B5322',
};

const STONE = {
  side: ['#C7C2B4', '#8B8270', '#B7AE9A', '#6B6455', '#9A9284'],
  rim: ['#EDE9DD', '#C9C2AC', '#8B8270', '#D8D2BE', '#6E6858'],
  inner: ['#E4DFCF', '#9C947E', '#D2CBB6', '#7C7462'],
  rimCutout: '#8B8270',
  bevel: '#D8D2BE',
  underLip: '#5B5648',
  seamDark: '#5B5648',
  seamLight: '#DCD6C4',
  rimHi: '#EDE9DD',
  rimLo: '#5B5648',
};

const LOCKED_TOP = ['#CBD1D8', '#9BA3AC', '#6B7480', '#454C56'];

const SEAMS_DARK: [number, number, number][] = [
  [143, 129, 175],
  [188, 139, 194],
  [233, 145, 204],
  [279, 145, 204],
  [324, 139, 194],
  [369, 129, 175],
];
const SEAMS_LIGHT: [number, number, number][] = [
  [150, 128, 174],
  [195, 138, 192],
  [240, 144, 202],
  [286, 144, 202],
  [331, 138, 192],
  [376, 128, 174],
];

export default function IslandToken({ uid, width, variant, topColor }: Props) {
  const height = width * TOKEN_ASPECT;
  const metal = variant === 'locked' ? STONE : GOLD;
  const id = (name: string) => `tok-${name}-${uid}`;

  const topStops =
    variant === 'locked'
      ? LOCKED_TOP
      : [lighten(topColor ?? '#4E7FE0', 0.35), topColor ?? '#4E7FE0', darken(topColor ?? '#4E7FE0', 0.2), darken(topColor ?? '#4E7FE0', 0.45)];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} fill="none">
      <Defs>
        <LinearGradient id={id('side')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={metal.side[0]} />
          <Stop offset={0.2} stopColor={metal.side[1]} />
          <Stop offset={0.48} stopColor={metal.side[2]} />
          <Stop offset={0.72} stopColor={metal.side[3]} />
          <Stop offset={1} stopColor={metal.side[4]} />
        </LinearGradient>
        <LinearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset={0} stopColor={metal.rim[0]} />
          <Stop offset={0.18} stopColor={metal.rim[1]} />
          <Stop offset={0.42} stopColor={metal.rim[2]} />
          <Stop offset={0.68} stopColor={metal.rim[3]} />
          <Stop offset={1} stopColor={metal.rim[4]} />
        </LinearGradient>
        <LinearGradient id={id('inner')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset={0} stopColor={metal.inner[0]} />
          <Stop offset={0.35} stopColor={metal.inner[1]} />
          <Stop offset={0.7} stopColor={metal.inner[2]} />
          <Stop offset={1} stopColor={metal.inner[3]} />
        </LinearGradient>
        <RadialGradient id={id('top')} cx="50%" cy="32%" r="70%">
          <Stop offset={0} stopColor={topStops[0]} />
          <Stop offset={0.22} stopColor={topStops[1]} />
          <Stop offset={0.62} stopColor={topStops[2]} />
          <Stop offset={1} stopColor={topStops[3]} />
        </RadialGradient>
        <RadialGradient id={id('gloss')} cx="32%" cy="18%" r="55%">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.72} />
          <Stop offset={0.35} stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={id('clip')}>
          <Ellipse cx={256} cy={112} rx={165} ry={78} />
        </ClipPath>
      </Defs>

      {/* ground shadow */}
      <Ellipse cx={256} cy={227} rx={155} ry={33} fill="#000000" fillOpacity={0.16} />

      {/* base side / cylinder */}
      <Path
        d="M91 112C91 69 165 34 256 34C347 34 421 69 421 112V156C421 199 347 234 256 234C165 234 91 199 91 156V112Z"
        fill={`url(#${id('side')})`}
      />
      {/* lower bevel highlight */}
      <Path
        d="M103 156C103 188 171 215 256 215C341 215 409 188 409 156V163C409 195 341 222 256 222C171 222 103 195 103 163V156Z"
        fill={metal.bevel}
        fillOpacity={0.24}
      />
      {/* underside lip */}
      <Ellipse cx={256} cy={156} rx={165} ry={78} fill={metal.underLip} fillOpacity={0.35} />
      {/* outer top rim */}
      <Ellipse cx={256} cy={112} rx={165} ry={78} fill={`url(#${id('rim')})`} />
      {/* rim inner cutout */}
      <Ellipse cx={256} cy={112} rx={145} ry={66} fill={metal.rimCutout} />
      {/* inner gold ring */}
      <Ellipse cx={256} cy={112} rx={142} ry={63} fill={`url(#${id('inner')})`} />
      {/* top face */}
      <Ellipse cx={256} cy={112} rx={126} ry={55} fill={`url(#${id('top')})`} />
      {/* top face edge shading */}
      <Ellipse cx={256} cy={118} rx={126} ry={55} fill="#000000" fillOpacity={0.16} />
      <Ellipse cx={256} cy={112} rx={126} ry={55} fill={`url(#${id('top')})`} />

      {/* gloss */}
      <G clipPath={`url(#${id('clip')})`}>
        <Ellipse cx={221} cy={82} rx={95} ry={42} fill={`url(#${id('gloss')})`} />
        <Path
          d="M146 99C171 73 224 58 275 59C307 59 334 66 357 82"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.34}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </G>

      {/* rim highlights */}
      <Path
        d="M117 108C125 77 183 53 256 53C319 53 374 71 392 97"
        fill="none"
        stroke={metal.rimHi}
        strokeOpacity={0.8}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path
        d="M399 126C387 154 328 173 256 173C189 173 132 157 115 133"
        fill="none"
        stroke={metal.rimLo}
        strokeOpacity={0.45}
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* decorative seams on side */}
      <G opacity={0.35} stroke={metal.seamDark} strokeWidth={3}>
        {SEAMS_DARK.map(([sx, y1, y2]) => (
          <Path key={sx} d={`M${sx} ${y1}V${y2}`} fill="none" />
        ))}
      </G>
      <G opacity={0.28} stroke={metal.seamLight} strokeWidth={2}>
        {SEAMS_LIGHT.map(([sx, y1, y2]) => (
          <Path key={sx} d={`M${sx} ${y1}V${y2}`} fill="none" />
        ))}
      </G>
    </Svg>
  );
}
