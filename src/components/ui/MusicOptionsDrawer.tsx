import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Image, FlatList } from 'react-native';
import { theme } from '@/src/theme';
import AnimatedPressable from './AnimatedPressable';
import { SongPlaceholder } from './SongPlaceholder';

export interface ActionItem {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  rightElement?: ReactNode;
}

interface MusicOptionsDrawerProps {
  image?: string | null;
  title: string;
  subtitle: string;
  actions: ActionItem[];
}

export function MusicOptionsDrawer({ image, title, subtitle, actions }: MusicOptionsDrawerProps) {
  const renderItem = ({ item }: { item: ActionItem }) => (
    <AnimatedPressable 
      onPress={item.onPress} 
      pressableStyle={styles.actionRow}
      scaleTo={0.98}
      feedback="timing"
      pressedOpacity={0.7}
    >
      <View style={styles.iconContainer}>{item.icon}</View>
      <Text style={styles.actionLabel}>{item.label}</Text>
      {item.rightElement && <View style={styles.rightElement}>{item.rightElement}</View>}
    </AnimatedPressable>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <SongPlaceholder
            title={title}
            artist={subtitle}
            size={56}
            borderRadius={styles.image.borderRadius}
            style={{ marginRight: theme.spacing.md }}
          />
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Actions List */}
      <FlatList
        data={actions}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl, 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing.md,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  subtitle: {
    ...theme.typography.metadata,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.outlineVariantAlpha,
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  listContent: {
    paddingTop: theme.spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionLabel: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  rightElement: {
    marginLeft: theme.spacing.sm,
  }
});
