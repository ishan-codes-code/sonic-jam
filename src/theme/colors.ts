/**
 * Sonic Ethereal Color System
 * 
 * Rooted in the void of deep space, punctuated by high-energy neon pulses.
 * Translates the "atmospheric layered philosophy" into design tokens.
 */

export const colors = {
  // Atmospheric Layers
  backgroundBase: '#000000', // surface-container-lowest
  backgroundSection: '#131313', // surface-container-low
  backgroundCard: '#191919', // surface-container
  backgroundInteractive: '#2c2c2c', // surface-bright
  glassSurface: 'rgba(30, 30, 30, 0.7)', // surface-container-high with transparency
  
  // Neon Accents
  primaryAccent: '#c59aff', // primary (sophisticated royal purple)
  primaryAccentDim: '#9547f7', // primary-dim
  secondaryAccent: '#00e3fd', // secondary (high-energy neon blue)
  actionAccent: '#1ED760', // modern play-green (used sparingly for primary actions)
  actionAccentDim: '#18B84E', // pressed/active state green
  
  // States & Utility
  error: '#ff6e84', // coral-red high contrast
  outlineVariant: '#484848', // for ghost borders
  outlineVariantAlpha: 'rgba(72, 72, 72, 0.15)', // Ghost Border (15% opacity)
  
  // Typography
  textPrimary: '#f0f0f0', // on-surface (slightly off-white to reduce eye strain)
  textSecondary: '#ababab', // on-surface-variant
  textMuted: '#757575', // for low emphasis metadata
  onPrimary: '#000000',
  onSecondary: '#000000',
} as const;

export type Colors = typeof colors;
