import React from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExploreGenres from './ExploreGenres';
import ContinueListeningCard from './ContinueListeningCard';
import { styles } from './Home.styles';




// ── Home Screen ───────────────────────────────────────────────
export const Home = () => {

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
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          <Text style={styles.subGreetingText}>Discover something new today</Text>
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


