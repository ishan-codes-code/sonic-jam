/**
 * ConfirmProvider
 *
 * Global context provider for the confirmation dialog system.
 * Manages internal state and exposes a Promise-based `confirm()` function
 * via ConfirmContext.
 *
 * Wrap the root layout with <ConfirmProvider> to make it available everywhere.
 */

import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import React, { createContext, useCallback, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Optional async side-effect executed AFTER user confirms */
  onConfirm?: () => void | Promise<void>;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// ─── Context ──────────────────────────────────────────────────────────────────

export const ConfirmContext = createContext<ConfirmFn | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });

  // Hold the resolve callback for the active Promise
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setVisible(true);
      setLoading(false);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (options.onConfirm) {
      setLoading(true);
      try {
        await options.onConfirm();
      } finally {
        setLoading(false);
      }
    }
    setVisible(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, [options]);

  const handleCancel = useCallback(() => {
    if (loading) return; // block dismiss while async action is running
    setVisible(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, [loading]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        visible={visible}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}
