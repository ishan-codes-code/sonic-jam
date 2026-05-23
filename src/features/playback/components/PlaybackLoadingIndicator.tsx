import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useJobStore } from '../store/useJobStore';
import { useJobProgress } from '@/features/processing/hooks/useJobProgress';
import type { JobItem } from '../store/useJobStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CircularProgress({
  progress,
  size = 40,
  strokeWidth = 3,
  color = 'white',
  trackColor = 'rgba(255, 255, 255, 0.2)',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedProgress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }], justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} animatedProps={animatedProps} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function JobProgressIndicator({ job, color, size }: { job: JobItem, color: string, size: number }) {
  const progress = useJobProgress(job);
  
  return (
    <CircularProgress 
      progress={progress} 
      size={size} 
      color={color} 
      trackColor={color === 'black' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'} 
      strokeWidth={2.5} 
    />
  );
}

export function PlaybackLoadingIndicator({ color = 'black', size = 32 }: { color?: string, size?: number }) {
  const pendingJobId = usePlaybackStore((s) => s.pendingJobId);
  const job = useJobStore((s) => pendingJobId ? s.jobs[pendingJobId] : undefined);

  if (!job) {
     return <ActivityIndicator color={color} size={size >= 32 ? "large" : "small"} />;
  }

  return <JobProgressIndicator job={job} color={color} size={size} />;
}
