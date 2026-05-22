import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './ui/text';

interface GradientTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  className?: string;
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export const GradientText = ({
  text,
  style,
  className,
  colors = ['#818cf8', '#c084fc'], // Default Indigo to Violet gradient
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 }
}: GradientTextProps) => {
  return (
    <MaskedView
      maskElement={
        <Text
          className={cn('bg-transparent', className)}
          style={style}
        >
          {text}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
      >
        <Text
          className={cn('opacity-0', className)}
          style={style}
        >
          {text}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};
