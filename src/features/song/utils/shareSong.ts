import { MEDIA_URL } from "@/api/apiClient";
import { toastImperative } from "@/features/Toast/utils/toastSingleton";
import { Share } from "react-native";

/**
 * Share a song link via the native share sheet.
 *
 * Constructs a Sonic deep-link URL in the format:
 *   {MEDIA_URL}/song/{id}?isRemote={isRemote}
 *
 * The `isRemote` flag tells the deep-link resolver whether to fetch
 * the song from iTunes (true) or from the app's own backend (false).
 */
export async function shareSong(
  id: string,
  trackName: string,
  isRemote: boolean,
) {
  if (!id || typeof id !== "string" || !id.trim()) {
    toastImperative.show({
      type: "error",
      text1: "Invalid song link",
      visibilityTime: 4000,
    });
    return;
  }
  try {
    const url = `${MEDIA_URL}/song/${id.trim()}?isRemote=${isRemote}`;
    await Share.share({
      title: "Sonic",
      message: `Listening to ${trackName} song on Sonic 🎵\n${url}`,
      url, // mainly for iOS
    });
  } catch (error) {
    toastImperative.show({
      type: "error",
      text1: "Something went wrong",
      visibilityTime: 4000,
    });
  }
}
