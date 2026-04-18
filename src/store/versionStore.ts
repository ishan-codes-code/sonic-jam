import { create } from 'zustand';
import { VersionStatus } from '../services/versionService';

interface VersionState extends VersionStatus {
  hasChecked: boolean;
  hasDismissedOptional: boolean;
  setVersionState: (data: Partial<VersionState>) => void;
  dismissOptional: () => void;
  message?: string | null;
}

export const useVersionStore = create<VersionState>((set) => ({
  isMaintenance: false,
  maintenanceMessage: null,
  isForce: false,
  isOptional: false,
  updateUrl: null,
  nativeMessage: null,
  isOtaForce: false,
  isOtaOptional: false,
  otaMessage: null,
  hasChecked: false,
  hasDismissedOptional: false,

  setVersionState: (data) => set((state) => ({ ...state, ...data, hasChecked: true })),
  dismissOptional: () => set({ hasDismissedOptional: true }),
}));
