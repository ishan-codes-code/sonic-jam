import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { registerImperativeToast } from '../utils/toastSingleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
type ToastPosition = 'top' | 'bottom';

interface ToastOptions {
  type?: ToastType;
  text1: string;
  position?: ToastPosition;
  visibilityTime?: number;
  autoHide?: boolean;
  topOffset?: number;
  bottomOffset?: number;
}

interface ToastState extends ToastOptions {
  visible: boolean;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Constants ────────────────────────────────────────────────────────────────

const FADE_DURATION = 200;
const DEFAULT_VISIBILITY_TIME = 3000;
const DEFAULT_TOP_OFFSET = 60;
const DEFAULT_BOTTOM_OFFSET = 132;

const TEXT_COLOR: Record<ToastType, string> = {
  success: '#000000',
  info: '#000000',
  error: '#E53935',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    text1: '',
    type: 'info',
    position: 'bottom',
    autoHide: true,
    visibilityTime: DEFAULT_VISIBILITY_TIME,
    topOffset: DEFAULT_TOP_OFFSET,
    bottomOffset: insets.bottom + DEFAULT_BOTTOM_OFFSET,
  });

  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeOutAnimRef = useRef<Animated.CompositeAnimation | null>(null);



  const fadeOut = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    fadeOutAnimRef.current = Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    });

    fadeOutAnimRef.current.start(({ finished }) => {
      if (finished) {
        setToast((prev) => ({ ...prev, visible: false }));
      }
    });
  }, [opacity]);

  const show = useCallback(
    (options: ToastOptions) => {
      // Cancel any pending hide
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (fadeOutAnimRef.current) {
        fadeOutAnimRef.current.stop();
      }

      setToast({
        visible: true,
        type: 'info',
        position: 'bottom',
        autoHide: true,
        visibilityTime: DEFAULT_VISIBILITY_TIME,
        topOffset: DEFAULT_TOP_OFFSET,
        bottomOffset: DEFAULT_BOTTOM_OFFSET,
        ...options,
      });

      opacity.setValue(0);

      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        const autoHide = options.autoHide ?? true;
        const visibilityTime = options.visibilityTime ?? DEFAULT_VISIBILITY_TIME;

        if (autoHide) {
          hideTimerRef.current = setTimeout(() => {
            fadeOut();
          }, visibilityTime);
        }
      });
    },
    [opacity, fadeOut],
  );

  const hide = useCallback(() => {
    fadeOut();
  }, [fadeOut]);

  // Wire up imperative singleton for withToast / outside-React usage
  useEffect(() => {
    registerImperativeToast({ show, hide });
  }, [show, hide]);

  const positionStyle: ViewStyle =
    toast.position === 'top'
      ? { top: toast.topOffset ?? DEFAULT_TOP_OFFSET }
      : { bottom: toast.bottomOffset ?? DEFAULT_BOTTOM_OFFSET };

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[styles.container, positionStyle, { opacity }]}
          pointerEvents="none"
        >
          <View style={styles.pill}>
            <Text
              style={[
                styles.text,
                { color: TEXT_COLOR[toast.type ?? 'info'] },
              ]}
              numberOfLines={2}
            >
              {toast.text1}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Internal hook (used by useToast) ────────────────────────────────────────

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '92%',
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 20,
    // Shadow
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    // Subtle border
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});