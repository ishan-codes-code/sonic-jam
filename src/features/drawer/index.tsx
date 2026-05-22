import React from 'react';
import { GlobalBottomSheet } from './components/GlobalBottomSheet';

export * from './hooks/useDrawer';
export * from './store/drawerStore';

/**
 * Legacy provider or modern wrapper to maintain the UI root injection.
 */
export const BottomSheetProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <GlobalBottomSheet />
    </>
  );
};
