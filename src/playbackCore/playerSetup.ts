import TrackPlayer, { Capability, IOSCategory, IOSCategoryMode } from 'react-native-track-player';

let isSetup = false;

export async function setupPlayer(): Promise<boolean> {
    if (isSetup) return true;

    try {
        await TrackPlayer.setupPlayer({
            iosCategory: IOSCategory.Playback,
            iosCategoryMode: IOSCategoryMode.Default,
        });

        await TrackPlayer.updateOptions({
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.JumpForward,
                Capability.JumpBackward,
                Capability.Stop,
                Capability.SeekTo,
            ],
            notificationCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.JumpForward,
                Capability.JumpBackward,
                Capability.Stop,
            ],
            progressUpdateEventInterval: 1,
        });

        isSetup = true;
        return true;
    } catch (error) {
        console.error('[playerSetup] Failed to setup TrackPlayer:', error);
        return false;
    }
}