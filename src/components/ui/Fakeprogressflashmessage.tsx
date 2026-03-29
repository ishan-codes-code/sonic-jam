import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type FakeProgressPosition = 'top' | 'bottom' | 'float';

export interface FakeProgressFlashMessageProps {
  visible: boolean;
  error?: boolean;
  errorMessage?: string;
  onDismiss?: () => void;
  label?: string;
  progress?: number;
  position?: FakeProgressPosition;
  offset?: number;
  estimatedDurationMs?: number;
}

interface Stage {
  label: string;
  weight: number;
  startPct: number;
  endPct: number;
  background: string;
  accent: string;
}

const STAGES: Omit<Stage, 'startPct' | 'endPct'>[] = [
  { label: 'Initializing...', weight: 0.04, background: '#2C2C2E', accent: '#AEAEB2' },
  { label: 'Connecting...', weight: 0.06, background: '#0A1F3D', accent: '#5AC8FA' },
  { label: 'Fetching data...', weight: 0.06, background: '#0D2E1A', accent: '#34C759' },
  { label: 'Uploading...', weight: 0.22, background: '#0A2A3D', accent: '#5AC8FA' },
  { label: 'Processing...', weight: 0.30, background: '#1A1A3D', accent: '#9B8AFB' },
  { label: 'Extracting...', weight: 0.24, background: '#1A0D3D', accent: '#C084FC' },
  { label: 'Finalizing...', weight: 0.08, background: '#2C1A0D', accent: '#FF9F0A' },
];

const FAKE_MAX = 88;
const FAST_MS = 10_000;
const FAST_TARGET = 50;

const STAGES_WITH_PCT: Stage[] = (() => {
  let cursor = 0;
  return STAGES.map((stage) => {
    const startPct = Math.round(cursor * FAKE_MAX);
    cursor += stage.weight;
    const endPct = Math.round(cursor * FAKE_MAX);
    return { ...stage, startPct, endPct };
  });
})();

function globalProgress(elapsedMs: number, totalMs: number): number {
  if (elapsedMs <= FAST_MS) {
    const t = elapsedMs / FAST_MS;
    const eased = 1 - Math.pow(1 - t, 4);
    return eased * FAST_TARGET;
  }

  const slowMs = Math.max(totalMs - FAST_MS, 1);
  const t = Math.min((elapsedMs - FAST_MS) / slowMs, 1);
  const eased = t * t;
  return FAST_TARGET + eased * (FAKE_MAX - FAST_TARGET);
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity,
        marginRight: 8,
      }}
    />
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 1,
  },
});

