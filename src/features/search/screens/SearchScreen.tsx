import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Camera } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { SearchScreenState } from '../types';
import ExploreGenres from '../components/ExploreGenres';
import { ProfileAvatar } from '@/features/profile/components';


function SearchScreen({ searchFocus, setSearchFocus }: SearchScreenState) {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Header Top Row */}
                <View className="px-4 pt-2 pb-6 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <ProfileAvatar size={36} />

                        <Text variant="h1" className="text-2xl font-display text-foreground">Search</Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Camera size={26} color="#ffffff" />
                    </TouchableOpacity>
                </View>

                {/* Fake Search Bar Button */}
                <View className="px-4 pb-6">
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setSearchFocus(true)}
                        className="flex-row items-center bg-white rounded-md h-14 px-4 shadow-sm"
                    >
                        <Search size={24} color="#18181b" strokeWidth={2.5} className="mr-3" />
                        <Text className="text-[#18181b] text-[17px] font-semibold font-sans">
                            What do you want to listen to?
                        </Text>
                    </TouchableOpacity>
                </View>


                {/* Dynamic Genre Grid */}
                <ExploreGenres />

            </ScrollView>
        </SafeAreaView>
    );
}

export default SearchScreen;
