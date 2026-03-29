/**
 * Sonic Ethereal Theme System
 * 
 * Scalable theme foundation for the Sonic music platform.
 * Translates architectural layered philosophy into reusable design tokens.
 */

import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography } from './typography';
import { elevation } from './elevation';
import { glass } from './glass';
import { gradients } from './gradients';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  elevation,
  glass,
  gradients,
} as const;

export type Theme = typeof theme;

export { colors } from './colors';
export { spacing } from './spacing';
export { radius } from './radius';
export { typography } from './typography';
export { elevation } from './elevation';
export { glass } from './glass';
export { gradients } from './gradients';
