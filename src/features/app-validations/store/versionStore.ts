import { create } from 'zustand';
import { VersionStatus } from '../services/versionService';

interface VersionState extends VersionStatus {
  hasChecked: boolean;
  hasDismissedOptional: boolean;
  
  // OTA Foreground update state
  isOtaUpdating: boolean;
  otaUpdateStep: 'idle' | 'checking' | 'downloading' | 'installing' | 'restarting' | 'error';
  otaUpdateError: string | null;
  otaDownloadProgress: number;

  setVersionState: (data: Partial<VersionState>) => void;
  dismissOptional: () => void;
  
  startOtaUpdate: () => void;
  setOtaUpdateStep: (step: VersionState['otaUpdateStep']) => void;
  setOtaUpdateError: (err: string | null) => void;
  setOtaDownloadProgress: (progress: number) => void;
  resetOtaUpdate: () => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  isMaintenance: false,
  maintenanceMessage: null,
  isForce: false,
  isOptional: false,
  updateUrl: null,
  nativeVersion: null,
  nativeWhatsNew: null,
  nativeMessage: null,
  isOtaForce: false,
  isOtaOptional: false,
  otaVersion: null,
  otaMessage: null,
  hasChecked: false,
  hasDismissedOptional: false,

  // OTA Foreground update state
  isOtaUpdating: false,
  otaUpdateStep: 'idle',
  otaUpdateError: null,
  otaDownloadProgress: 0,

  setVersionState: (data) => set((state) => ({ ...state, ...data, hasChecked: true })),
  dismissOptional: () => set({ hasDismissedOptional: true }),

  startOtaUpdate: () => set({ isOtaUpdating: true, otaUpdateStep: 'checking', otaUpdateError: null, otaDownloadProgress: 0 }),
  setOtaUpdateStep: (step) => set({ otaUpdateStep: step }),
  setOtaUpdateError: (err) => set({ otaUpdateError: err, otaUpdateStep: 'error' }),
  setOtaDownloadProgress: (progress) => set({ otaDownloadProgress: progress }),
  resetOtaUpdate: () => set({ isOtaUpdating: false, otaUpdateStep: 'idle', otaUpdateError: null, otaDownloadProgress: 0, hasDismissedOptional: true }),
}));
