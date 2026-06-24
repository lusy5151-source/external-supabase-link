export type ProfileGateData = {
  is_onboarded: boolean | null;
  character_id: string | null;
  character_selected_at: string | null;
};

export type ProfileGateCacheValue = ProfileGateData | "missing";

const profileGateCache = new Map<string, ProfileGateCacheValue>();

export function getCachedProfileGate(userId: string) {
  return profileGateCache.get(userId);
}

export function setCachedProfileGate(userId: string, value: ProfileGateCacheValue) {
  profileGateCache.set(userId, value);
}

export function markProfileGateOnboardingComplete(userId: string) {
  const previous = profileGateCache.get(userId);
  const base: ProfileGateData =
    previous && previous !== "missing"
      ? previous
      : { is_onboarded: true, character_id: null, character_selected_at: null };

  profileGateCache.set(userId, { ...base, is_onboarded: true });
}

export function markProfileGateCharacterComplete(userId: string) {
  const previous = profileGateCache.get(userId);
  const base: ProfileGateData =
    previous && previous !== "missing"
      ? previous
      : { is_onboarded: true, character_id: null, character_selected_at: null };

  profileGateCache.set(userId, {
    ...base,
    character_id: base.character_id ?? "selected",
    character_selected_at: new Date().toISOString(),
  });
}
