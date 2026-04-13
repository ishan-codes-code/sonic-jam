import React from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/theme';

import ExploreGenres from './ExploreGenres';
import ContinueListeningCard from './ContinueListeningCard';
import { styles } from './Home.styles';



import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';

// ── Home Screen ───────────────────────────────────────────────
export const Home = () => {
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* GREETING SECTION */}
        <View style={styles.greetingSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.subGreetingText}>Discover something new today</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/home/history')}
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 22, 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}
            >
              <History color={theme.colors.textPrimary} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* NOW PLAYING / CONTINUE LISTENING SECTION */}
        <ContinueListeningCard />

        {/* GENRE CARDS SECTION */}
        <ExploreGenres />

        {/* Extra padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};


