import { StyleSheet, Text, TextProps } from 'react-native';
import { fonts } from '../theme/fonts';

/** Text in IBM Plex Sans Arabic (clean Latin + Arabic); maps fontWeight to the matching font file. */
export default function AppText({ style, ...rest }: TextProps) {
  const w = String(StyleSheet.flatten(style)?.fontWeight ?? '400');
  const family =
    w === '700' || w === '800' || w === '900' || w === 'bold' ? fonts.plexBold
    : w === '600' ? fonts.plexSemi
    : w === '500' ? fonts.plexMedium
    : fonts.plex;
  // fontWeight must be reset, otherwise Android synthesizes bold on top of the bold file
  return <Text {...rest} style={[style, { fontFamily: family, fontWeight: 'normal' }]} />;
}
