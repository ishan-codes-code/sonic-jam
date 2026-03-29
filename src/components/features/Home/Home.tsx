import { LinearGradient } from 'expo-linear-gradient';
import {
  Menu,
  MoreVertical,
  Play,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward
} from 'lucide-react-native';
import React from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GlassCard } from '../../ui/GlassCard';
import { GradientText } from '../../ui/GradientText';
import { theme } from '../../../theme';
import { ARTISTS, QUICK_MIXES, RECENTLY_PLAYED } from './Home.constants';
import { styles } from './Home.styles';

export const Home = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity>
            <Menu color={theme.colors.textPrimary} size={28} />
          </TouchableOpacity>
          <GradientText
            text="SONICJAM"
            style={[theme.typography.headline, { letterSpacing: 2 }]}
          />
          <View style={styles.headerRight}>
            <TouchableOpacity style={{ marginRight: theme.spacing.md }}>
              <Search color={theme.colors.textPrimary} size={24} />
            </TouchableOpacity>
            <Image
              source={{ uri: 'https://i.pravatar.cc/100?u=ishan' }}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* GREETING SECTION */}
        <View style={styles.section}>
          <Text style={[theme.typography.displayMedium, { color: theme.colors.textPrimary }]}>
            Good Evening, Ishan
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            Ready to find your flow today?
          </Text>
        </View>

        {/* TRENDING HERO CARD */}
        <View style={styles.section}>
          <ImageBackground
            source={require('../../../../assets/images/hero_midnight_synth.png')}
            style={styles.heroCard}
            imageStyle={{ borderRadius: theme.radius.lg }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
              style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
            />
            <View style={styles.heroContent}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>TRENDING NOW</Text>
              </View>
              <Text style={[theme.typography.displayMedium, styles.heroTitle]}>
                Neon Midnight{"\n"}Synthesis
              </Text>
              <TouchableOpacity>
                <LinearGradient
                  colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroCTA}
                >
                  <Text style={styles.heroCTAText}>Listen Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* RECENTLY PLAYED */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Recently Played</Text>
            <TouchableOpacity>
              <Text style={[theme.typography.label, { color: theme.colors.primaryAccent }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {RECENTLY_PLAYED.map((item) => (
              <View key={item.id} style={styles.albumItem}>
                <Image source={item.artwork} style={styles.albumArt} />
                <Text style={[theme.typography.title, { color: theme.colors.textPrimary, marginTop: 12 }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[theme.typography.metadata, { color: theme.colors.textSecondary }]}>
                  {item.artist}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* NOW PLAYING / CONTINUE LISTENING */}
        <View style={styles.section}>
          <GlassCard glow style={styles.continueCard}>
            <Text style={[theme.typography.label, { color: theme.colors.secondaryAccent, marginBottom: 12 }]}>
              CONTINUE LISTENING
            </Text>

            <View style={styles.playerPanel}>
              <Image
                source={require('../../../../assets/images/album_star_gazer.png')}
                style={styles.playerArt}
              />
              <View style={styles.playerMeta}>
                <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
                  Midnight Melancholy
                </Text>
                <Text style={[theme.typography.metadata, { color: theme.colors.textSecondary }]}>
                  Project X feat. Elara
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBar, { width: '45%' }]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>02:45</Text>
                <Text style={styles.timeText}>04:12</Text>
              </View>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity><Shuffle color={theme.colors.textSecondary} size={20} /></TouchableOpacity>
              <TouchableOpacity><SkipBack color={theme.colors.textPrimary} size={28} /></TouchableOpacity>
              <TouchableOpacity style={styles.playBtnLarge}>
                <Play color="black" size={24} fill="black" />
              </TouchableOpacity>
              <TouchableOpacity><SkipForward color={theme.colors.textPrimary} size={28} /></TouchableOpacity>
              <TouchableOpacity><Repeat color={theme.colors.textSecondary} size={20} /></TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* SMART MIX */}
        <View style={styles.section}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Smart Mix</Text>
          <Text style={[theme.typography.metadata, { color: theme.colors.textSecondary }]}>Personalized for you</Text>

          <View style={styles.gridContainer}>
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <View style={styles.gridSquare}><Image source={require('../../../../assets/images/album_analog_dreams.png')} style={styles.fullImage} /></View>
                <View style={[styles.gridSquare, { backgroundColor: '#333' }]} />
              </View>
              <View style={styles.gridRow}>
                <View style={[styles.gridSquare, { backgroundColor: '#444' }]} />
                <View style={[styles.gridSquare, styles.moreSquare]}>
                  <Text style={[theme.typography.headline, { color: theme.colors.primaryAccent }]}>+12</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.generateBtn}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Generate New Mix</Text>
          </TouchableOpacity>
        </View>

        {/* FAVORITE ARTISTS */}
        <View style={styles.section}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary, marginBottom: 16 }]}>Favorite Artists</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ARTISTS.map(artist => (
              <View key={artist.id} style={styles.artistItem}>
                <Image source={artist.image} style={styles.artistAvatar} />
                <Text style={[theme.typography.metadata, { color: theme.colors.textPrimary, marginTop: 8 }]}>
                  {artist.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* QUICK MIX */}
        <View style={styles.section}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary, marginBottom: 16 }]}>Quick Mix</Text>
          {QUICK_MIXES.map(mix => (
            <TouchableOpacity key={mix.id} style={styles.quickMixCard}>
              <View style={[styles.quickMixIcon, { backgroundColor: mix.color }]}>
                {mix.icon}
              </View>
              <View style={styles.quickMixInfo}>
                <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{mix.title}</Text>
                <Text style={[theme.typography.metadata, { color: theme.colors.textSecondary }]}>{mix.tracks}</Text>
              </View>
              <TouchableOpacity>
                <MoreVertical color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Extra padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity style={styles.fab}>
        <LinearGradient
          colors={[theme.colors.primaryAccent, theme.colors.secondaryAccent]}
          style={styles.fabGradient}
        >
          <Play color="black" size={24} fill="black" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};
