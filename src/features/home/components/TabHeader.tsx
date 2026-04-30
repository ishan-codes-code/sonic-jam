import { Icon } from '@/components/ui/icon';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { User } from 'lucide-react-native';
import { Dispatch, SetStateAction } from 'react';
import { View } from 'react-native';

interface TabsHeaderProps {
    value: string;
    setValue: Dispatch<SetStateAction<string>>;
}

const TABS = [
    { value: 'feed', label: 'Feed' },
    { value: 'recents', label: 'Recents' },
] as const;

export default function TabHeader({ value, setValue }: TabsHeaderProps) {
    return (
        <TabsList
            className="w-full h-auto justify-start items-center gap-2 px-1 bg-transparent"
            aria-label="Home navigation tabs"
        >
            {/* Avatar trigger */}
            <TabsTrigger
                value="profile"
                className="h-10 w-10 rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground shadow-sm"
            >
                <View className="w-10 h-10 rounded-full bg-secondary items-center justify-center overflow-hidden">
                    <Icon as={User} className="w-4 h-4 bg-muted" />
                </View>
            </TabsTrigger>

            {TABS.map((tab) => (
                <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="px-3 py-2 rounded-2xl data-[state=active]:bg-indigo-500 data-[state=active]:text-foreground shadow-sm"
                >
                    <Text className="font-display text-md">{tab.label}</Text>
                </TabsTrigger>
            ))}
        </TabsList>
    );
}