import { Image } from 'expo-image';
import React from 'react';
import { View, Text } from 'react-native';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  image: string;
}

export const AuthHeader = ({ title, subtitle, image }: AuthHeaderProps) => {
  const images = {
    login: require('../../../../assets/images/login.png'),
    signup: require('../../../../assets/images/signup.png'),
  };



  return (
    <View className="pt-12">


      {/* Illustration slot */}
      <Image
        source={images[image as keyof typeof images]}
        style={{ width: 220, height: 220, marginHorizontal: "auto" }}
        contentFit="contain"
      />

      {/* Titles */}
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        {title}
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        {subtitle}
      </Text>
    </View>
  );
};