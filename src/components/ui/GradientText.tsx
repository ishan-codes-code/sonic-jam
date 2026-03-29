import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { theme } from '../../theme';

interface GradientTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  colors?: readonly [string, string, ...string[]];
}

export const GradientText = ({
  text,
  style,
  colors = [theme.colors.primaryAccent, theme.colors.secondaryAccent]
}: GradientTextProps) => {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>
          {text}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>
          {text}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};
