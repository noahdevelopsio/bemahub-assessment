/**
 * Shared axios instance.
 *
 * The request interceptor is wired for you: it attaches the stored bearer
 * token. You should not need to set the Authorization header by hand anywhere
 * else in the app.
 *
 * The RESPONSE interceptor is deliberately incomplete - see TASK-2.
 */
import axios, { AxiosError } from "axios";
import { getStoredToken, useAuthStore } from "@/lib/auth/authStore";
import type { ApiError as ApiErrorPayload } from "@/lib/types/api";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/wp-json/bemalearn/v1";

export class ApiClientError extends Error {
  readonly isTransportError: boolean;
  readonly status?: number;
  readonly code?: string;
  readonly responseData?: ApiErrorPayload | unknown;

  constructor(params: {
    message: string;
    isTransportError: boolean;
    status?: number;
    code?: string;
    responseData?: ApiErrorPayload | unknown;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.isTransportError = params.isTransportError;
    this.status = params.status;
    this.code = params.code;
    this.responseData = params.responseData;
  }
}

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        useAuthStore.getState().signOut();
      }

      const message = data?.message || error.message || "An error occurred";
      const code = data?.code;

      return Promise.reject(
        new ApiClientError({
          message,
          isTransportError: false,
          status,
          code,
          responseData: data,
        })
      );
    }

    return Promise.reject(
      new ApiClientError({
        message: "Unable to connect to the server. Please check your network connection.",
        isTransportError: true,
      })
    );
  }
);

export default api;

