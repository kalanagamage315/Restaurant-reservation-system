import { http } from "./http";
import type { AuthResponse, Role } from "../types/api";

export function register(payload: {
  email: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
  role?: Role;
}) {
  return http.post<AuthResponse>("/identity/register", payload).then((r) => r.data);
}

export function login(payload: { email: string; password: string }) {
  return http.post<AuthResponse>("/identity/login", payload).then((r) => r.data);
}

export function logout(payload: { refreshToken: string }) {
  return http.post<{ success: boolean }>("/identity/logout", payload).then((r) => r.data);
}
