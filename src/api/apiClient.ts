import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/features/auth/utils/tokenStorage";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const MEDIA_URL = process.env.EXPO_PUBLIC_MEDIA_URL || BASE_URL;

//export const BASE_URL = "https://previews-lookup-promises-provided.trycloudflare.com";

// console.log('BASE_URL', BASE_URL);

// --------------------------------------------------------------------------
// Axios instance
// --------------------------------------------------------------------------
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 minutes (up to 300s for heavy downloads)
  headers: { "Content-Type": "application/json" },
});

import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "sonic_device_id";
let cachedDeviceId: string | null = null;

async function getOrInitDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    cachedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!cachedDeviceId) {
      cachedDeviceId =
        "device_" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      await SecureStore.setItemAsync(DEVICE_ID_KEY, cachedDeviceId);
    }
  } catch (error) {
    console.error("Failed to get/set device ID in SecureStore:", error);
    cachedDeviceId =
      "device_fallback_" + Math.random().toString(36).substring(2, 15);
  }
  return cachedDeviceId;
}

// --------------------------------------------------------------------------
// Request interceptor – attach access token
// --------------------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const [token, deviceId] = await Promise.all([
      tokenStorage.getAccessToken(),
      getOrInitDeviceId(),
    ]);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["x-device-id"] = deviceId;
    return config;
  },
  (error) => Promise.reject(error),
);

import { toastImperative } from "@/features/Toast/utils/toastSingleton";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Show success toast for non-GET mutations if backend provides a specific message
    const method = response.config.method?.toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(
      method || "",
    );
    const isAuthRefresh = response.config.url?.includes("/auth/refresh");

    if (
      isMutation &&
      !isAuthRefresh &&
      response.data?.message &&
      typeof response.data.message === "string"
    ) {
      toastImperative.show({
        type: "success",
        text1: response.data.message || "Success",
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      // Global error handler for failed requests (ignoring pending 401 retries)
      const method = originalRequest?.method?.toLowerCase();
      const isMutation = ["post", "put", "patch", "delete"].includes(
        method || "",
      );
      const isAuthRefresh = originalRequest?.url?.includes("/auth/refresh");

      // Show toast if it's a mutation OR a severe server error, but ignore background refresh
      if (
        !isAuthRefresh &&
        (isMutation || (error.response && error.response.status >= 500))
      ) {
        const errData = error.response?.data;
        const msg =
          errData?.message ||
          errData?.error ||
          error.message ||
          "An unexpected error occurred";
        const displayMsg = Array.isArray(msg) ? msg[0] : msg; // handle class-validator arrays

        toastImperative.show({
          type: "error",
          text1:
            typeof displayMsg === "string"
              ? displayMsg
              : "Failed to complete request",
        });
      }

      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests that arrive while a refresh is in progress
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      // Call refresh without the interceptor to avoid infinite loops
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;
      await tokenStorage.saveTokens(newAccessToken, newRefreshToken);

      // Update native progressSync headers with the new token
      // Lazy imported to prevent circular dependencies (apiClient -> authStore)
      const { setProgressSyncToken } =
        await import("@/features/playback/hooks/useProgressSyncAuth");
      setProgressSyncToken(newAccessToken);

      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens + trigger logout via the auth store
      await tokenStorage.clearTokens();
      // Lazy import to avoid circular dependency
      const { useAuthStore } = await import("../features/auth/store/authStore");
      useAuthStore.getState().resetAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
