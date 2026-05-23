import type { RemoteSongListCardAction } from "@/components/RemoteSongListCard";
import { Icon } from "@/components/ui/icon";
import { useBottomSheet } from "@/features/drawer";
import { useJobStore, usePlayer, type JobItem } from "@/features/playback";
import { ListEnd, ListMusic, Play, PlusCircle, Trash2 } from "lucide-react-native";
import { useCallback } from "react";
import ProcessingPlaylistDrawer from "../../library/components/AddToPlaylistDrawer";
import AddToPlaylistDrawer from "../../library/components/AddToPlaylistDrawer";

/**
 * Hook to manage common actions for processing jobs (Play, Queue, Remove, etc.)
 */
export function useJobActions() {
  const { open } = useBottomSheet();
  const { play, playNext, addToQueue } = usePlayer();
  const removeJob = useJobStore((state) => state.removeJob);

  const openAddToPlaylist = useCallback(
    (job: JobItem) => {
      if (!job.song) return;

      open(
        <AddToPlaylistDrawer songId={job.song.id} title={job.song.trackName} subtitle={job.song.artists?.map((a: any) => a.name).join(', ')} image={job.song.image} />,
        ["55%", "82%"]
      );
    },
    [open]
  );

  const getCompletedActions = useCallback(
    (job: JobItem): RemoteSongListCardAction[] => {
      if (!job.song) return [];

      const songId = job.song.id;

      return [
        {
          label: "Play now",
          icon: <Icon as={Play} size={18} className="mr-2" />,
          onPress: () => void play({ songId }),
        },
        {
          label: "Play next",
          icon: <Icon as={ListEnd} size={18} className="mr-2" />,
          onPress: () => void playNext({ songId }),
        },
        {
          label: "Add to queue",
          icon: <Icon as={ListMusic} size={18} className="mr-2" />,
          onPress: () => void addToQueue({ songId }),
        },
        {
          label: "Add to playlist",
          icon: <Icon as={PlusCircle} size={18} className="mr-2" />,
          onPress: () => openAddToPlaylist(job),
        },
        {
          label: "Remove",
          icon: <Icon as={Trash2} size={18} className="mr-2 text-destructive" />,
          onPress: () => removeJob(job.jobId),
        },
      ];
    },
    [addToQueue, openAddToPlaylist, play, playNext, removeJob]
  );

  const handlePlay = useCallback(
    (job: JobItem) => {
      if (!job.song) return;
      void play({ songId: job.song.id });
    },
    [play]
  );

  return {
    getCompletedActions,
    handlePlay,
    openAddToPlaylist,
    removeJob,
  };
}
