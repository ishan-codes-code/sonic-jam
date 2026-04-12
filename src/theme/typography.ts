/**
 * Sonic Ethereal Typography System
 * 
 * Pairings: 
 * - Plus Jakarta Sans (Headlines/Display): Modern, wide-set editorial feel.
 * - Inter (Body): Maximum legibility at small sizes.
 */

import { TextStyle } from 'react-native';

export const typography = {
  // Display - Massive & Authoritative
  displayLarge: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 48,
    letterSpacing: -1.5,
  } as TextStyle,
  displayMedium: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 32,
    letterSpacing: -1,
  } as TextStyle,

  // Headlines - Playlist titles & Section headers
  headline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    letterSpacing: -0.5,
  } as TextStyle,

  // Title - List item titles & secondary headers
  title: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 18,
    letterSpacing: -0.2,
  } as TextStyle,

  // Body - Descriptions & main content
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,

  // Label - Navigation & tiny tags
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    letterSpacing: 0.1,
  } as TextStyle,

  // Metadata - Used for low emphasis details
  metadata: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
