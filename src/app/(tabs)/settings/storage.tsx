import { Redirect } from 'expo-router';
import { useAuthStore } from '@/features/auth/store/authStore';
import { AdminStorageScreen } from '@/features/server/screens/AdminStorageScreen';

/**
 * Admin-only route guard: a signed-in non-admin (including a missing role,
 * which always means non-admin) is bounced back to Settings. Other states
 * render the screen — AuthGuard owns unauthenticated routing, and the screen
 * itself reports a stale 403 (demoted mid-session) inline.
 */
export default function SettingsStorageRoute() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);

  if (status === 'authenticated' && role !== 'admin') {
    return <Redirect href="/settings" />;
  }
  return <AdminStorageScreen />;
}
