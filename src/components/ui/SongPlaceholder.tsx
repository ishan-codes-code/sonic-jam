import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/src/theme';

type GradientPreset = {
  colors: [string, string] | [string, string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

// Vibrant, dark-friendly gradients (avoid harsh neon on OLED).
const GRADIENTS: GradientPreset[] = [
  { colors: ['#1D4ED8', '#7C3AED'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // blue -> violet
  { colors: ['#6D28D9', '#DB2777'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // deep purple -> magenta
  { colors: ['#0E7490', '#2563EB'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // teal -> blue
  { colors: ['#7C2D12', '#EA580C', '#DB2777'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // warm -> pink
  { colors: ['#0F766E', '#16A34A'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // teal -> green
  { colors: ['#1E3A8A', '#0E7490'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // navy -> teal
  { colors: ['#9D174D', '#4C1D95'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // rose -> indigo
  { colors: ['#1F2937', '#334155', '#7C3AED'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // slate -> violet pop
];

const hashSeed = (seed: string) => {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash);
};

const pickInitial = (title?: string) => {
  const value = (title ?? '').trim();
  const match = value.match(/[A-Za-z0-9]/);
  return match?.[0]?.toUpperCase() ?? null;
};

export type SongPlaceholderProps = {
  title?: string;
  artist?: string;
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  mode?: 'letter' | 'icon' | 'auto';
};

export function SongPlaceholder({
  title,
  artist,
  size,
  borderRadius,
  style,
  mode = 'auto',
}: SongPlaceholderProps) {
  const seed = `${title ?? ''}${artist ?? ''}`;
  const gradient = useMemo(() => GRADIENTS[hashSeed(seed) % GRADIENTS.length], [seed]);

  const initial = useMemo(() => pickInitial(title), [title]);
  const shouldShowLetter = mode === 'letter' || (mode === 'auto' && Boolean(initial));

  return (
    <LinearGradient
      colors={gradient.colors as any}
      start={gradient.start}
      end={gradient.end}
      style={[
        styles.base,
        typeof size === 'number' ? { width: size, height: size } : null,
        typeof borderRadius === 'number' ? { borderRadius } : null,
        style,
      ]}
    >
      {shouldShowLetter ? (
        <Text style={styles.letter}>{initial}</Text>
      ) : (
        <Ionicons name="musical-notes" size={22} color="rgba(255,255,255,0.86)" />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

