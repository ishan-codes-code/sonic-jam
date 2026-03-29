import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FakeProgressPosition = "top" | "bottom" | "float";

export interface FakeProgressFlashMessageProps {
  /** Tie to your request's loading state. Progress runs while true, completes when false. */
  visible: boolean;
  /** Pass true to show the error state (stops fake progress, shows ✕ then slides out) */
  error?: boolean;
  /** Error message to display. Defaults to "Something went wrong." */
  errorMessage?: string;
  /** Called after hide animation finishes */
  onDismiss?: () => void;
  /** float (default) | top | bottom */
  position?: FakeProgressPosition;
  /** Extra offset in px */
  offset?: number;
  /**
   * Estimated total duration of your request in ms.
   * Fake progress will reach ~88% by this time, then jump to 100% when visible → false.
   * Default: 150_000 (2.5 min)
   */
  estimatedDurationMs?: number;
}

// ─── Stages ───────────────────────────────────────────────────────────────────
// Each stage defines the label shown and what % of total time it occupies.
// Progress within a stage runs from its startPct to endPct linearly.

interface Stage {
  label: string;
  /** Fraction of total estimated duration this stage takes (must sum to 1.0) */
  weight: number;
  /** Progress % at the START of this stage */
  startPct: number;
  /** Progress % at the END of this stage (fake — never reaches 100 until real done) */
  endPct: number;
  /** Background tint */
  background: string;
  /** Accent / bar color */
  accent: string;
}

const STAGES: Omit<Stage, "startPct" | "endPct">[] = [
  // pct boundaries are now purely visual labels — time is driven by the global curve
  { label: "Initializing…", weight: 0.04, background: "#2C2C2E", accent: "#AEAEB2" },
  { label: "Connecting…", weight: 0.06, background: "#0A1F3D", accent: "#5AC8FA" },
  { label: "Fetching data…", weight: 0.06, background: "#0D2E1A", accent: "#34C759" },
  { label: "Uploading…", weight: 0.22, background: "#0A2A3D", accent: "#5AC8FA" },
  { label: "Processing…", weight: 0.30, background: "#1A1A3D", accent: "#9B8AFB" },
  { label: "Extracting…", weight: 0.24, background: "#1A0D3D", accent: "#C084FC" },
  { label: "Finalizing…", weight: 0.08, background: "#2C1A0D", accent: "#FF9F0A" },
];

const FAKE_MAX = 88;
const STAGES_WITH_PCT: Stage[] = (() => {
  let cursor = 0;
  return STAGES.map((s) => {
    const startPct = Math.round(cursor * FAKE_MAX);
    cursor += s.weight;
    const endPct = Math.round(cursor * FAKE_MAX);
    return { ...s, startPct, endPct };
  });
})();

// ─── Two-phase global curve ───────────────────────────────────────────────────
//
//  Phase 1 — FAST: 0 → 50%  in FAST_MS  (~10s)
//    Uses easeOutQuart: rockets off the start, decelerates into 50%
//
//  Phase 2 — SLOW: 50 → 88% over the rest of estimatedDurationMs
//    Uses easeInQuad: starts already slow, gets even slower near 88%
//    (mimics a real upload/process that "gets stuck" near the end)
//
const FAST_MS = 10_000;   // time to reach 50%
const FAST_TARGET = 50;     // % at end of phase 1

function globalProgress(elapsedMs: number, totalMs: number): number {
  if (elapsedMs <= FAST_MS) {
    // Phase 1: easeOutQuart — fast start, smooth arrival at 50%
    const t = elapsedMs / FAST_MS;
    const eased = 1 - Math.pow(1 - t, 4);
    return eased * FAST_TARGET;
  } else {
    // Phase 2: easeInQuad — slow and getting slower toward FAKE_MAX
    const slowMs = totalMs - FAST_MS;
    const t = Math.min((elapsedMs - FAST_MS) / slowMs, 1);
    const eased = t * t; // easeInQuad — accelerates slowness
    return FAST_TARGET + eased * (FAKE_MAX - FAST_TARGET);
  }
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 1 },
});

