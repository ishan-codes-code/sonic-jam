import { Redirect } from 'expo-router';

/**
 * The root AuthGuard in _layout.tsx handles all redirection logic.
 * This file acts as default landing – guard will redirect before this renders.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
