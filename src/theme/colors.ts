/**
 * Sonic Ethereal Color System
 * 
 * Rooted in the void of deep space, punctuated by high-energy neon pulses.
 * Translates the "atmospheric layered philosophy" into design tokens.
 */

export const colors = {
  // Atmospheric Layers
  backgroundBase: '#000000', // Pitch black for OLED
  backgroundSection: '#080809', // Deepest atmospheric layer
  backgroundCard: '#121214', // Elevated card surface
  backgroundInteractive: '#1c1c1f', // Interactive/hover surface
  glassSurface: 'rgba(20, 20, 22, 0.65)', // Premium matte glass
  
  // Neon Accents
  primaryAccent: '#a855f7', // Vivid Purple (Aureate Purple)
  primaryAccentDim: '#7e22ce', // Deep Purple
  secondaryAccent: '#22d3ee', // Electric Cyan
  actionAccent: '#22d3ee', // Matches secondary
  actionAccentDim: '#0891b2', // Pressed Cyan
  
  // States & Utility
  error: '#f43f5e', // Rose-red high contrast
  outlineVariant: '#27272a', // Subtle boundary
  outlineVariantAlpha: 'rgba(39, 39, 42, 0.4)', // Ghost Border
  
  // Typography
  textPrimary: '#ffffff', // Clean white
  textSecondary: '#a1a1aa', // Zinc secondary
  textMuted: '#52525b', // Muted metadata
  onPrimary: '#ffffff',
  onSecondary: '#000000',
} as const;

export type Colors = typeof colors;