export function FakeProgressFlashMessage({
  visible,
  error = false,
  errorMessage = 'Something went wrong.',
  onDismiss,
  label,
  progress: controlledProgress,
  position = 'float',
  offset = 0,
  estimatedDurationMs = 150_000,
}: FakeProgressFlashMessageProps) {
  const isBottom = position === 'bottom';
  const isFloat = position === 'float';

  const slideAnim = useRef(new Animated.Value(isFloat ? 0 : 60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageIdxRef = useRef(0);
  const progressRef = useRef(0);
  const wasVisible = useRef(false);
  const hasErrored = useRef(false);

  const stopFakeProgress = useCallback(() => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, slideAnim]);

  const slideOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isFloat ? -10 : isBottom ? 60 : -60,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss?.();
    });
  }, [isBottom, isFloat, onDismiss, opacityAnim, slideAnim]);

  const syncStageFromProgress = useCallback((nextProgress: number) => {
    const stageIndex = STAGES_WITH_PCT.findIndex(
      (stage) => nextProgress >= stage.startPct && nextProgress < stage.endPct,
    );
    const resolvedIndex =
      stageIndex === -1 ? STAGES_WITH_PCT.length - 1 : stageIndex;

    stageIdxRef.current = resolvedIndex;
    setStageIdx(resolvedIndex);
  }, []);

  const startFakeProgress = useCallback(() => {
    if (typeof controlledProgress === 'number') return;

    stopFakeProgress();

    const tickMs = 100;
    const startTime = Date.now();

    stageIdxRef.current = 0;
    progressRef.current = 0;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(
        FAKE_MAX,
        globalProgress(elapsed, estimatedDurationMs),
      );

      progressRef.current = nextProgress;
      setProgress(Math.round(nextProgress));
      syncStageFromProgress(nextProgress);

      if (nextProgress >= FAKE_MAX) {
        stopFakeProgress();
      }
    }, tickMs);
  }, [controlledProgress, estimatedDurationMs, stopFakeProgress, syncStageFromProgress]);

  const runError = useCallback(() => {
    stopFakeProgress();
    setFailed(true);
    setCompleting(false);
    setTimeout(slideOut, 2_000);
  }, [slideOut, stopFakeProgress]);

  const runCompletion = useCallback(() => {
    stopFakeProgress();
    setCompleting(true);
    setStageIdx(STAGES_WITH_PCT.length - 1);

    let nextProgress = progressRef.current;
    const jump = setInterval(() => {
      nextProgress = Math.min(100, nextProgress + 4);
      progressRef.current = nextProgress;
      setProgress(Math.round(nextProgress));

      if (nextProgress >= 100) {
        clearInterval(jump);
        setCompleting(false);
        setDone(true);
        setTimeout(slideOut, 900);
      }
    }, 40);
  }, [slideOut, stopFakeProgress]);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true;
      hasErrored.current = false;
      setStageIdx(0);
      setProgress(0);
      setCompleting(false);
      setDone(false);
      setFailed(false);
      stageIdxRef.current = 0;
      progressRef.current = 0;
      slideIn();
      startFakeProgress();
    } else if (!visible && wasVisible.current) {
      wasVisible.current = false;
      if (!hasErrored.current) {
        runCompletion();
      }
    }

    return () => {
      stopFakeProgress();
    };
  }, [runCompletion, slideIn, startFakeProgress, stopFakeProgress, visible]);

  useEffect(() => {
    if (!visible || typeof controlledProgress !== 'number') return;

    const nextProgress = Math.max(0, Math.min(100, Math.round(controlledProgress)));
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    syncStageFromProgress(nextProgress);
  }, [controlledProgress, syncStageFromProgress, visible]);

  useEffect(() => {
    if (error && wasVisible.current && !hasErrored.current) {
      hasErrored.current = true;
      runError();
    }
  }, [error, runError]);

  const stage = STAGES_WITH_PCT[stageIdx];
  const displayLabel = failed
    ? errorMessage
    : done
      ? 'Complete!'
      : completing
        ? 'Finishing up...'
        : label ?? stage.label;
  const displayBg = failed ? '#3D0D0A' : done ? '#0D2E1A' : stage.background;
  const displayAccent = failed ? '#FF453A' : done ? '#34C759' : stage.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        isFloat
          ? { bottom: '25%' }
          : isBottom
            ? { bottom: 24 + offset }
            : { top: (Platform.OS === 'ios' ? 80 : 48) + offset },
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: displayBg,
        },
      ]}
    >
      <View style={styles.row}>
        {done ? (
          <Text style={[styles.doneIcon, { color: displayAccent }]}>OK</Text>
        ) : failed ? (
          <Text style={[styles.doneIcon, { color: displayAccent }]}>X</Text>
        ) : (
          <PulsingDot color={displayAccent} />
        )}

        <Text style={styles.label} numberOfLines={1}>
          {displayLabel}
        </Text>

        {!done && !failed ? (
          <Text style={[styles.pct, { color: displayAccent }]}>{progress}%</Text>
        ) : null}
      </View>

      <ProgressBar progress={progress} color={displayAccent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 40,
    right: 40,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  pct: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  doneIcon: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
});
