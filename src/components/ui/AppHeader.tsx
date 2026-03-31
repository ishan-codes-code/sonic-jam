import { usePlayerStore } from '@/src/store/playerStore';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { GradientText } from './GradientText';
import { Spinnerbadge } from './SpinnerBadge';


export function AppHeader() {
  const router = useRouter();
  const { getProcessingJobs } = usePlayerStore()




  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.content}>
        <GradientText
          text="SONICJAM"
          style={[theme.typography.headline, styles.brandText]}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Search color={theme.colors.textPrimary} size={22} />
          </TouchableOpacity>
          <Pressable
            onPress={() => router.push('/processing')}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Processing"
          >
            <Spinnerbadge icon={<Text style={{ fontSize: 19, transform: [{ rotate: '-45deg' }] }}>⏳</Text>
            } count={getProcessingJobs().length} color={theme.colors.primaryAccent} />
          </Pressable>


        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.backgroundBase,
  },
  content: {
    height: 64,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandText: {
    letterSpacing: 2,
  },
  actions: {
    width: 72,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    // marginRight: theme.spacing.md,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundCard,
    padding: 8,

  },
  avatarButton: {
    borderRadius: 18,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
});
