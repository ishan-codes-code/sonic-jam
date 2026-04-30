import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { Collection } from '../types';
import { Button } from '@/components/ui/button';
import { Play, Share2, PlusCircle, Shuffle, EllipsisVertical, ListMusic, Plus } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const { width } = Dimensions.get('window');
const HEADER_IMAGE_SIZE = width * 0.6;

interface CollectionHeaderProps {
    collection: Collection;
    baseColor: string;
}

export const CollectionAlbumHeader = React.memo(({ collection, baseColor }: CollectionHeaderProps) => {
    const releaseYear = collection.releaseDate
        ? new Date(collection.releaseDate).getFullYear()
        : '';


    return (
        <View className="items-center pt-8 pb-6 px-4">
            <View
                style={styles.imageContainer}
                className="shadow-2xl shadow-black/50 rounded-lg overflow-hidden bg-secondary/20"
            >
                <Image
                    source={{ uri: collection.artwork }}
                    style={styles.image}
                    contentFit="cover"
                    transition={300}
                />
            </View>

            <View className="mt-8 w-full items-start">
                <Text className="text-xs text-muted-foreground italic ">ALBUM</Text>
                <Text className="text-xl text-foreground font-display" numberOfLines={3}>
                    {collection.title}
                </Text>

                <View className="w-full flex-row items-center mt-2 gap-x-2">
                    <Text className="text-muted-foreground text-xs font-semibold">
                        {collection.artist}
                    </Text>
                    <View className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <Text className="text-muted-foreground text-xs">
                        {collection.tracks.length} songs
                    </Text>
                    {releaseYear && (
                        <>
                            <View className="w-1 h-1 rounded-full bg-muted-foreground" />
                            <Text className="text-muted-foreground text-xs">
                                {releaseYear}
                            </Text>
                        </>
                    )}
                </View>

                <View className="flex-row items-center gap-x-4 mt-6 w-full">
                    <AnimatedPressable
                        className="rounded-full px-4 py-2 flex-row items-center gap-2"
                        feedback="timing"
                        pressedOpacity={0.75}
                        scaleTo={0.98}
                        pressableStyle={{ backgroundColor: baseColor }}
                        onPress={() => { }}
                    >
                        <Text className="font-sans-bold text-sm">Play</Text>
                        <Icon as={Play} size={20} className="fill-white text-white" />
                    </AnimatedPressable>

                    <AnimatedPressable
                        hitSlopSize={12}
                        scaleTo={0.82}
                        feedback="snappy"
                        accessibilityLabel="Shuffle playlist"
                        onPress={() => { }}
                    >
                        <Icon as={Shuffle} size={20} className="text-foreground" />
                    </AnimatedPressable>
                    <AnimatedPressable
                        hitSlopSize={12}
                        scaleTo={0.82}
                        feedback="snappy"
                        accessibilityLabel="Add to playlist"
                        onPress={() => { }}
                    >
                        <Icon as={PlusCircle} size={20} className="text-foreground" />
                    </AnimatedPressable>
                    <AnimatedPressable
                        hitSlopSize={12}
                        scaleTo={0.82}
                        feedback="snappy"
                        accessibilityLabel="Share"
                        onPress={() => { }}
                    >
                        <Icon as={Share2} size={20} className="text-foreground" />
                    </AnimatedPressable>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                                <Icon as={EllipsisVertical} className="text-muted-foreground" size={20} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onPress={() => { }}>
                                    <Icon as={Play} size={18} className="mr-2" />
                                    <Text>Play</Text>
                                </DropdownMenuItem>
                                <DropdownMenuItem onPress={() => { }}>
                                    <Icon as={ListMusic} size={18} className="mr-2" />
                                    <Text>Add to queue</Text>
                                </DropdownMenuItem>
                                <DropdownMenuItem onPress={() => { }}>
                                    <Icon as={Plus} size={18} className="mr-2" />
                                    <Text>Add to playlist</Text>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>



                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    imageContainer: {
        width: HEADER_IMAGE_SIZE,
        height: HEADER_IMAGE_SIZE,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
