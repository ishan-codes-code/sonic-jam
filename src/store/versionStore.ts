import { create } from 'zustand';
import { VersionStatus } from '../services/versionService';

interface VersionState extends VersionStatus {
  hasChecked: boolean;
  hasDismissedOptional: boolean;
  setVersionState: (data: Partial<VersionState>) => void;
  dismissOptional: () => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  isForce: false,
  isOptional: false,
  updateUrl: null,
  message: null,
  hasChecked: false,
  hasDismissedOptional: false,

  setVersionState: (data) => set((state) => ({ ...state, ...data, hasChecked: true })),
  dismissOptional: () => set({ hasDismissedOptional: true }),
}));
