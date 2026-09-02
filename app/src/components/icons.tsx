import React from 'react';
import Svg, { Path, Ellipse, Circle, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function LaurelIcon({ size = 26, color = '#4A2E06' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill={color}>
        <Ellipse cx={30} cy={82} rx={7} ry={13} rotation={20} origin="30,82" />
        <Ellipse cx={24} cy={68} rx={7} ry={13} rotation={5} origin="24,68" />
        <Ellipse cx={22} cy={53} rx={7} ry={13} rotation={-10} origin="22,53" />
        <Ellipse cx={26} cy={38} rx={7} ry={13} rotation={-25} origin="26,38" />
        <Ellipse cx={34} cy={26} rx={7} ry={13} rotation={-40} origin="34,26" />
        <Ellipse cx={70} cy={82} rx={7} ry={13} rotation={-20} origin="70,82" />
        <Ellipse cx={76} cy={68} rx={7} ry={13} rotation={-5} origin="76,68" />
        <Ellipse cx={78} cy={53} rx={7} ry={13} rotation={10} origin="78,53" />
        <Ellipse cx={74} cy={38} rx={7} ry={13} rotation={25} origin="74,38" />
        <Ellipse cx={66} cy={26} rx={7} ry={13} rotation={40} origin="66,26" />
      </G>
    </Svg>
  );
}

export function LockIcon({ size = 22, color = '#5B5648' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3z"
      />
    </Svg>
  );
}

export function ChestIcon({ size = 28, color = '#4A2E06' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V8z" />
      <Path fill={color} opacity={0.92} d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />
      <Circle cx={12} cy={14.7} r={1.6} fill="#4A2E06" />
    </Svg>
  );
}
