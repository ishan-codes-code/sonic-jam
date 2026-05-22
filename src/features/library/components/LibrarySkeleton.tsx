import React from 'react';
import { View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/ui/skeleton';
import { LibraryHeader } from './LibraryHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SKELETON_WIDTH = (SCREEN_WIDTH - 48) / 3;

export const LibrarySkeleton = () => {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <LibraryHeader
        onAddPress={() => { }}
      />
      <View className="px-4">
        {/* Favorites Skeleton */}
        <Skeleton className="h-28 w-full rounded-2xl mb-6" />

        {/* Playlists Skeleton */}
        <View className="flex-row flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <View key={i} style={{ width: SKELETON_WIDTH }} className="mb-4">
              <Skeleton className="w-full aspect-square rounded-xl" />
              <Skeleton className="h-3 w-3/4 mt-2 rounded" />
              <Skeleton className="h-2 w-1/2 mt-1 rounded" />
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};
