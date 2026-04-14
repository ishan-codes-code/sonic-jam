import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, X } from 'lucide-react-native';
import { useVersionStore } from '../../store/versionStore';
import { theme } from '../../theme';

export const OptionalUpdateModal = () => {
  const { isOptional, updateUrl, message, hasDismissedOptional, dismissOptional } = useVersionStore();

  if (!isOptional || hasDismissedOptional) return null;

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl).catch(console.error);
    } else {
      alert("Update link unavailable. Please contact support.");
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={dismissOptional}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <LinearGradient
          colors={[
            theme.colors.backgroundCard,
            theme.colors.backgroundInteractive,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContent}
        >
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={dismissOptional}
          >
            <X color={theme.colors.textSecondary} size={20} />
          </TouchableOpacity>

          <LinearGradient
            colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Sparkles color={theme.colors.onPrimary} size={32} />
          </LinearGradient>

          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.description}>
            {message || "A new version of Sonic is available with new features and improvements."}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.maybeLater} 
              onPress={dismissOptional}
            >
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.updateButton} 
              onPress={handleUpdate}
            >
              <Text style={styles.updateButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '100%',
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariantAlpha,
    ...theme.elevation.floatingShadow,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  maybeLater: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundInteractive,
  },
  maybeLaterText: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  updateButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryAccent,
  },
  updateButtonText: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.onPrimary,
  },
});
