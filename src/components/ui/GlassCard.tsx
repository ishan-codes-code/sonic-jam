import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  glow?: boolean;
}

export const GlassCard = ({
  children,
  style,
  blurIntensity = 20,
  glow = false
}: GlassCardProps) => {
  return (
    <View
      style={[
        styles.container,
        theme.glass.surface,
        glow ? theme.glass.glowEffect : {},
        style
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  content: {
    padding: theme.spacing.md,
  },
});
