/**
 * Boot routing is owned entirely by ServerGuard/AuthGuard in `_layout.tsx`
 * (single owner per redirect). This route deliberately renders nothing and
 * redirects nowhere: a `<Redirect>` here would fire during initial route
 * mounting and compete with the guards' redirects — the duplicate Login
 * redirect behind the first-launch "REPLACE (auth)" warning.
 */
export default function Index() {
  return null;
}
