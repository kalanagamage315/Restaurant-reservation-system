import axios, { AxiosError } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Shared axios instance used by all API modules.
export const http = axios.create({
  baseURL: API_BASE,
});

// Named and default exports both provided to support various import styles.
export default http;

function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

// Request interceptor: attaches the Bearer token to all non-auth requests.
http.interceptors.request.use((config) => {
  const url = config.url ?? "";

  // Auth endpoints do not require a token — skip attachment to avoid header issues.
  const isAuthRoute =
    url.includes("/identity/login") ||
    url.includes("/identity/register") ||
    url.includes("/identity/refresh") ||
    url.includes("/identity/logout");

  if (!isAuthRoute) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  return config;
});


let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function queueRefresh(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}
function flushQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;

    // Axios config type is messy across versions, so keep it flexible
    const original: any = err.config;

    if (status === 401 && original && !original._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return Promise.reject(err);

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queueRefresh((newToken) => {
            if (!newToken) return reject(err);
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(http(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const resp = await axios.post(
          `${API_BASE}/identity/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccessToken = (resp.data as { accessToken: string }).accessToken;
        localStorage.setItem("accessToken", newAccessToken);

        flushQueue(newAccessToken);

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return http(original);
      } catch (refreshErr) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        flushQueue(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
