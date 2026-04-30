import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Vertical List Skeleton ──────────────────────────────────────────────────

const VerticalSkeletonRow = React.memo(() => (
    <View className="flex-row items-center px-4 py-2">
        <Skeleton className="w-12 h-12 rounded-md mr-3" />
        <View className="flex-1 gap-y-2">
            <Skeleton className="h-4 w-3/5 rounded-full" />
            <Skeleton className="h-3 w-2/5 rounded-full" />
        </View>
        <Skeleton className="w-8 h-8 rounded-full" />
    </View>
));

VerticalSkeletonRow.displayName = 'VerticalSkeletonRow';

// ─── Horizontal Big Card Skeleton ───────────────────────────────────────────

const HorizontalSkeletonCard = React.memo(() => (
    <View className="w-40 mr-4">
        <Skeleton className="w-40 h-40 rounded-xl mb-3" />
        <Skeleton className="h-4 w-4/5 rounded-full mb-2" />
        <Skeleton className="h-3 w-3/5 rounded-full" />
    </View>
));

HorizontalSkeletonCard.displayName = 'HorizontalSkeletonCard';

// ─── FeedSkeleton Orchestrator ──────────────────────────────────────────────

interface FeedSkeletonProps {
    rows?: number;
    horizontal?: boolean;
}

const FeedSkeleton = React.memo(({ rows = 5, horizontal = false }: FeedSkeletonProps) => {
    if (horizontal) {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4 py-2">
                {Array.from({ length: rows }).map((_, i) => (
                    <HorizontalSkeletonCard key={i} />
                ))}
            </ScrollView>
        );
    }

    return (
        <View>
            {Array.from({ length: rows }).map((_, i) => (
                <VerticalSkeletonRow key={i} />
            ))}
        </View>
    );
});

FeedSkeleton.displayName = 'FeedSkeleton';

export default FeedSkeleton;
