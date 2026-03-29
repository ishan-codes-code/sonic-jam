import { ArrowRight, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { YouTubeVideo } from '../../../services/youtube';
import { theme } from '../../../theme';
import { MediaCard } from '../MediaCard';

// ─── Simple Pulse Skeleton Component ──────────────────────────────────────────
const PulseSkeleton = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  return <Animated.View style={[{ opacity: anim }, style]}>{children}</Animated.View>;
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface MediaSectionProps {
  title: string;
  data: YouTubeVideo[];
  layout: 'horizontal' | 'vertical';
  variant: 'large' | 'compact';
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onDeleteSection?: () => void;
  onItemPress: (item: YouTubeVideo) => void;
  onItemLongPress?: (item: YouTubeVideo) => void;
  style?: ViewStyle;
  /** Optional custom header rendered on the left (e.g. icon + title). */
  renderTitle?: () => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const MediaSection = ({
  title,
  data,
  layout,
  variant,
  hasMore,
  isLoading,
  isLoadingMore,
  onRefresh,
  onLoadMore,
  onDeleteSection,
  onItemPress,
  onItemLongPress,
  renderTitle,
  style,
}: MediaSectionProps) => {
  const isHorizontal = layout === 'horizontal';

  // ── Header ──────────────────────────────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {renderTitle ? renderTitle() : (
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      <View style={styles.headerActions}>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionBtn}
          >
            <RotateCcw size={18} color={theme.colors.textSecondary as any} />
          </TouchableOpacity>
        )}
        {onDeleteSection && (
          <TouchableOpacity
            onPress={onDeleteSection}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionBtn}
          >
            <Trash2 size={18} color={theme.colors.error as any} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── Loading Skeleton ──────────────────────────────────────────────────
  if (isLoading && data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {header}
        <PulseSkeleton>
          {isHorizontal ? (
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.horizontalSkeleton}>
                  <View style={{ width: 200, height: 112, borderRadius: theme.radius.md, marginBottom: 8, backgroundColor: theme.colors.backgroundInteractive }} />
                  <View style={{ width: 140, height: 16, borderRadius: 4, marginBottom: 4, backgroundColor: theme.colors.backgroundInteractive }} />
                  <View style={{ width: 100, height: 12, borderRadius: 4, backgroundColor: theme.colors.backgroundInteractive }} />
                </View>
              ))}
            </View>
          ) : (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.verticalSkeleton}>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: 120, height: 72, borderRadius: theme.radius.md, marginRight: 16, backgroundColor: theme.colors.backgroundInteractive }} />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 8, backgroundColor: theme.colors.backgroundInteractive }} />
                      <View style={{ width: '50%', height: 12, borderRadius: 4, backgroundColor: theme.colors.backgroundInteractive }} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </PulseSkeleton>
      </View>
    );
  }

  if (isHorizontal) {
    return (
      <View style={[styles.container, style]}>
        {header}
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item, i) => `h_${item.videoId}_${i}`}
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              variant={variant}
              onPress={onItemPress}
              onLongPress={onItemLongPress}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: theme.spacing.md }}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                onPress={onLoadMore}
                style={[
                  styles.horizontalLoadMore,
                  {
                    height: variant === 'large' ? 164 : 72,
                  }
                ]}
                disabled={isLoadingMore}
                activeOpacity={0.6}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color={theme.colors.primaryAccent} />
                ) : (
                  <>
                    <View style={styles.loadMoreCircle}>
                      <ArrowRight size={20} color={theme.colors.primaryAccent} />
                    </View>
                    <Text style={styles.loadMoreText}>More</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      </View>
    );
  }

  // ── Vertical Layout (YouTube Trending list) ─────────────────────────────
  return (
    <View style={[styles.container, style]}>
      {header}
      {data.map((item, i) => (
        <MediaCard
          key={`v_${item.videoId}_${i}`}
          item={item}
          variant={variant}
          onPress={onItemPress}
          onLongPress={onItemLongPress}
        />
      ))}
      {/* Load More button (vertical only) */}
      {hasMore && (
        <TouchableOpacity
          onPress={onLoadMore}
          style={styles.loadMoreBtn}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <ActivityIndicator color={theme.colors.primaryAccent} />
          ) : (
            <Text style={[theme.typography.label, { color: theme.colors.primaryAccent }]}>
              Load More
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  horizontalSkeleton: {
    marginRight: theme.spacing.md,
  },
  verticalSkeleton: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.backgroundCard,
    padding: 0,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  horizontalLoadMore: {
    width: 100,
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 154, 255, 0.15)',
  },
  loadMoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(197, 154, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadMoreText: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
