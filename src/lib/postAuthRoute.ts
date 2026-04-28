import { supabase } from "@/integrations/supabase/client";

/**
 * Decide where to send a user after sign-in or sign-up.
 * - No role yet → /choose-role
 * - Has role but onboarding incomplete → /profile-setup
 * - Otherwise → fallback (default /dashboard)
 */
export async function resolvePostAuthRoute(userId: string, fallback = "/dashboard"): Promise<string> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (!roles || roles.length === 0) return "/choose-role";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.onboarding_complete) return "/profile-setup";
  return fallback;
}
