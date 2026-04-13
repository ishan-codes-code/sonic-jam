import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, X } from 'lucide-react-native';
import { useVersionStore } from '../../store/versionStore';

export const OptionalUpdateModal = () => {
  const { isOptional, updateUrl, message } = useVersionStore();
  const [visible, setVisible] = useState(true);

  if (!isOptional || !visible) return null;

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl).catch(console.error);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setVisible(false)}
          >
            <X color="#94A3B8" size={20} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Sparkles color="#3B82F6" size={32} />
          </View>

          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.description}>
            {message || "A new version of Sonic is available with new features and improvements."}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.maybeLater} 
              onPress={() => setVisible(false)}
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  maybeLaterText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
