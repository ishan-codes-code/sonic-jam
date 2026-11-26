import { compareVersions } from "compare-versions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import versionInfo from "../../../../assets/version.json";

/*

VERSION CONTROL SYSTEM
─────────────────────────────────────────────────────────────
Two sources of truth:
Native version  → app.json "version" (baked into APK)
OTA version     → assets/version.json (travels with JS bundle)

Remote config (GitHub Raw) controls what versions are expected.
This file compares running versions against remote expectations.

OTA Update Flow:
Developer runs: eas update --branch production
Developer bumps assets/version.json otaVersion
Developer bumps ota.version in GitHub Raw config
Next app open: config fetch detects mismatch
expo-updates downloads new bundle silently
UI nudges user to restart (force) or dismiss (optional)
On restart: new bundle runs, version.json reads correctly

Native Update Flow:
Developer makes native change
Developer runs: eas build --platform android --profile production
Developer updates native.version + updateUrl in GitHub config
Next app open: native check detects mismatch
ForceUpdateScreen shown with APK download link
─────────────────────────────────────────────────────────────
*/

const CONFIG_URL = `https://raw.githubusercontent.com/ishan-codes-code/app-config-sonic/main/app-config.json`;
const CONFIG_KEY = "REMOTE_CONFIG";

// The version gate blocks first launch (including server setup) until the
// first check resolves, so the remote fetch must be bounded: a slow or dead
// GitHub Raw must fall through to the cached config / fail-open path below
// instead of stalling boot indefinitely.
export const REMOTE_CONFIG_TIMEOUT_MS = 10_000;

interface RemoteConfigOptions {
  timeoutMs?: number;
}

export interface VersionConfig {
  maintenance: {
    enabled: boolean;
    message: string;
  };
  native: {
    version: string;
    minRequiredVersion: string;
    forceUpdate: boolean;
    updateUrl: string;
    whatsNew?: string[];
    message?: string;
  };
  ota: {
    version: string;
    force: boolean;
    message: string;
  };
}

export interface VersionStatus {
  isMaintenance: boolean;
  maintenanceMessage: string | null;
  isForce: boolean;
  isOptional: boolean;
  updateUrl: string | null;
  nativeVersion: string | null;
  nativeWhatsNew: string[] | null;
  nativeMessage: string | null;
  isOtaForce: boolean;
  isOtaOptional: boolean;
  otaVersion: string | null;
  otaMessage: string | null;
}

export const fetchRemoteConfig = async (
  options?: RemoteConfigOptions,
): Promise<VersionConfig | null> => {
  const timeoutMs = options?.timeoutMs ?? REMOTE_CONFIG_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("Failed to fetch config");
    }

    const config: VersionConfig = await res.json();
    return config;
  } catch (err) {
    console.log("Config fetch error:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const getConfig = async (
  options?: RemoteConfigOptions,
): Promise<VersionConfig | null> => {
  const remote = await fetchRemoteConfig(options);

  if (remote) {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(remote));
    return remote;
  }

  const local = await AsyncStorage.getItem(CONFIG_KEY);
  return local ? JSON.parse(local) : null;
};

export const checkAppVersion = async (
  options?: RemoteConfigOptions,
): Promise<VersionStatus> => {
  try {
    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
    const currentOtaVersion = versionInfo.otaVersion ?? '0.0.0';

    const config = await getConfig(options);

    if (!config) {
      throw new Error("Failed to load config");
    }

    const isMaintenance = !__DEV__ && (config.maintenance?.enabled ?? false);
    const maintenanceMessage = config.maintenance?.message ?? null;

    const native = config.native || { version: "0.0.0", minRequiredVersion: "0.0.0", forceUpdate: false, updateUrl: "" };

    const isForce =
      compareVersions(currentVersion, native.minRequiredVersion) < 0 ||
      (native.forceUpdate && compareVersions(currentVersion, native.version) < 0);

    const isOptional =
      !isForce && compareVersions(currentVersion, native.version) < 0;

    const ota = config.ota || { version: "0.0.0", force: false, message: "" };

    const isOtaForce =
      ota.force && compareVersions(currentOtaVersion, ota.version) < 0;

    const isOtaOptional =
      !isOtaForce && compareVersions(currentOtaVersion, ota.version) < 0;

    return {
      isMaintenance,
      maintenanceMessage,
      isForce,
      isOptional,
      updateUrl: native.updateUrl,
      nativeVersion: native.version,
      nativeWhatsNew: native.whatsNew || null,
      nativeMessage: native.message || null,
      isOtaForce,
      isOtaOptional,
      otaVersion: ota.version,
      otaMessage: ota.message,
    };
  } catch (e) {
    console.error("[VersionService] Error checking app version:", e);
    // Fail-safe → allow app usage
    return {
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
    };
  }
};
