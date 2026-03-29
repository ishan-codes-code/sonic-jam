import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { FlashMessage, FlashMessagePosition, FlashMessageType } from "../components/ui/FlashMessage";

export interface ShowFlashOptions {
  message: string;
  type?: FlashMessageType;
  position?: FlashMessagePosition;
  autoDismissMs?: number;
  dismissible?: boolean;
  progress?: number;
  offset?: number;
}

interface FlashMessageContextValue {
  show: (options: ShowFlashOptions) => () => void;
  hide: () => void;
  setProgress: (value: number) => void;
}

const FlashMessageContext = createContext<FlashMessageContextValue | null>(null);

export function FlashMessageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShowFlashOptions & { visible: boolean }>({
    visible: false,
    message: "",
    type: "loading",
    position: "float",
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback(
    (options: ShowFlashOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ ...options, visible: true });
      return hide;
    },
    [hide]
  );

  const setProgress = useCallback((value: number) => {
    setState((prev) => ({ ...prev, progress: value }));
  }, []);

  return (
    <FlashMessageContext.Provider value={{ show, hide, setProgress }}>
      {children}
      <FlashMessage
        visible={state.visible}
        message={state.message}
        type={state.type}
        position={state.position}
        autoDismissMs={state.autoDismissMs}
        dismissible={state.dismissible}
        progress={state.progress}
        offset={state.offset}
        onDismiss={() => setState((prev) => ({ ...prev, visible: false }))}
      />
    </FlashMessageContext.Provider>
  );
}

export function useFlashMessage() {
  const ctx = useContext(FlashMessageContext);
  if (!ctx) throw new Error("useFlashMessage must be inside <FlashMessageProvider>");
  return ctx;
}

export function useWithFlash() {
  const { show, hide } = useFlashMessage();

  async function withFlash<T>(
    fn: () => Promise<T>,
    messages: {
      loading: string;
      success?: string;
      error?: string;
      type?: "loading" | "uploading" | "downloading";
      position?: FlashMessagePosition;
      successDismissMs?: number;
      errorDismissMs?: number;
    }
  ): Promise<T> {
    show({ message: messages.loading, type: messages.type ?? "loading", position: messages.position });
    try {
      const result = await fn();
      if (messages.success) {
        show({
          message: messages.success,
          type: "success",
          position: messages.position,
          autoDismissMs: messages.successDismissMs ?? 3000,
          dismissible: true,
        });
      } else {
        hide();
      }
      return result;
    } catch (err) {
      if (messages.error) {
        show({
          message: messages.error,
          type: "error",
          position: messages.position,
          autoDismissMs: messages.errorDismissMs ?? 4000,
          dismissible: true,
        });
      } else {
        hide();
      }
      throw err;
    }
  }

  return { withFlash };
}