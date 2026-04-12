/**
 * useConfirm
 *
 * Returns the `confirm()` function from ConfirmContext.
 * Must be used inside <ConfirmProvider> or it will throw.
 *
 * Usage:
 *   const confirm = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: 'Delete playlist',
 *       message: 'Are you sure you want to delete this playlist?',
 *     });
 *     if (ok) deletePlaylist(id);
 *   };
 */

import { ConfirmContext } from '@/src/context/ConfirmProvider';
import { useContext } from 'react';

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within <ConfirmProvider>.');
  }
  return ctx;
}
