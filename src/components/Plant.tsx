import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

const STEM = '#3F8A47';
const LEAF = '#66BB6A';
const SOIL = '#8D6E4F';

/** A little plant drawn in a 40x40 box. stage: 0 soil, 1 seed, 2 sprout, 3 plant, 4 bloom. */
export default function Plant({ stage, size = 40 }: { stage: number; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Ellipse cx={20} cy={34} rx={13} ry={4} fill={stage === 0 ? '#D9CDBE' : SOIL} opacity={stage === 0 ? 0.6 : 1} />
      {stage === 1 && <Ellipse cx={20} cy={31} rx={3} ry={2} fill="#5D4630" />}
      {stage >= 2 && <Path d="M20 33 V22" stroke={STEM} strokeWidth={2} strokeLinecap="round" />}
      {stage === 2 && (
        <>
          <Path d="M20 24 C14 24 12 19 13 17 C18 17 20 20 20 24Z" fill={LEAF} />
          <Path d="M20 22 C26 22 28 17 27 15 C22 15 20 18 20 22Z" fill={LEAF} />
        </>
      )}
      {stage >= 3 && (
        <>
          <Path d="M20 30 C12 31 8 26 9 22 C16 22 20 25 20 30Z" fill={LEAF} />
          <Path d="M20 27 C28 28 32 23 31 19 C24 19 20 22 20 27Z" fill="#4CAF50" />
          <Path d="M20 22 C14 21 12 15 14 12 C19 13 21 17 20 22Z" fill={LEAF} />
        </>
      )}
      {stage === 4 && (
        <>
          <Circle cx={20} cy={11} r={7} fill="#F8BBD0" />
          <Circle cx={14.5} cy={9} r={4} fill="#F48FB1" />
          <Circle cx={25.5} cy={9} r={4} fill="#F48FB1" />
          <Circle cx={20} cy={15} r={4} fill="#F48FB1" />
          <Circle cx={20} cy={11} r={3} fill="#FFD54F" />
        </>
      )}
    </Svg>
  );
}
