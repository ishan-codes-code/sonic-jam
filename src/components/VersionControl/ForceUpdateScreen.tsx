import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, AlertCircle, Rocket } from 'lucide-react-native';
import { useVersionStore } from '../../store/versionStore';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Gradients } from '../../theme/gradients';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        colors={['#0F172A', '#1E293B', '#020617']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Rocket color="#FCD34D" size={48} />
          </View>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.subtitle}>
            {message || "We've released a new version with critical improvements and new features."}
          </Text>
        </View>

        <View style={styles.card}>
          <AlertCircle color="#94A3B8" size={24} style={styles.cardIcon} />
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
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Download color="#FFFFFF" size={20} />
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
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardIcon: {
    marginRight: 16,
  },
  cardText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  versionInfo: {
    marginTop: 20,
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
