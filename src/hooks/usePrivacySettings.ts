import { useState } from "react";
export function usePrivacySettings() {
  return { isPrivateAccount: false, defaultJournalVisibility: "public" as const, settings: null, loading: true, updateSettings: async () => ({}) };
}
