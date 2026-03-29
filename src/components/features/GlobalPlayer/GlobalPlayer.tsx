import { LinearGradient } from 'expo-linear-gradient';
import { MonitorSpeaker, Music, Pause, Play, Plus } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../theme';
import { useGlobalPlayerLogic } from './GlobalPlayer.logic';
import { styles } from './GlobalPlayer.styles';

export const GlobalPlayer = () => {
  const {
    displayTitle,
    displayYoutubeId,
    isVisible,
    status,
    progressPercent,
    handleToggle,
    openFullPlayer,
  } = useGlobalPlayerLogic();

  if (!isVisible) return null;

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={openFullPlayer}
        style={styles.miniPlayer}
      >
        <LinearGradient
          colors={[theme.colors.backgroundCard, theme.colors.backgroundSection]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.contentWrap}>
          {/* Progress Line (bottom) */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.playerInfo}>
            <View style={styles.albumArt}>
              {displayYoutubeId ? (
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${displayYoutubeId}/hqdefault.jpg` }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[theme.colors.backgroundInteractive, theme.colors.backgroundCard]}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {!displayYoutubeId && <Music color="white" size={16} opacity={0.5} />}
            </View>

            <View style={styles.textStack}>
              <Text style={styles.title} numberOfLines={1}>
                {displayTitle}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                Sonicjam Music
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn}>
                <MonitorSpeaker color="white" size={20} opacity={0.8} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn}>
                <Plus color="white" size={24} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToggle} style={styles.playWrap}>
                {status === 'playing' ? (
                  <Pause color="white" fill="white" size={22} />
                ) : (
                  <Play color="white" fill="white" size={22} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};
