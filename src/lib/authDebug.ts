import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const normalizeProvider = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;

const summarizeIdentities = (user: User | null) =>
  (user?.identities ?? []).map((identity) => ({
    id: identity.identity_id,
    provider: normalizeProvider(identity.provider),
    userId: identity.user_id,
  }));

const collectProviders = (user: User | null) => {
  const providers = new Set<string>();

  const appProvider = normalizeProvider(user?.app_metadata?.provider);
  if (appProvider) providers.add(appProvider);

  const appProviders = Array.isArray(user?.app_metadata?.providers)
    ? user?.app_metadata?.providers
    : [];

  appProviders
    .map(normalizeProvider)
    .filter((provider): provider is string => Boolean(provider))
    .forEach((provider) => providers.add(provider));

  summarizeIdentities(user)
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider))
    .forEach((provider) => providers.add(provider));

  return Array.from(providers);
};

export async function getClientAuthDebugState() {
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const user = userData.user ?? sessionData.session?.user ?? null;
  let profileProvider: string | null = null;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("provider")
      .eq("user_id", user.id)
      .maybeSingle();

    profileProvider = normalizeProvider(profile?.provider);
  }

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    identities: summarizeIdentities(user),
    appProvider: normalizeProvider(user?.app_metadata?.provider),
    providerCandidates: collectProviders(user),
    profileProvider,
  };
}

export type AuthProbeVerdict = "success" | "email_confirmation" | "timeout" | "reachable" | "failure";

export function classifyAuthProbeResult({
  errorMessage,
  hasSession,
  hasUser,
}: {
  errorMessage?: string | null;
  hasSession: boolean;
  hasUser: boolean;
}): AuthProbeVerdict {
  const normalizedMessage = normalizeProvider(errorMessage)?.replace(/-/g, " ") ?? "";

  if (hasSession) return "success";
  if (/timed out|timeout|deadline exceeded|upstream request timeout|request timeout/.test(normalizedMessage)) {
    return "timeout";
  }
  if (/email not confirmed|confirmation|verify/.test(normalizedMessage)) return "email_confirmation";
  if (hasUser) return "reachable";
  return "failure";
}

export async function logClientAuthDebug(label: string, extra: Record<string, unknown> = {}) {
  const state = await getClientAuthDebugState();
  const payload = { label, ...state, ...extra };
  console.log("[auth-debug]", payload);
  return payload;
}