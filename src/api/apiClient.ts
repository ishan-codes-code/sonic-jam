import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "../utils/tokenStorage";

// export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const BASE_URL = "http://10.11.125.82:3000";


// console.log('BASE_URL', BASE_URL);

// --------------------------------------------------------------------------
// Axios instance
// --------------------------------------------------------------------------
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 minutes (up to 300s for heavy downloads)
  headers: { "Content-Type": "application/json" },
});

// --------------------------------------------------------------------------
// Request interceptor – attach access token
// --------------------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --------------------------------------------------------------------------
// Response interceptor – transparent token refresh on 401
// --------------------------------------------------------------------------
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
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
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
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens + trigger logout via the auth store
      await tokenStorage.clearTokens();
      // Lazy import to avoid circular dependency
      const { useAuthStore } = await import("../store/authStore");
      useAuthStore.getState().resetAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
