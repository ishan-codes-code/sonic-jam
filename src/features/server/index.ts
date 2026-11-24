// Screens
export { ServerManagementScreen } from './screens/ServerManagementScreen';
export { ServerSetupScreen } from './screens/ServerSetupScreen';
export { SetupWizardScreen } from './screens/SetupWizardScreen';

// Hooks
export { useServerSetup } from './hooks/useServerSetup';
export { useServerSwitch } from './hooks/useServerSwitch';
export type { ServerSwitchPhase } from './hooks/useServerSwitch';
export { useSetupWizard } from './hooks/useSetupWizard';
export type {
  InitializePhase,
  SetupWizardStep,
} from './hooks/useSetupWizard';

// Store
export { useServerStore } from './store/serverStore';
export type { ServerStatus } from './store/serverStore';

// API
export {
  checkServerConnection,
  parseHealthPayload,
} from './api/serverValidation';
export type {
  HealthDbState,
  HealthPayload,
  HealthStorage,
  ServerCheckFailureCode,
  ServerCheckResult,
} from './api/serverValidation';
export {
  buildConfigPatch,
  DATABASE_URL_KEY,
  getSetupStatus,
  missingR2Fields,
  pollHealthUntilReady,
  R2_FIELD_KEYS,
  redactSecrets,
  saveSetupConfig,
} from './api/setupApi';
export type {
  HealthPollOptions,
  HealthPollResult,
  R2FieldKey,
  SavedSetupConfig,
  SaveSetupConfigResult,
  SetupStatusInfo,
  SetupStatusResult,
} from './api/setupApi';

// Utils
export {
  BAKED_SERVER_URL,
  isLocalHostUrl,
  normalizeServerUrl,
  validateServerUrl,
} from './utils/serverConfig';
export type { ServerUrlErrorCode } from './utils/serverConfig';
export {
  clearStoredServerUrl,
  getStoredServerUrl,
  setStoredServerUrl,
} from './utils/serverStorage';
export { performServerSwitch } from './utils/serverSwitch';
export type { ServerSwitchDeps } from './utils/serverSwitch';
export {
  getSessionGeneration,
  invalidateSession,
  onSessionInvalidated,
} from './utils/sessionGeneration';
