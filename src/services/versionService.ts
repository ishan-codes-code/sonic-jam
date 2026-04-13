import { compareVersions } from "compare-versions";
import Constants from "expo-constants";

const CONFIG_URL = `https://cdn.jsdelivr.net/gh/ishan-codes-code/sonic-app-config/app-config.json?t=${Date.now()}`;

console.log("[VersionService]", CONFIG_URL);

const currentVersion = Constants.expoConfig?.version || "0.0.0";

export interface VersionConfig {
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  message: string;
}

export interface VersionStatus {
  isForce: boolean;
  isOptional: boolean;
  updateUrl: string | null;
  message: string | null;
}

export const checkAppVersion = async (): Promise<VersionStatus> => {
  try {
    const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch config");

    const config: VersionConfig = await res.json();

    const {
      latestVersion,
      minRequiredVersion,
      forceUpdate,
      updateUrl,
      message,
    } = config;

    // isForce: if current < minRequired OR forceUpdate is explicitly true
    const isForce =
      compareVersions(currentVersion, minRequiredVersion) < 0 || forceUpdate;

    // isOptional: if current < latest and not a forced update
    const isOptional =
      !isForce && compareVersions(currentVersion, latestVersion) < 0;

    return {
      isForce,
      isOptional,
      updateUrl,
      message,
    };
  } catch (e) {
    console.error("[VersionService] Error checking app version:", e);
    // Fail-safe → allow app usage
    return {
      isForce: false,
      isOptional: false,
      updateUrl: null,
      message: null,
    };
  }
};
