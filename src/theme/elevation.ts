/**
 * Sonic Ethereal Elevation Model
 * 
 * Depth is "felt" through the stacking of surfaces.
 * Atmospheric layered stacking: Levels 0-3.
 */

import { ViewStyle, Platform } from 'react-native';
import { colors } from './colors';

export const elevation = {
  // Level 0 (Base): No elevation, backgound-lowest
  base: {
    backgroundColor: colors.backgroundBase,
  } as ViewStyle,

  // Level 1 (Sections): Soft boundary through background shift
  section: {
    backgroundColor: colors.backgroundSection,
  } as ViewStyle,

  // Level 2 (Cards): Individual content area surface
  card: {
    backgroundColor: colors.backgroundCard,
  } as ViewStyle,

  // Level 3 (Interactive / Floating): Elevated with ambient neon glow shadow
  // Shadow must be diffused (24px-32px blur at 8% opacity, tinted with primary)
  floating: {
    backgroundColor: colors.backgroundInteractive,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryAccent,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
      },
      android: {
        elevation: 8,
        shadowColor: colors.primaryAccent,
      },
      web: {
        boxShadow: `0 12px 32px 0 rgba(197, 154, 255, 0.12)`, // c59aff at 12%
      }
    }),
  } as ViewStyle,
} as const;

export type Elevation = typeof elevation;
