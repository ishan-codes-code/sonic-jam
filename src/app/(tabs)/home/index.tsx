import HomeFeedScreen from "@/features/home/screens/HomeFeedScreen";
import React, { useCallback } from "react";
import { CleanedSearchResult } from "@/features/search/types";
import { usePlayer } from "@/features/playback";

export default function FeedTab() {
    const { play } = usePlayer();

    const handleSongPress = useCallback((song: CleanedSearchResult) => {
        play({
            trackName: song.title,
            artistName: song.artist,
            image: song.artwork,
            externalId: song.id,
            duration: Number(song.duration),
        });
    }, [play]);

    return <HomeFeedScreen onSongPress={handleSongPress} />;
}
