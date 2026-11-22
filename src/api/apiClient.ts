import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/features/auth/utils/tokenStorage";
import {
  getSessionGeneration,
  onSessionInvalidated,
} from "@/features/server/utils/sessionGeneration";

export let BASE_URL: string | undefined = process.env.EXPO_PUBLIC_API_URL;
export let MEDIA_URL: string | undefined =
  process.env.EXPO_PUBLIC_MEDIA_URL || BASE_URL;

// --------------------------------------------------------------------------
// Axios instance
// --------------------------------------------------------------------------
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 minutes (up to 300s for heavy downloads)
  headers: { "Content-Type": "application/json" },
});

// --------------------------------------------------------------------------
// Runtime server URL
// --------------------------------------------------------------------------
// The server setup flow (src/features/server/) owns the persisted URL and
// pushes it here at boot and after validation. `let` exports are live
// bindings: every existing BASE_URL/MEDIA_URL reader (refresh calls, share
// links, display helpers) picks up the new value with no changes, as long as
// it reads at call time rather than baking the value at module scope.
// --------------------------------------------------------------------------
export function setApiServerUrl(serverUrl: string): void {
  BASE_URL = serverUrl;
  apiClient.defaults.baseURL = serverUrl;
  // Preserve the original fallback rule: an explicit build-time media host
  // stays pinned; otherwise media follows the active server.
  if (!process.env.EXPO_PUBLIC_MEDIA_URL) {
    MEDIA_URL = serverUrl;
  }
}

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
// Generation that owns the in-flight refresh (consulted only while
// isRefreshing). Lets a stale refresh settle without touching a newer
// session's queue entries or releasing a newer refresh's flag.
let refreshingGeneration = 0;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  generation: number;
}> = [];

function processQueue(
  error: unknown,
  token: string | null = null,
  ownerGeneration: number,
) {
  const remaining: typeof failedQueue = [];
  for (const entry of failedQueue) {
    if (entry.generation !== ownerGeneration) {
      remaining.push(entry);
      continue;
    }
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token!);
    }
  }
  failedQueue = remaining;
}

/**
 * Fail every queue entry from a previous session. Runs synchronously inside
 * invalidateSession() and on takeover, so pre-switch waiters settle at switch
 * time instead of hanging on a dead refresh. Deliberately leaves
 * isRefreshing/refreshingGeneration alone: the still-running refresh keeps
 * ownership until it settles, and its own settle paths are generation-filtered.
 */
function rejectStaleQueueEntries(): void {
  const currentGeneration = getSessionGeneration();
  const staleError = new Error("Session changed during token refresh");
  const remaining: typeof failedQueue = [];
  for (const entry of failedQueue) {
    if (entry.generation === currentGeneration) {
      remaining.push(entry);
    } else {
      entry.reject(staleError);
    }
  }
  failedQueue = remaining;
}

onSessionInvalidated(rejectStaleQueueEntries);

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
      // Benign: second delete of an already-removed playlist song (double tap
      // / retry). The caller treats this as "already removed", not a failure.
      const isAlreadyRemoved =
        error.response?.status === 404 &&
        error.response?.data?.message === "Song not found in playlist";
      if (isAlreadyRemoved) {
        return Promise.reject(error);
      }

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

    if (isRefreshing && refreshingGeneration === getSessionGeneration()) {
      // Queue requests that arrive while a refresh is in progress
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
          generation: getSessionGeneration(),
        });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    if (isRefreshing) {
      // The in-flight refresh belongs to a previous session: fail ITS waiters
      // now and take over with a fresh refresh below instead of queueing
      // behind it. isRefreshing stays true throughout — ownership moves to the
      // new refresh, and the stale one's finally block is ownership-guarded,
      // so the two overlapping refreshes cannot interfere.
      rejectStaleQueueEntries();
    }

    originalRequest._retry = true;
    isRefreshing = true;
    refreshingGeneration = getSessionGeneration();
    // A server switch mid-refresh must not let Server A's result touch Server
    // B's session. Every await below yields to the event loop, so the check is
    // repeated before each write, not just once here.
    const refreshGeneration = getSessionGeneration();
    const isStale = () => refreshGeneration !== getSessionGeneration();

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

      if (isStale()) {
        // Server A's tokens must never land in Server B's session. Fail our
        // own queued requests; the new session (and its queue entries) are
        // untouched.
        const staleError = new Error("Session changed during token refresh");
        processQueue(staleError, null, refreshGeneration);
        return Promise.reject(staleError);
      }

      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;
      await tokenStorage.saveTokens(newAccessToken, newRefreshToken);

      if (isStale()) {
        // The switch landed inside the save above: undo our own write (a
        // switched-to session holds no tokens yet, so these can only be ours)
        // and fail everything instead of retrying against the new server.
        await tokenStorage.clearTokens().catch(() => {});
        const staleError = new Error("Session changed during token refresh");
        processQueue(staleError, null, refreshGeneration);
        return Promise.reject(staleError);
      }

      // Update native progressSync headers with the new token
      // Lazy imported to prevent circular dependencies (apiClient -> authStore)
      const { setProgressSyncToken } =
        await import("@/features/playback/hooks/useProgressSyncAuth");
      if (isStale()) {
        const staleError = new Error("Session changed during token refresh");
        processQueue(staleError, null, refreshGeneration);
        return Promise.reject(staleError);
      }
      setProgressSyncToken(newAccessToken);

      processQueue(null, newAccessToken, refreshGeneration);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (isStale()) {
        // A stale refresh failing must never log out the new session: fail
        // our own queued Server A requests, but leave Server B's tokens/state alone.
        processQueue(refreshError, null, refreshGeneration);
        return Promise.reject(refreshError);
      }
      processQueue(refreshError, null, refreshGeneration);
      // Clear tokens + trigger logout via the auth store. A switch can land
      // inside either await below, so generation is re-checked before each
      // auth-state mutation: a stale refresh must never log out the new session.
      await tokenStorage.clearTokens();
      if (isStale()) {
        return Promise.reject(refreshError);
      }
      // Lazy import to avoid circular dependency
      const { useAuthStore } = await import("../features/auth/store/authStore");
      if (isStale()) {
        return Promise.reject(refreshError);
      }
      useAuthStore.getState().resetAuth();
      return Promise.reject(refreshError);
    } finally {
      // Only the current owner releases the flag: a stale refresh settling
      // after a takeover must not unlock a newer refresh's critical section.
      if (refreshingGeneration === refreshGeneration) {
        isRefreshing = false;
      }
    }
  },
);
