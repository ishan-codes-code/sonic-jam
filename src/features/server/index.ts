// Screens
export { ServerManagementScreen } from './screens/ServerManagementScreen';
export { ServerSetupScreen } from './screens/ServerSetupScreen';

// Hooks
export { useServerSetup } from './hooks/useServerSetup';
export { useServerSwitch } from './hooks/useServerSwitch';
export type { ServerSwitchPhase } from './hooks/useServerSwitch';

// Store
export { useServerStore } from './store/serverStore';
export type { ServerStatus } from './store/serverStore';

// API
export { checkServerConnection } from './api/serverValidation';
export type {
  ServerCheckFailureCode,
  ServerCheckResult,
} from './api/serverValidation';

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
