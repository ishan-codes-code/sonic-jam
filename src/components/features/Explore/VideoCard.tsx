import { Play } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatViewCount, YouTubeVideo } from '../../../services/youtube';
import { theme } from '../../../theme';

// ─── Horizontal Card (Trending Now strip) ─────────────────────────────────────
interface HorizontalVideoCardProps {
  item: YouTubeVideo;
  onPress: (item: YouTubeVideo) => void;
}

export function HorizontalVideoCard({ item, onPress }: HorizontalVideoCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={hStyles.card}
      onPress={() => onPress(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={hStyles.thumbnail} />
      {/* Play overlay */}
      <View style={hStyles.playOverlay}>
        <View style={hStyles.playBtn}>
          <Play color="white" size={14} fill="white" />
        </View>
      </View>
      {/* Info */}
      <View style={hStyles.info}>
        <Text style={hStyles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={hStyles.channel} numberOfLines={1}>{item.channelTitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const hStyles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 112,
    backgroundColor: theme.colors.backgroundSection,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    bottom: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 8,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  channel: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

// ─── Vertical / List Card (YouTube Trending & Search Results) ─────────────────
interface VerticalVideoCardProps {
  item: YouTubeVideo;
  onPress: (item: YouTubeVideo) => void;
  onLongPress?: (item: YouTubeVideo) => void;
}

export function VerticalVideoCard({ item, onPress, onLongPress }: VerticalVideoCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={vStyles.card}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={vStyles.thumbnail} />
      <View style={vStyles.info}>
        <Text style={vStyles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={vStyles.channel}>{item.channelTitle}</Text>
        {item.viewCount ? (
          <Text style={vStyles.views}>{formatViewCount(item.viewCount)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const vStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 120,
    height: 72,
    backgroundColor: theme.colors.backgroundSection,
  },
  info: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  channel: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  views: {
    ...theme.typography.metadata,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
