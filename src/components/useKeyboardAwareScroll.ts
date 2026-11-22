import { useCallback, useRef } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

// --------------------------------------------------------------------------
// Android keyboard-aware scrolling for form screens (auth + server setup).
//
// Root cause it addresses: on Android, `KeyboardAvoidingView behavior="height"`
// only shrinks the viewport — it never scrolls content — and
// `automaticallyAdjustKeyboardInsets` is iOS-only (a no-op on Android). So a
// focused input below the fold stays hidden behind the keyboard until the
// user scrolls manually.
//
// This hook scrolls the ACTUALLY focused input into view using React Native's
// purpose-built API (`scrollResponderScrollNativeHandleToKeyboard`, whose own
// docblock prescribes exactly this onFocus usage). It measures the live input
// rect and the tracked keyboard metrics — no timeouts, no blind offsets.
// iOS is untouched: the callbacks no-op there and the existing KAV padding +
// auto-inset props keep working as before.
// --------------------------------------------------------------------------

export function useKeyboardAwareScroll() {
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollFocusedInputIntoView = useCallback(() => {
    // iOS already handles this via KAV padding + automaticallyAdjustKeyboardInsets.
    if (Platform.OS !== 'android') return;

    const scrollView = scrollViewRef.current;
    const focusedInput = TextInput.State.currentlyFocusedInput();
    if (!scrollView || focusedInput == null) return;

    scrollView.scrollResponderScrollNativeHandleToKeyboard(
      focusedInput,
      0, // additionalOffset: rest the field exactly at the keyboard top
      true, // preventNegativeScrollOffset: never scroll past content start
    );
  }, []);

  // Initial focus: the keyboard opening is the signal. Scoped to the focused
  // route so stacked screens (e.g. Login under Server Setup review) don't
  // fight over the same keyboard event.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const subscription = Keyboard.addListener(
        'keyboardDidShow',
        scrollFocusedInputIntoView,
      );
      return () => subscription.remove();
    }, [scrollFocusedInputIntoView]),
  );

  return {
    scrollViewRef,
    // Pass to every Input's onFocus: moving between fields while the keyboard
    // stays open fires no keyboard event, so focus is the only signal.
    onInputFocus: scrollFocusedInputIntoView,
  };
}
