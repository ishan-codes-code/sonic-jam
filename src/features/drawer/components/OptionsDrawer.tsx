import React, { ReactNode } from 'react';
import { View, Image, FlatList } from 'react-native';
import AnimatedPressable from '../../../components/AnimatedPressable';
import { PlaylistArtwork } from '@/features/library/components/PlaylistArtwork';
import { Text } from '../../../components/ui/text';

export interface ActionItem {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  rightElement?: ReactNode;
}

interface MusicOptionsDrawerProps {
  image?: string | string[];
  title: string;
  subtitle: string;
  actions: ActionItem[];
}

export function OptionsDrawer({ image, title, subtitle, actions }: MusicOptionsDrawerProps) {
  const renderItem = ({ item }: { item: ActionItem }) => (
    <AnimatedPressable
      onPress={item.onPress}
      className='flex-row items-center py-[14px] px-4'
      // pressableStyle={styles.actionRow}
      scaleTo={0.98}
      feedback="timing"
      pressedOpacity={0.7}
    >
      <View className='items-center justify-center mr-4'>{item.icon}</View>
      <Text className='text-foreground text-base font-heading-medium flex-1'>{item.label}</Text>
      {item.rightElement && <View className='ml-2'>{item.rightElement}</View>}
    </AnimatedPressable>
  );

  return (
    <View className='pt-4 pb-12'>
      {/* Top Header */}
      <View className='flex-row items-center px-4 pb-4'>
        {Array.isArray(image) ? (
          <View className='w-14 h-14 rounded-sm mr-4'>
            <PlaylistArtwork thumbnailUrl={image} />
          </View>
        ) : (
          <Image source={{ uri: image }} className='w-14 h-14 rounded-sm mr-4' resizeMode="cover" />
        )}
        <View className='flex-1 justify-center gap-1'>
          <Text className='text-[18px] font-display text-foreground' numberOfLines={1}>{title}</Text>
          <Text className='text-sm text-muted-foreground font-sans-medium' numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      {/* Divider */}
      <View className='w-full border-b border-muted mb-2' />

      {/* Actions List */}
      <FlatList
        data={actions}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4 }}
        bounces={false}
      />
    </View>
  );
}


