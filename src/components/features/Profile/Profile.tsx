import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { 
  LogOut, 
  User as UserIcon, 
  ShieldCheck
} from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { useProfileLogic } from './Profile.logic';
import { styles } from './Profile.styles';

export const Profile = () => {
  const { user, logout } = useProfileLogic();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.headerSection}>
          <Text style={styles.profileTitle}>Account</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[theme.colors.secondaryAccent, 'transparent']}
            style={styles.avatarGlow}
          />
          <View style={styles.avatarCircle}>
            <UserIcon 
              color={theme.colors.secondaryAccent} 
              size={64} 
              strokeWidth={1.5}
            />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.infoSection}>
          <Text style={styles.userName}>{user?.name || 'Sonic User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@sonicjam.io'}</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.premiumBadge}>
          <ShieldCheck color={theme.colors.secondaryAccent} size={18} />
          <Text style={styles.premiumText}>VERIFIED ACCOUNT</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.7}
          >
            <LogOut color="#ef4444" size={20} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <Text style={styles.versionText}>SONIC v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};
