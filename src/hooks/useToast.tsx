import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import React from 'react';
import { theme } from '@/src/theme';

/**
 * useToast
 * 
 * A clean wrapper around react-native-toast-message for easy, typed usage
 * throughout the app.
 */
export function useToast() {
  const show = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  };

  return {
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    loading: (message: string) => {
      Toast.show({
        type: 'info',
        text1: message,
        position: 'top',
        autoHide: false,
        topOffset: 60,
      });
    },
    hide: () => Toast.hide(),
    show
  };
}

/**
 * toastConfig
 * 
 * Custom UI for the toast messages to match the app's dark, pill-style aesthetic.
 */
export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.actionAccent,
        backgroundColor: theme.colors.backgroundCard,
        borderRadius: 25,
        width: '90%',
        height: 50,
        borderLeftWidth: 6,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '600'
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: theme.colors.error,
        backgroundColor: theme.colors.backgroundCard,
        borderRadius: 25,
        width: '90%',
        height: 50,
        borderLeftWidth: 6,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '600'
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: theme.colors.secondaryAccent,
        backgroundColor: theme.colors.backgroundCard,
        borderRadius: 25,
        width: '90%',
        height: 50,
        borderLeftWidth: 6,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        color: theme.colors.textPrimary,
        fontSize: 14,
        fontWeight: '600'
      }}
    />
  )
};

/**
 * withToast helper for async flows
 */
export async function withToast<T>(
  fn: () => Promise<T>,
  messages: { loading: string; success: string; error: string }
): Promise<T> {
  Toast.show({ type: 'info', text1: messages.loading, autoHide: false, topOffset: 60 });
  try {
    const res = await fn();
    Toast.show({ type: 'success', text1: messages.success, visibilityTime: 3000, topOffset: 60 });
    return res;
  } catch (e) {
    Toast.show({ type: 'error', text1: messages.error, visibilityTime: 4000, topOffset: 60 });
    throw e;
  }
}
