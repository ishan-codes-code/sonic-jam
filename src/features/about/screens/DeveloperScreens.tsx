import React from 'react';
import { ScrollView, View, StatusBar, Pressable, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// import { ChevronLeft, Github, Twitter, Linkedin, Mail } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { ArrowLeft, ChevronLeft, Mail } from 'lucide-react-native';
import { SOCIALS } from '../utils/developersSocials';
import { Image } from 'expo-image';
import AnimatedPressable from '@/components/AnimatedPressable';
import { Icon } from '@/components/ui/icon';


export default function DeveloperScreen() {
    const router = useRouter();

    const handleContact = () => {
        Linking.openURL('mailto:dev.srivastava.ishan@gmail.com?subject=Hey from Sonic&body=Hi Ishan,');
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-background">
            {/* Back */}
            <View className="flex-row items-center gap-4 px-5 pb-6 pt-3">
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    activeOpacity={0.8}
                    onPress={() => router.back()}
                    className="h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-card"
                >
                    <Icon as={ArrowLeft} size={24} className="text-foreground" />
                </TouchableOpacity>
                <Text className="text-xl font-display text-foreground">Developers</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            >


                {/* Avatar */}
                <Image
                    source={require("../../../../assets/images/dev.png")}
                    style={{ width: 220, height: 220, marginHorizontal: "auto" }}
                    contentFit="contain"
                />

                {/* Name */}
                <Text className="mb-5 text-center text-2xl font-display text-foreground">
                    Ishan
                </Text>


                {/* Quote card */}
                <View className="mb-8 w-full overflow-hidden rounded-2xl border border-border bg-card">
                    <View className="absolute bottom-0 left-0 top-0 w-[3px] bg-amber-300" />
                    <View className="px-5 py-5">
                        <Text className="font-serif text-4xl leading-none text-muted-foreground">"</Text>
                        <Text className="text-[14px] leading-7 font-heading text-muted-foreground">
                            I built Sonic because every music app felt like it was designed for someone else.
                            This one's for us — the people who actually care about how music feels.
                        </Text>
                    </View>
                </View>

                {/* Socials */}
                <Text className="mb-3 text-[10px] font-heading uppercase text-muted-foreground/50">
                    Socials
                </Text>


                {/* Socials */}
                <View className="mb-9 flex-row gap-2.5 ">
                    {SOCIALS.map(({ icon: Icon, iconName, name, link }) => {
                        return (
                            <AnimatedPressable
                                key={name}
                                onPress={() => Linking.openURL(link)}
                                hitSlopSize={12}
                                scaleTo={0.82}
                                feedback="snappy"
                                className="h-[42px] w-[42px] items-center justify-center rounded-xl border border-border bg-card"
                            >
                                <Icon name={iconName as any} size={17} color="#ccc" />
                            </AnimatedPressable>
                        );
                    })}


                </View>

                <View className="mb-6 h-px w-full bg-white/[0.04]" />

                {/* Contact CTA */}
                <Pressable
                    onPress={handleContact}
                    className="w-full flex-row items-center justify-center gap-2.5 rounded-2xl bg-amber-300 py-[17px]"
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                    <Mail color="#0a0a0a" size={16} strokeWidth={2} />
                    <Text className="text-[15px] font-bold text-[#0a0a0a]">Send a message</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}