// ─── Pulsing dot ──────────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity, marginRight: 8 }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FakeProgressFlashMessage({
  visible,
  error = false,
  errorMessage = "Something went wrong.",
  onDismiss,
  position = "float",
  offset = 0,
  estimatedDurationMs = 150_000,
}: FakeProgressFlashMessageProps) {
  const isBottom = position === "bottom";
  const isFloat = position === "float";

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

  // ── slide in / out ────────────────────────────────────────────────────────
  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const slideOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isFloat ? -10 : isBottom ? 60 : -60,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onDismiss?.(); });
  }, [isBottom, isFloat, onDismiss]);

  // ── fake progress ticker ──────────────────────────────────────────────────
  const startFakeProgress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const TICK_MS = 100; // fast tick for smooth animation
    const startTime = Date.now();

    stageIdxRef.current = 0;
    progressRef.current = 0;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(FAKE_MAX, globalProgress(elapsed, estimatedDurationMs));

      progressRef.current = newProgress;
      setProgress(Math.round(newProgress));

      // Update stage label based on which % band we're in
      const stageIdx = STAGES_WITH_PCT.findIndex(
        (s) => newProgress >= s.startPct && newProgress < s.endPct
      );
      const resolvedIdx = stageIdx === -1 ? STAGES_WITH_PCT.length - 1 : stageIdx;
      if (resolvedIdx !== stageIdxRef.current) {
        stageIdxRef.current = resolvedIdx;
        setStageIdx(resolvedIdx);
      }

      // Cap — stop ticking once we hit FAKE_MAX, wait for real signal
      if (newProgress >= FAKE_MAX) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, TICK_MS);
  }, [estimatedDurationMs]);

  const stopFakeProgress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // ── error sequence ────────────────────────────────────────────────────────
  const runError = useCallback(() => {
    stopFakeProgress();
    setFailed(true);
    setCompleting(false);
    // Show error for 2s then slide out
    setTimeout(slideOut, 2000);
  }, [stopFakeProgress, slideOut]);

  // ── completion sequence ───────────────────────────────────────────────────
  // When visible flips false: jump to 100%, show ✓ briefly, then slide out
  const runCompletion = useCallback(() => {
    stopFakeProgress();
    setCompleting(true);
    setStageIdx(STAGES_WITH_PCT.length - 1);

    // Animate to 100% quickly then show done state
    let p = progressRef.current;
    const jump = setInterval(() => {
      p = Math.min(100, p + 4);
      setProgress(Math.round(p));
      if (p >= 100) {
        clearInterval(jump);
        setCompleting(false);
        setDone(true);
        // Show ✓ for 900ms then slide out
        setTimeout(slideOut, 900);
      }
    }, 40);
  }, [stopFakeProgress, slideOut]);

  // ── visibility effect ─────────────────────────────────────────────────────
  const wasVisible = useRef(false);
  const hasErrored = useRef(false);

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
      if (hasErrored.current) return; // already handled
      runCompletion();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible]);

  // React to error prop flipping true while visible
  useEffect(() => {
    if (error && wasVisible.current && !hasErrored.current) {
      hasErrored.current = true;
      runError();
    }
  }, [error]);

  // ── derived display values ────────────────────────────────────────────────
  const stage = STAGES_WITH_PCT[stageIdx];

  const displayLabel = failed
    ? errorMessage
    : done
      ? "Complete!"
      : completing
        ? "Finishing up…"
        : stage.label;

  const displayBg = failed ? "#3D0D0A" : done ? "#0D2E1A" : stage.background;
  const displayAccent = failed ? "#FF453A" : done ? "#34C759" : stage.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        isFloat
          ? { bottom: "25%" }
          : isBottom
            ? { bottom: 24 + offset }
            : { top: (Platform.OS === "ios" ? 80 : 48) + offset },
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: displayBg,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Icon / spinner */}
        {done ? (
          <Text style={[styles.doneIcon, { color: displayAccent }]}>✓</Text>
        ) : failed ? (
          <Text style={[styles.doneIcon, { color: displayAccent }]}>✕</Text>
        ) : (
          <PulsingDot color={displayAccent} />
        )}

        {/* Label */}
        <Text style={styles.label} numberOfLines={1}>
          {displayLabel}
        </Text>

        {/* Progress % — hide on done/failed */}
        {!done && !failed && (
          <Text style={[styles.pct, { color: displayAccent }]}>{progress}%</Text>
        )}
      </View>

      {/* Progress bar */}
      <ProgressBar progress={progress} color={displayAccent} />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 40,
    right: 40,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  pct: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  doneIcon: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },
});