import { useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

// --------------------------------------------------------------------------
// Android keyboard-aware scrolling for form screens (auth + server setup).
//
// Root cause it addresses: on Android, `KeyboardAvoidingView behavior="height"`
// only shrinks the viewport — it never scrolls content — and
// `automaticallyAdjustKeyboardInsets` is iOS-only (a no-op on Android). A
// device experiment additionally proved the ScrollView's maximum scroll range
// is insufficient while the keyboard is open: adding bottom padding made
// automatic scrolling work, removing it reproduced the failure. A scroll
// issued against the unpadded range just clamps to ~zero.
//
// This hook therefore does two things, in a strict order:
//  1. Adds the live keyboard height as bottom padding (from the keyboardDidShow
//     payload — no hardcoded heights), which grows the scroll range.
//  2. Scrolls the ACTUALLY focused input into view only after that growth
//     lands, driven by onContentSizeChange (the layout-completion signal) —
//     never by timeout, and never before the new range exists.
//
// The scroll itself uses React Native's purpose-built API
// (`scrollResponderScrollNativeHandleToKeyboard`, whose own docblock prescribes
// exactly this onFocus usage), which measures the live input rect against the
// tracked keyboard metrics.
// iOS is untouched: listeners never register and the padding stays 0, so the
// existing KAV padding + auto-inset props keep working as before.
//
// Geometry note (verified in ScrollView.js): that API assumes the ScrollView
// takes up the entire screen — it compares the content-relative input rect
// against the screen-relative keyboard top, ignoring the ScrollView's own
// screen offset. Our screens nest the ScrollView under a top safe-area inset
// (KeyboardAvoidingView > SafeAreaView > ScrollView), so without compensation
// every offset undershoots by the inset height and near-fold fields clamp to
// a no-op. Passing the live top inset as additionalOffset corrects this
// exactly on all three screens.
// --------------------------------------------------------------------------

export function useKeyboardAwareScroll() {
  const scrollViewRef = useRef<ScrollView>(null);
  const { top: safeAreaTop } = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpenRef = useRef(false);

  const scrollFocusedInputIntoView = useCallback(() => {
    // iOS already handles this via KAV padding + automaticallyAdjustKeyboardInsets.
    if (Platform.OS !== 'android') return;

    const scrollView = scrollViewRef.current;
    const focusedInput = TextInput.State.currentlyFocusedInput();
    if (!scrollView || focusedInput == null) return;

    // Heal missed keyboard events (e.g. the keyboard persisted across a
    // navigation): make sure padding room exists. In the normal case the
    // height is already set, so this is a no-op state update.
    const metrics = Keyboard.metrics();
    if (metrics != null && metrics.height > 0) {
      keyboardOpenRef.current = true;
      setKeyboardHeight(metrics.height);
    }

    scrollView.scrollResponderScrollNativeHandleToKeyboard(
      focusedInput,
      // Compensate the API's full-screen assumption with the ScrollView's
      // exact screen offset (== safe-area top on these screens), so the
      // field lands exactly at the keyboard top.
      safeAreaTop,
      true, // preventNegativeScrollOffset: never scroll past content start
    );
  }, [safeAreaTop]);

  // Layout-driven scroll sequencing: content growth (from the keyboard
  // padding, or any other content change while open) is the signal that the
  // new scroll range exists, so the requested offset is always reachable.
  const handleContentSizeChange = useCallback(() => {
    if (Platform.OS !== 'android') return;
    if (!keyboardOpenRef.current) return;
    scrollFocusedInputIntoView();
  }, [scrollFocusedInputIntoView]);

  // Scoped to the focused route so stacked screens (e.g. Login under Server
  // Setup review) don't fight over the same keyboard event.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      // The listeners below only fire while this route is focused, so a
      // show/hide that happened on another route leaves this screen's padding
      // stale. Re-sync from the live keyboard metrics on every refocus.
      const metrics = Keyboard.metrics();
      if (metrics != null && metrics.height > 0) {
        keyboardOpenRef.current = true;
        setKeyboardHeight(metrics.height);
      } else {
        keyboardOpenRef.current = false;
        setKeyboardHeight(0);
      }
      const showSubscription = Keyboard.addListener(
        'keyboardDidShow',
        (event) => {
          keyboardOpenRef.current = true;
          // Grow the scroll range first; the resulting onContentSizeChange
          // performs the scroll. Scrolling directly here would clamp against
          // the pre-padding range.
          setKeyboardHeight(event.endCoordinates.height);
        },
      );
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        keyboardOpenRef.current = false;
        setKeyboardHeight(0);
      });
      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, []),
  );

  return {
    scrollViewRef,
    // Pass to every Input's onFocus: moving between fields while the keyboard
    // stays open fires no keyboard event, so focus is the only signal.
    onInputFocus: scrollFocusedInputIntoView,
    // Pass to the ScrollView's onContentSizeChange: the layout-completion
    // signal that sequences scrolling after the scroll range has grown.
    onContentSizeChange: handleContentSizeChange,
    // Add to the ScrollView's contentContainer bottom padding (Android only;
    // always 0 on iOS). Removed on keyboardDidHide.
    keyboardBottomPadding: keyboardHeight,
  };
}
