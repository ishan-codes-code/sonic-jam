import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ProfileAvatar } from '@/features/profile/components';
import { cn } from '@/lib/utils';

interface TabsHeaderProps {
    value: string;
    setValue: (val: string) => void;
}

const TABS = [
    { value: 'feed', label: 'Feed' },
    { value: 'recents', label: 'Recents' },
] as const;

export default function TabHeader({ value, setValue }: TabsHeaderProps) {
    return (
        <View
            className="w-full h-auto flex-row justify-start items-center gap-2 px-1 bg-transparent"
            accessibilityRole="tablist"
        >
            {/* Profile Avatar — navigates to /profile on press */}
            <ProfileAvatar size={35} />

            {TABS.map((tab) => {
                const isActive = value === tab.value;
                return (
                    <Pressable
                        key={tab.value}
                        onPress={() => setValue(tab.value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        className={cn(
                            "px-4 py-1.5 rounded-full border shadow-sm",
                            isActive
                                ? "bg-muted border-muted-foreground/20"
                                : "bg-muted/5 border-muted-foreground/20"
                        )}
                    >
                        <Text
                            className={cn(
                                "font-display text-sm font-semibold",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}