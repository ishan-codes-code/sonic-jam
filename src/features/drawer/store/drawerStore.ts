import { create } from "zustand";
import React from "react";

interface DrawerState {
  isOpen: boolean;
  content: React.ReactNode | null;
  snapPoint: string | number | (string | number)[] | undefined;
  open: (content: React.ReactNode, snapPoint?: string | number | (string | number)[]) => void;
  close: () => void;
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  content: null,
  snapPoint: undefined,
  open: (content, snapPoint) => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    set({ isOpen: true, content, snapPoint });
  },
  close: () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
    }
    set({ isOpen: false });
    closeTimer = setTimeout(() => {
      set({ content: null, snapPoint: undefined });
      closeTimer = null;
    }, 350);
  },
}));
