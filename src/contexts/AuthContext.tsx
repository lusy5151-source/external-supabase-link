import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { timeStart, timeEnd, shortId } from "@/lib/debugTiming";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let firstAuthChange = true;
    timeStart("auth:onAuthStateChange");

    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (firstAuthChange) {
        firstAuthChange = false;
        timeEnd("auth:onAuthStateChange", {
          event,
          uid: shortId(nextSession?.user?.id),
        });
      }
      applySession(nextSession);
    });

    timeStart("auth:getSession");
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        timeEnd("auth:getSession", { uid: shortId(session?.user?.id) });
        applySession(session);
      })
      .catch(() => {
        timeEnd("auth:getSession", { error: true });
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
