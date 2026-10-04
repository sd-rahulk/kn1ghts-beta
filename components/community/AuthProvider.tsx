"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import type { PublicProfile } from "@/backend/lib/schema";
import { clientAuth } from "@/lib/firebase-client";

type AuthState = {
  user: User | null; profile: PublicProfile | null; loading: boolean; error: string;
  token: () => Promise<string>; refreshProfile: () => Promise<void>; logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const token = useCallback(async () => {
    const auth = await clientAuth();
    if (!auth.currentUser) throw new Error("Sign in to continue.");
    return auth.currentUser.getIdToken();
  }, []);
  const refreshProfile = useCallback(async () => {
    const auth = await clientAuth(), current = auth.currentUser;
    if (!current) { setProfile(null); return; }
    const response = await fetch("/api/platform/profile", { cache: "no-store", headers: { Authorization: `Bearer ${await current.getIdToken()}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load your account.");
    setProfile(data.profile ?? null);
  }, []);
  useEffect(() => {
    let unsubscribe = () => {};
    void clientAuth().then((auth) => {
      unsubscribe = onIdTokenChanged(auth, (next) => {
        setUser(next); setError("");
        if (!next) { setProfile(null); setLoading(false); return; }
        void refreshProfile().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load your account.")).finally(() => setLoading(false));
      });
    }).catch((reason) => { setError(reason instanceof Error ? reason.message : "Account access is unavailable."); setLoading(false); });
    return () => unsubscribe();
  }, [refreshProfile]);
  const value = useMemo<AuthState>(() => ({ user, profile, loading, error, token, refreshProfile, logout: async () => signOut(await clientAuth()) }), [user, profile, loading, error, token, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMember() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useMember must be used inside AuthProvider.");
  return value;
}
