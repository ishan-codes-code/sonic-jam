import { Play } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { formatDuration, formatViewCount } from '../../../services/youtube';
import { compactStyles, largeStyles } from './MediaCard.styles';
import { MediaCardProps } from './MediaCard.types';

const LargeCard = ({ item, onPress, onLongPress }: Pick<MediaCardProps, 'item' | 'onPress' | 'onLongPress'>) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={largeStyles.card}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress?.(item)}
  >
    <View style={{ position: 'relative' }}>
      <Image source={{ uri: item.thumbnail }} style={largeStyles.thumbnail} />
      {item.duration ? (
        <View style={largeStyles.durationBadge}>
          <Text style={largeStyles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      ) : null}
    </View>
    <View style={largeStyles.playOverlay}>
      <View style={largeStyles.playBtn}>
        <Play color="white" size={14} fill="white" />
      </View>
    </View>
    <View style={largeStyles.info}>
      <Text style={largeStyles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={largeStyles.channel} numberOfLines={1}>{item.channelTitle}</Text>
      {item.viewCount ? (
        <Text style={largeStyles.views}>{formatViewCount(item.viewCount)}</Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const CompactCard = ({ item, onPress, onLongPress }: Omit<MediaCardProps, 'variant'>) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={compactStyles.card}
    onPress={() => onPress(item)}
    onLongPress={() => onLongPress?.(item)}
  >
    <View style={{ position: 'relative' }}>
      <Image source={{ uri: item.thumbnail }} style={compactStyles.thumbnail} />
      {item.duration ? (
        <View style={compactStyles.durationBadge}>
          <Text style={compactStyles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      ) : null}
    </View>
    <View style={compactStyles.info}>
      <Text style={compactStyles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={compactStyles.channel}>{item.channelTitle}</Text>
      {item.viewCount ? (
        <Text style={compactStyles.views}>{formatViewCount(item.viewCount)}</Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const MediaCardComponent = ({ item, variant, onPress, onLongPress }: MediaCardProps) => {
  if (variant === 'large') {
    return <LargeCard item={item} onPress={onPress} onLongPress={onLongPress} />;
  }
  return <CompactCard item={item} onPress={onPress} onLongPress={onLongPress} />;
};

export const MediaCard = React.memo(MediaCardComponent);
