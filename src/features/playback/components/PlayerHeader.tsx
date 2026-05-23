import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { ChevronDown, MoreVertical } from 'lucide-react-native';

interface PlayerHeaderProps {
    onBack: () => void;
    insetsTop: number;
    onMorePress?: () => void;
}

export const PlayerHeader = React.memo(({ onBack, insetsTop, onMorePress }: PlayerHeaderProps) => {
    return (
        <View
            className="flex-row items-center justify-between px-5 h-16 w-full"
            style={{ paddingTop: insetsTop }}
        >
            <TouchableOpacity onPress={onBack} className="h-12 w-12 items-center justify-center">
                <ChevronDown color="white" size={32} />
            </TouchableOpacity>

            <View className="flex-1 items-center">
                <Text className="text-[11px] font-display tracking-widest text-white/80 uppercase">
                    SONIC
                </Text>
            </View>

            <TouchableOpacity onPress={onMorePress} className="h-12 w-12 items-center justify-center">
                <MoreVertical color="white" size={24} />
            </TouchableOpacity>
        </View>
    );
});
