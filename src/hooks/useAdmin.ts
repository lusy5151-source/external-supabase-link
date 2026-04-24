import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      setLoading(true);

      // 1) Check profiles.role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = (profile as any)?.role;
      let admin = role === "admin" || role === "superadmin";
      const superAdmin = role === "superadmin";

      // 2) Fallback: legacy user_roles table
      if (!admin) {
        const { data: roleRow } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        admin = !!roleRow;
      }

      setIsAdmin(admin);
      setIsSuperAdmin(superAdmin);
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, isSuperAdmin, loading };
}
