import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

let sessionStore: Session | null = null;
const subscribers = new Set<(s: Session | null) => void>();
let initialized = false;

const setSessionStore = (s: Session | null) => {
  sessionStore = s;
  subscribers.forEach((cb) => cb(s));
};

const init = async () => {
  if (initialized) return;
  initialized = true;

  try {
    const { data } = await supabase.auth.getSession();
    setSessionStore(data.session ?? null);
  } catch (e) {
    // ignore
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setSessionStore(session);
  });
};

export function useAuthViewModel() {
  const [session, setSession] = useState<Session | null>(sessionStore);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    init();
    const cb = (s: Session | null) => setSession(s);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []);

  const signUp = async (opts: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    redirectTo?: string;
  }) => {
    setIsProcessing(true);
    try {
      const { email, password, firstName, lastName, redirectTo } = opts;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      return { data, error };
    } finally {
      setIsProcessing(false);
    }
  };

  const signIn = async (opts: { email: string; password: string }) => {
    setIsProcessing(true);
    try {
      const { email, password } = opts;
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const signOut = async () => {
    setIsProcessing(true);
    try {
      return await supabase.auth.signOut();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      return { error };
    } finally {
      setIsProcessing(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { data, error };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    session,
    user: session?.user ?? null,
    isProcessing,
    isAuthenticated: !!session?.user,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    getSession: () => session,
  } as const;
}
