import { Capacitor } from "@capacitor/core";

interface SharePayload {
  title: string;
  text: string;
  url?: string;
  dialogTitle?: string;
}

export async function shareText(payload: SharePayload) {
  const { title, text, url, dialogTitle } = payload;

  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable?.("Share")) {
      const { Share } = await import("@capacitor/share");
      const canShare = await Share.canShare().catch(() => ({ value: true }));
      if (canShare.value) {
        await Share.share({ title, text, url, dialogTitle: dialogTitle || title });
        return "shared";
      }
    }

    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error: any) {
    if (error?.message?.toLowerCase?.().includes("cancel")) return "cancelled";
    if (error?.name === "AbortError") return "cancelled";
  }

  const fallback = [text, url].filter(Boolean).join("\n");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(fallback);
    return "copied";
  }

  return "unsupported";
}

export function getProfileShareUrl(userId: string) {
  return `https://wandeung.com/profile/${userId}`;
}

export function getGroupShareUrl(groupId: string) {
  return `https://wandeung.com/groups/${groupId}`;
}
