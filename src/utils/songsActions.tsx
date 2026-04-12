import { ActionItem as DrawerActionItem } from '@/src/components/ui/MusicOptionsDrawer';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export type ActionItem = DrawerActionItem;

export type SongQuickAction = {
    icon: React.ReactNode;
    accessibilityLabel: string;
    onPress: () => void;
};

type LibrarySongActionsParams = {
    onClose: () => void;
    onRemove?: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
};

type RecentSongActionsParams = {
    onClose: () => void;
    onOpenAddToPlaylist: () => void;
    onRemove: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
};

type QueueSongActionsParams = {
    onClose: () => void;
    onRemove: () => void;
    onPlayNext?: () => void;
    onOpenAddToPlaylist?: () => void;
};

export const createLibrarySongActions = ({
    onClose,
    onRemove,
    onPlayNext,
    onAddToQueue,
}: LibrarySongActionsParams): ActionItem[] => {
    const actions: ActionItem[] = [
        {
            label: 'Share',
            icon: (
                <Ionicons
                    name="share-social-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: onClose,
        },
        {
            label: 'Add to other playlist',
            icon: (
                <Ionicons
                    name="add-circle-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: onClose,
        },
        {
            label: 'Play Next',
            icon: (
                <Ionicons
                    name="play-forward-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: () => {
                onClose();
                onPlayNext?.();
            },
        },
        {
            label: 'Add to Queue',
            icon: (
                <Ionicons
                    name="list-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: () => {
                onClose();
                onAddToQueue?.();
            },
        },
        {
            label: 'Go to artist',
            icon: (
                <Ionicons
                    name="person-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: onClose,
        },
    ];

    if (onRemove) {
        actions.push({
            label: 'Remove',
            icon: (
                <Ionicons
                    name="trash-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.error}
                />
            ),
            onPress: () => {
                onClose();
                onRemove();
            },
        });
    }

    return actions;
};

export const createRecentSongActions = ({
    onClose,
    onOpenAddToPlaylist,
    onRemove,
    onPlayNext,
    onAddToQueue,
}: RecentSongActionsParams): {
    actions: ActionItem[];
    trailingActions: SongQuickAction[];
} => {
    return {
        actions: [
            {
                label: 'Add to playlist',
                icon: (
                    <Ionicons
                        name="add-circle-outline"
                        size={theme.spacing.lg}
                        color={theme.colors.textPrimary}
                    />
                ),
                onPress: () => {
                    onClose();
                    setTimeout(() => {
                        onOpenAddToPlaylist();
                    }, 180);
                },
            },
            {
                label: 'Play Next',
                icon: (
                    <Ionicons
                        name="play-forward-outline"
                        size={theme.spacing.lg}
                        color={theme.colors.textPrimary}
                    />
                ),
                onPress: () => {
                    onClose();
                    onPlayNext?.();
                },
            },
            {
                label: 'Add to Queue',
                icon: (
                    <Ionicons
                        name="list-outline"
                        size={theme.spacing.lg}
                        color={theme.colors.textPrimary}
                    />
                ),
                onPress: () => {
                    onClose();
                    onAddToQueue?.();
                },
            },
            {
                label: 'Share',
                icon: (
                    <Ionicons
                        name="share-social-outline"
                        size={theme.spacing.lg}
                        color={theme.colors.textPrimary}
                    />
                ),
                onPress: onClose,
            },
        ],
        trailingActions: [
            {
                accessibilityLabel: 'Remove recent song',
                onPress: onRemove,
                icon: (
                    <Ionicons
                        name="close"
                        size={theme.spacing.lg}
                        color={theme.colors.textSecondary}
                    />
                ),
            },
        ],
    };
};

export const createQueueSongActions = ({
    onClose,
    onRemove,
    onPlayNext,
    onOpenAddToPlaylist,
}: QueueSongActionsParams): ActionItem[] => {
    const actions: ActionItem[] = [
        {
            label: 'Play Next',
            icon: (
                <Ionicons
                    name="play-forward-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: () => {
                onClose();
                onPlayNext?.();
            },
        },
        {
            label: 'Add to playlist',
            icon: (
                <Ionicons
                    name="add-circle-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.textPrimary}
                />
            ),
            onPress: () => {
                onClose();
                setTimeout(() => {
                    onOpenAddToPlaylist?.();
                }, 180);
            },
        },
        {
            label: 'Remove from Queue',
            icon: (
                <Ionicons
                    name="trash-outline"
                    size={theme.spacing.lg}
                    color={theme.colors.error}
                />
            ),
            onPress: () => {
                onClose();
                onRemove();
            },
        },
    ];

    return actions;
};
