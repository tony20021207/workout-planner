import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  auth,
  onAuthStateChanged,
  firebaseSignOut,
  type User as FirebaseUser,
} from "@/lib/firebase";

export type AuthUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null;

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  user: AuthUser;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => void;
  getToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // When Firebase user changes, sync with the DB via tRPC auth.me
  useEffect(() => {
    if (!firebaseUser) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const token = await firebaseUser.getIdToken();
        const response = await fetch("/api/trpc/auth.me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data?.result?.data) {
          setUser(data.result.data);
        } else {
          setUser(null);
        }
        setError(null);
      } catch (err) {
        console.error("[Auth] Failed to fetch user:", err);
        setError(err as Error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [firebaseUser, refreshCounter]);

  const logout = useCallback(async () => {
    await firebaseSignOut();
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    logout,
    refresh,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
