/**
 * toastSingleton
 *
 * Imperative singleton that allows toast calls from outside React
 * (e.g. withToast, axios interceptors, service layers).
 *
 * ToastProvider registers itself here on mount.
 * useToast / withToast read from here.
 */

type ImperativeOptions = {
    type?: 'success' | 'error' | 'info';
    text1: string;
    autoHide?: boolean;
    visibilityTime?: number;
    position?: 'top' | 'bottom';
    topOffset?: number;
    bottomOffset?: number;
};

type ImperativeRef = {
    show: (opts: ImperativeOptions) => void;
    hide: () => void;
};

let _ref: ImperativeRef | null = null;

export function registerImperativeToast(ref: ImperativeRef) {
    _ref = ref;
}

export const toastImperative = {
    show: (opts: ImperativeOptions) => _ref?.show(opts),
    hide: () => _ref?.hide(),
};