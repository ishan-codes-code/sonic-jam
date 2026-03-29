/**
 * Sonic Ethereal Gradient Presets
 * 
 * Signature Gradients for CTAs and "Explore" category headers.
 */

import { colors } from './colors';

export const gradients = {
  // Primary Gradient (purple -> neon blue at 135deg)
  primary: {
    colors: [colors.primaryAccent, colors.secondaryAccent],
    locations: [0, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }, // 135 degrees (top-left to bottom-right)
  },
  
  // High energy pulse highlights
  exploreHighlight: {
    colors: [colors.secondaryAccent, '#ffffff'], // blue to white shift
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  
  // Subtle surface fade for content on visuals (30% bottom overlay)
  subtleOverlay: {
    colors: ['transparent', 'rgba(0, 0, 0, 0.4)', colors.backgroundBase],
    locations: [0, 0.5, 1], // Gradual fade
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
} as const;

export type Gradients = typeof gradients;
