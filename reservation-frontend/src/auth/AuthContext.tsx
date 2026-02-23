import React, { createContext, useContext, useMemo, useState } from "react";
import type { AuthUser, AuthResponse, Role } from "../types/api";
import * as AuthApi from "../api/auth.api";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName?: string;
    phoneNumber?: string;
    role?: Role;
  }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;

  // Merges a partial user update into the auth state and persists it to localStorage.
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadState(): AuthState {
  const userRaw = localStorage.getItem("user");
  return {
    user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadState());

  const value = useMemo<AuthContextValue>(() => {
    async function applyAuth(resp: AuthResponse) {
      localStorage.setItem("user", JSON.stringify(resp.user));
      localStorage.setItem("accessToken", resp.accessToken);
      localStorage.setItem("refreshToken", resp.refreshToken);
      setState({ user: resp.user, accessToken: resp.accessToken, refreshToken: resp.refreshToken });
    }

    return {
      ...state,
      async login(email, password) {
        const resp = await AuthApi.login({ email, password });
        await applyAuth(resp);
      },
      async register(payload) {
        const resp = await AuthApi.register(payload);
        await applyAuth(resp);
      },
      async logout() {
        const rt = localStorage.getItem("refreshToken");
        if (rt) {
          try {
            await AuthApi.logout({ refreshToken: rt });
          } catch {
            // Best-effort logout — safe to ignore server errors here.
          }
        }
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setState({ user: null, accessToken: null, refreshToken: null });
      },
      hasRole(...roles) {
        if (!state.user) return false;
        return state.user.roles.some((r) => roles.includes(r));
      },

      updateUser(patch) {
        if (!state.user) return;
        const next = { ...state.user, ...patch };
        localStorage.setItem("user", JSON.stringify(next));
        setState({ ...state, user: next });
      },
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}