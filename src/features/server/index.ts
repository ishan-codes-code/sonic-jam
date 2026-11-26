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
  FinishPhase,
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
  API_KEY_FIELD_KEYS,
  buildConfigPatch,
  getSetupStatus,
  missingSetupFields,
  PLAYBACK_FIELD_KEYS,
  pollHealthUntilReady,
  R2_FIELD_KEYS,
  redactSecrets,
  saveSetupConfig,
  SETUP_CONFIG_KEYS,
  validateWorkerStreamUrl,
} from './api/setupApi';
export type {
  ApiKeyFieldKey,
  HealthPollOptions,
  HealthPollResult,
  PlaybackFieldKey,
  R2FieldKey,
  RequiredFieldOptions,
  SavedSetupConfig,
  SaveSetupConfigResult,
  SetupConfigKey,
  SetupStatusInfo,
  SetupStatusResult,
} from './api/setupApi';

// Utils
export {
  authGuardAction,
  createAttemptGuard,
  isAuthRoute,
  isReviewUnchanged,
  isServerSetupRoute,
  isSetupWizardRoute,
  planConnectResult,
  serverGuardAction,
  shouldInitAuth,
} from './utils/setupNavigation';
export type {
  AttemptGuard,
  AuthGuardSnapshot,
  AuthInitSnapshot,
  ConnectPlan,
  ConnectPlanOptions,
  GuardAuthStatus,
  GuardServerStatus,
  ServerGuardMemory,
  ServerGuardSnapshot,
  SetupNavAction,
  SetupNavHref,
  SetupNavMethod,
} from './utils/setupNavigation';
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
