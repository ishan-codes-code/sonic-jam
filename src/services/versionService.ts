import { compareVersions } from "compare-versions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const CONFIG_URL = `https://raw.githubusercontent.com/ishan-codes-code/sonic-app-config/main/app-config.json?t=${Date.now()}`;
const CONFIG_KEY = "REMOTE_CONFIG";

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

export const fetchRemoteConfig = async (): Promise<VersionConfig | null> => {
  try {
    const res = await fetch(CONFIG_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch config");
    }

    const config: VersionConfig = await res.json();
    return config;
  } catch (err) {
    console.log("Config fetch error:", err);
    return null;
  }
};

export const getConfig = async (): Promise<VersionConfig | null> => {
  const remote = await fetchRemoteConfig();

  if (remote) {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(remote));
    return remote;
  }

  const local = await AsyncStorage.getItem(CONFIG_KEY);
  return local ? JSON.parse(local) : null;
};

export const checkAppVersion = async (): Promise<VersionStatus> => {
  try {
    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
    const config = await getConfig();

    if (!config) {
      throw new Error("Failed to load config");
    }

    const {
      latestVersion,
      minRequiredVersion,
      forceUpdate,
      updateUrl,
      message,
    } = config;

    const isForce =
      forceUpdate || compareVersions(currentVersion, minRequiredVersion) < 0;

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
