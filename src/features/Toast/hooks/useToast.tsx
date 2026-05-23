import { toastImperative } from '../utils/toastSingleton';
import { useToastContext } from '../components/ToastProvider';

/**
 * useToast
 *
 * A clean wrapper around the custom Toast system for easy, typed usage
 * throughout the app. Drop-in replacement for the react-native-toast-message version.
 */
export function useToast() {
    const { show: _show, hide } = useToastContext();

    const show = (
        message: string,
        type: 'success' | 'error' | 'info' = 'info',
    ) => {
        _show({
            type,
            text1: message,
            position: 'bottom',
            visibilityTime: 3000,
            autoHide: true,
        });
    };

    return {
        success: (message: string) => show(message, 'success'),
        error: (message: string) => show(message, 'error'),
        loading: (message: string) => {
            _show({
                type: 'info',
                text1: message,
                position: 'bottom',
                autoHide: false,
            });
        },
        hide,
        show,
    };
}

/**
 * withToast helper for async flows
 */
export async function withToast<T>(
    fn: () => Promise<T>,
    messages: { loading: string; success: string; error: string },
): Promise<T> {
    toastImperative.show({ type: 'info', text1: messages.loading, autoHide: false });
    try {
        const res = await fn();
        toastImperative.show({ type: 'success', text1: messages.success, visibilityTime: 3000 });
        return res;
    } catch (e) {
        toastImperative.show({ type: 'error', text1: messages.error, visibilityTime: 4000 });
        throw e;
    }
}