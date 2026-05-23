import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Playlist } from '../types';
import { Text } from '@/components/ui/text';
import { ActivityIndicator, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/button';

interface DeletePlaylistDialogProps {
  playlist: Playlist | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export const DeletePlaylistDialog = ({
  playlist,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeletePlaylistDialogProps) => {
  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onConfirm();
  };
  return (
    <AlertDialog
      open={!!playlist}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="bg-card border-border max-w-[85%] rounded-2xl p-6">
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-xl font-display text-foreground text-center">
            Delete Playlist
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground font-heading text-sm text-center leading-relaxed mt-2">
            This action cannot be undone. Are you sure you want to delete <Text className="text-foreground font-heading-medium italic">"{playlist?.name}"</Text>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3 flex-row items-center justify-between">
          <AlertDialogCancel asChild disabled={isDeleting}>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl border-border/20"
            >
              <Text className="text-foreground font-sans-bold text-sm">Cancel</Text>
            </Button>
          </AlertDialogCancel>
          <Button
            onPress={handleConfirm}
            disabled={isDeleting}
            variant="destructive"
            className="flex-1 h-12 rounded-xl"
          >
            {isDeleting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-sans-bold text-sm">Deleting...</Text>
              </View>
            ) : (
              <Text className="text-white font-sans-bold text-sm">Delete</Text>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
