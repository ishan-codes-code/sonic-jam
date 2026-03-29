/**
 * Sonic Ethereal Glassmorphism Utility
 * 
 * Floating elements (Now Playing bar / Navigation) should use a semi-transparent 
 * surface-container-high with a backdrop-filter blur.
 */

import { ViewStyle } from 'react-native';
import { colors } from './colors';

export const glass = {
  surface: {
    backgroundColor: colors.glassSurface,
    // Backdrop blur typically requires @expo/blur or similar
    // We define values here for convenience
    blurIntensity: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariantAlpha, // "Ghost Border" at 15% opacity
  } as ViewStyle & { blurIntensity: number },
  
  glowEffect: {
    shadowColor: colors.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  } as ViewStyle,
} as const;

export type Glass = typeof glass;
