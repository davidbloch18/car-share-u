import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";

export function useProfileViewModel() {
  const { session } = useAuthViewModel();
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setIsLoading(false);
    if (!error) setProfile(data);
    return { data, error };
  }, [session]);

  const updateProfile = useCallback(async (payload: { first_name?: string; last_name?: string; phone?: string | null; bit_link?: string | null; gender?: string }) => {
    if (!session?.user) return { error: new Error("Not authenticated") };
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        email: session.user.email ?? "",
        ...payload,
        updated_at: new Date().toISOString(),
      });
    setIsLoading(false);
    if (!error) await fetchProfile();
    return { error };
  }, [session, fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    fetchProfile,
    updateProfile,
  } as const;
}
