import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import AudioWave from '../../ui/AudioWave';
import { usePlayerLogic } from './Player.logic';
import { styles } from './Player.styles';

export const Player = () => {
  const {
    router,
    activeItem,
    status,
    error,
    progress,
    duration,
    togglePlayback,
    seek,
    formatTime,
    youtubeId,
    thumbnailUrl,
  } = usePlayerLogic();

  if (status === 'error' && error) {
    return (
      <View style={[styles.container, styles.emptyBox]}>
        <Text style={[theme.typography.headline, { color: theme.colors.error }]}>⚠️ Playback Error</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: theme.colors.primaryAccent }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeItem) {
    return (
      <View style={[styles.container, styles.emptyBox]}>
        <Text style={{ color: theme.colors.textSecondary }}>No song playing</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={{ color: theme.colors.primaryAccent }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.label, styles.headerLabel]}>NOW PLAYING</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Artwork Section */}
      <View style={styles.artworkContainer}>
        <View style={styles.artwork}>
          <View style={styles.artworkInner}>
            {youtubeId ? (
              <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[theme.colors.primaryAccentDim, theme.colors.secondaryAccent]}
                style={styles.glowDisc}
              />
            )}
            <View style={styles.discOverlay}>
              {!youtubeId && <Text style={[theme.typography.headline, { color: 'white', opacity: 0.1, fontSize: 80 }]}>SONIC</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={[theme.typography.displayMedium, styles.title]} numberOfLines={2}>
          {activeItem?.title}
        </Text>
        <Text style={[theme.typography.body, styles.artist]}>
          Sonic Library
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
        <AudioWave
          isPlaying={status === 'playing'}
          barColor={theme.colors.secondaryAccent}
          count={15}
          barWidth={6}
          maxHeight={40}
          gap={4}
        />
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={progress}
          onSlidingComplete={seek}
          minimumTrackTintColor={theme.colors.secondaryAccent}
          maximumTrackTintColor="rgba(255,255,255,0.1)"
          thumbTintColor={theme.colors.secondaryAccent}
        />
        <View style={styles.timeLabels}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        <TouchableOpacity>
          <Shuffle color={theme.colors.textMuted} size={20} />
        </TouchableOpacity>

        <View style={styles.mainControls}>
          <TouchableOpacity>
            <SkipBack color={theme.colors.textPrimary} size={32} fill={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={togglePlayback}
            disabled={status === 'loading'}
          >
            {status === 'playing' ? (
              <Pause color="black" size={32} fill="black" />
            ) : (
              <Play color="black" size={32} fill="black" />
            )}
          </TouchableOpacity>

          <TouchableOpacity>
            <SkipForward color={theme.colors.textPrimary} size={32} fill={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Repeat color={theme.colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
