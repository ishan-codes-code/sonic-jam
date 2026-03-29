import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlashMessageType =
  | "loading"
  | "uploading"
  | "downloading"
  | "success"
  | "error"
  | "warning"
  | "info";

export type FlashMessagePosition = "top" | "bottom" | "float";

export interface FlashMessageProps {
  visible: boolean;
  message: string;
  type?: FlashMessageType;
  position?: FlashMessagePosition;
  autoDismissMs?: number;
  onDismiss?: () => void;
  dismissible?: boolean;
  progress?: number;
  offset?: number;
}

// ─── Theme config ─────────────────────────────────────────────────────────────

const PERSISTENT_TYPES: FlashMessageType[] = ["loading", "uploading", "downloading"];

interface TypeTheme {
  background: string;
  text: string;
  spinnerColor: string;
  icon?: string;
  progressColor: string;
}

const THEMES: Record<FlashMessageType, TypeTheme> = {
  //                 background   text        spinner/icon  progressBar
  loading: { background: "#2C2C2E", text: "#FFFFFF", spinnerColor: "#AEAEB2", progressColor: "#AEAEB2" },
  uploading: { background: "#0A2A3D", text: "#FFFFFF", spinnerColor: "#5AC8FA", progressColor: "#5AC8FA" },
  downloading: { background: "#0D2E1A", text: "#FFFFFF", spinnerColor: "#34C759", progressColor: "#34C759" },
  success: { background: "#0D2E1A", text: "#FFFFFF", spinnerColor: "#34C759", icon: "✓", progressColor: "#34C759" },
  error: { background: "#3D0D0A", text: "#FFFFFF", spinnerColor: "#FF453A", icon: "✕", progressColor: "#FF453A" },
  warning: { background: "#3D2200", text: "#FFFFFF", spinnerColor: "#FF9F0A", icon: "⚠", progressColor: "#FF9F0A" },
  info: { background: "#0A1F3D", text: "#FFFFFF", spinnerColor: "#5AC8FA", icon: "ℹ", progressColor: "#5AC8FA" },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
    marginTop: 7,
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
        Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity, marginRight: 8 }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlashMessage({
  visible,
  message,
  type = "loading",
  position = "float",
  autoDismissMs,
  onDismiss,
  dismissible,
  progress,
  offset = 0,
}: FlashMessageProps) {
  const theme = THEMES[type];
  const isPersistent = PERSISTENT_TYPES.includes(type);
  const showDismiss = dismissible ?? !isPersistent;
  const isBottom = position === "bottom";
  const isFloat = position === "float";

  const slideAnim = useRef(new Animated.Value(isFloat ? 0 : 60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const slideOut = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(slideAnim, {
        // float fades in place with a tiny upward drift
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
    ]).start(({ finished }) => { if (finished) onDismiss?.(); });
  }, [isBottom, isFloat, onDismiss]);

  useEffect(() => {
    if (visible) {
      slideIn();
      if (autoDismissMs && !isPersistent) {
        timerRef.current = setTimeout(slideOut, autoDismissMs);
      }
    } else {
      slideOut();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  const hasProgress = progress !== undefined && (type === "uploading" || type === "downloading");

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.pill,
        isFloat
          ? { bottom: "25%" }           // 1/4 from bottom, detached from edge
          : isBottom
            ? { bottom: 24 + offset }
            : { top: (Platform.OS === "ios" ? 80 : 48) + offset },
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left indicator */}
        {theme.icon ? (
          <Text style={[styles.icon, { color: theme.spinnerColor }]}>{theme.icon}</Text>
        ) : isPersistent ? (
          <PulsingDot color={theme.spinnerColor} />
        ) : (
          <ActivityIndicator size="small" color={theme.spinnerColor} style={{ marginRight: 8 }} />
        )}

        {/* Message */}
        <Text style={[styles.message, { color: theme.text }]} numberOfLines={1}>
          {message}
          {hasProgress ? `  ${Math.round(progress!)}%` : ""}
        </Text>

        {/* Dismiss */}
        {showDismiss && (
          <TouchableOpacity
            onPress={slideOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Text style={[styles.closeTxt, { color: "rgba(255,255,255,0.5)" }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasProgress && <ProgressBar progress={progress!} color={theme.progressColor} />}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    left: 40,
    right: 40,
    paddingVertical: 13,
    paddingHorizontal: 20,
    // ↓ Full pill / capsule shape
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  closeBtn: {
    marginLeft: 8,
  },
  closeTxt: {
    fontSize: 12,
    fontWeight: "600",
  },
});