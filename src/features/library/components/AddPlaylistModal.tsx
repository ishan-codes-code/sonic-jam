import React, { useState, useEffect } from 'react';
import { View, Switch, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Playlist } from '../types';

interface AddPlaylistModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreate?: (data: { name: string; description?: string; isPublic: boolean }) => void;
  onUpdate?: (data: { name?: string; description?: string; isPublic?: boolean }) => void;
  isCreating?: boolean;
  isUpdating?: boolean;
  defaultName?: string;
  playlist?: Playlist | null;
}

export const AddPlaylistModal = ({
  visible,
  onCancel,
  onCreate,
  onUpdate,
  isCreating = false,
  isUpdating = false,
  defaultName = "My Playlist",
  playlist = null
}: AddPlaylistModalProps) => {
  const isEditMode = !!playlist;
  const isPending = isCreating || isUpdating;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (playlist) {
        setName(playlist.name);
        setDescription(playlist.description ?? '');
        setIsPublic(playlist.isPublic);
      } else {
        setName(defaultName);
        setDescription('');
        setIsPublic(false);
      }
      setError(null);
    }
  }, [visible, playlist, defaultName]);

  const hasChanges = isEditMode
    ? name.trim() !== playlist.name ||
    description.trim() !== (playlist.description ?? '') ||
    isPublic !== playlist.isPublic
    : true;

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Playlist name is required');
      return;
    }

    if (isEditMode) {
      if (!hasChanges) {
        onCancel();
        return;
      }

      const updateData: { name?: string; description?: string; isPublic?: boolean } = {};
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();
      const originalDesc = playlist.description ?? '';

      if (trimmedName !== playlist.name) {
        updateData.name = trimmedName;
      }
      if (trimmedDesc !== originalDesc) {
        updateData.description = trimmedDesc;
      }
      if (isPublic !== playlist.isPublic) {
        updateData.isPublic = isPublic;
      }

      if (onUpdate) {
        onUpdate(updateData);
      }
    } else {
      if (onCreate) {
        onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        });
      }
    }
  };

  return (
    <AlertDialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-[425px] bg-background border-border shadow-2xl">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="gap-6"
        >
          <AlertDialogHeader className="gap-2">
            <AlertDialogTitle className="text-2xl font-display text-foreground">
              {isEditMode ? 'Edit Playlist' : 'New Playlist'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-heading">
              {isEditMode
                ? 'Update your collection details.'
                : 'Create a new collection for your favorite tracks.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <View className="gap-5">
            <View className="gap-2">
              <Text className="text-muted-foreground text-xs font-heading-medium uppercase ml-1 tracking-wider">Playlist Name</Text>
              <Input
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (text.trim()) setError(null);
                }}
                placeholder="My Awesome Playlist"
                className={error ? 'border-destructive' : 'border-border/50 focus:border-amber-300'}
                autoFocus
              />
              {error && <Text className="text-destructive text-[10px] mt-1 ml-1">{error}</Text>}
            </View>

            <View className="gap-2">
              <Text className="text-muted-foreground text-xs font-heading-medium uppercase ml-1 tracking-wider">Description (Optional)</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="What's this playlist about?"
                multiline
                className="min-h-[80px] py-3 h-auto border-border/50 focus:border-amber-300"
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row items-center justify-between bg-accent/30 p-4 rounded-xl border border-border/50">
              <View className="flex-row items-center gap-3">
                <View className="bg-amber-500/20 p-2 rounded-lg">
                  <Ionicons name="globe-outline" size={18} color="#fbbf24" />
                </View>
                <View>
                  <Text className="text-foreground text-sm font-sans-bold">Public Playlist</Text>
                  <Text className="text-muted-foreground text-[10px] font-sans">Others can see this collection</Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#374151', true: '#fbbf24' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
              />
            </View>
          </View>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isPending} className="border-border/50">
              <Text className="font-heading">Cancel</Text>
            </AlertDialogCancel>
            <Button
              onPress={handleSubmit}
              disabled={isPending || !name.trim() || (isEditMode && !hasChanges)}
              className="bg-amber-500 min-w-[100px] shadow-lg shadow-amber-500/20"
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-sans-bold">
                  {isEditMode ? 'Save' : 'Create'}
                </Text>
              )}
            </Button>
          </AlertDialogFooter>
        </KeyboardAvoidingView>
      </AlertDialogContent>
    </AlertDialog>
  );
};
