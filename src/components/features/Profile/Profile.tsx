import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Edit2,
  Lock,
  LogOut,
  Music,
  Smartphone,
  Wifi
} from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../ui/AppHeader';
import { GlassCard } from '../../ui/GlassCard';
import { theme } from '../../../theme';
import { useProfileLogic } from './Profile.logic';
import { styles } from './Profile.styles';

export const Profile = () => {
  const {
    user,
    logout,
    losslessEnabled,
    setLosslessEnabled,
    dataSaverEnabled,
    setDataSaverEnabled,
    handleDemoFlash,
  } = useProfileLogic();

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={[theme.colors.secondaryAccent, theme.colors.backgroundBase]}
              style={styles.avatarGlow}
            />
            <Image
              source={{ uri: 'https://i.pravatar.cc/300?u=a042581f4e29026024d' }}
              style={styles.mainAvatar}
            />
            <TouchableOpacity style={styles.editButton}>
              <Edit2 color={theme.colors.onPrimary} size={14} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userSubtitle}>PRO MEMBER • SINCE 2022</Text>
        </View>

        {/* Streaming Preference */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>STREAMING PREFERENCE</Text>

          <GlassCard style={styles.cardContainer}>
            {/* Lossless Audio */}
            <View style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Music color={theme.colors.textPrimary} size={20} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Lossless Audio</Text>
                <Text style={styles.itemSubtitle}>FLAC 24-bit/192kHz</Text>
              </View>
              <Switch
                value={losslessEnabled}
                onValueChange={setLosslessEnabled}
                trackColor={{ false: theme.colors.backgroundInteractive, true: theme.colors.secondaryAccent }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : theme.colors.textPrimary}
              />
            </View>

            <View style={styles.divider} />

            {/* Data Saver */}
            <View style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Wifi color={theme.colors.textPrimary} size={20} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>Data Saver</Text>
                <Text style={styles.itemSubtitle}>Limit usage on cellular networks</Text>
              </View>
              <Switch
                value={dataSaverEnabled}
                onValueChange={setDataSaverEnabled}
                trackColor={{ false: theme.colors.backgroundInteractive, true: theme.colors.secondaryAccent }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : theme.colors.textPrimary}
              />
            </View>
          </GlassCard>
        </View>

        {/* Account & Privacy */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>ACCOUNT & PRIVACY</Text>

          <GlassCard style={styles.cardContainer}>
            {/* Privacy Settings */}
            <TouchableOpacity style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Lock color={theme.colors.textPrimary} size={20} />
              </View>
              <Text style={styles.itemTitleLink}>Privacy Settings</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Notifications */}
            <TouchableOpacity style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Bell color={theme.colors.textPrimary} size={20} />
              </View>
              <Text style={styles.itemTitleLink}>Notifications</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Connected Devices */}
            <TouchableOpacity style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Smartphone color={theme.colors.textPrimary} size={20} />
              </View>
              <Text style={styles.itemTitleLink}>Connected Devices</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.listItem}>
              <View style={styles.iconContainer}>
                <Smartphone color={theme.colors.textPrimary} size={20} />
              </View>
              <Text style={styles.itemTitleLink}>Demo Flash messages</Text>
              <Pressable onPress={handleDemoFlash}>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut color={theme.colors.error} size={20} />
          <Text style={styles.logoutText}>Logout from SonicJam</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>V2.4.0 • PRODUCTION BUILD</Text>

      </ScrollView>
    </SafeAreaView>
  );
};
