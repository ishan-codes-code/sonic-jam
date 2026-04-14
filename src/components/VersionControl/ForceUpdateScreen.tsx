import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, AlertCircle, Rocket } from 'lucide-react-native';
import { useVersionStore } from '../../store/versionStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export const ForceUpdateScreen = () => {
  const { updateUrl, message } = useVersionStore();

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl).catch((err) => {
        console.error('Failed to open update URL:', err);
      });
    } else {
      // Fallback message if URL is missing
      alert("Please contact the support team to get the latest version.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[
          theme.colors.backgroundBase,
          theme.colors.backgroundSection,
          theme.colors.backgroundInteractive,
        ]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <LinearGradient
            colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Rocket color={theme.colors.onPrimary} size={48} />
          </LinearGradient>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.subtitle}>
            {message || "We've released a new version with critical improvements and new features."}
          </Text>
        </View>

        <View style={styles.card}>
          <AlertCircle color={theme.colors.textSecondary} size={24} style={styles.cardIcon} />
          <Text style={styles.cardText}>
            Your current version is no longer supported. Please update to continue using Sonic.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.primary.colors}
              start={theme.gradients.primary.start}
              end={theme.gradients.primary.end}
              style={styles.buttonGradient}
            >
              <Download color={theme.colors.onPrimary} size={20} />
              <Text style={styles.buttonText}>Update Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.versionInfo}>
            Instant update • Better Performance • New Features
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  title: {
    ...theme.typography.displayMedium,
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    ...theme.elevation.card,
    borderRadius: theme.radius.md,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
  },
  cardIcon: {
    marginRight: theme.spacing.md,
  },
  cardText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.elevation.floatingShadow,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  versionInfo: {
    ...theme.typography.metadata,
    marginTop: 20,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
