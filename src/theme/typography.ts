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
    fontFamily: 'PlusJakartaSans_700Bold', // Bold, editorial feel
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  } as TextStyle,
  displayMedium: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  // Headlines - Playlist titles & Section headers
  headline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  } as TextStyle,

  // Title - List item titles & secondary headers
  title: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 20,
    lineHeight: 28,
  } as TextStyle,

  // Body - Descriptions & main content
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  // Label - Navigation & tiny tags
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  // Metadata - Used for low emphasis details
  metadata: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
