import { supabase } from "@/integrations/supabase/client";

interface DeletableSummitClaim {
  id: string;
  user_id: string;
  photo_url?: string | null;
}

function getSummitPhotoPath(publicUrl?: string | null) {
  if (!publicUrl) return null;
  const marker = "/summit-photos/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  const path = publicUrl.slice(markerIndex + marker.length).split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export async function deleteSummitClaimRecord(claim: DeletableSummitClaim, currentUserId?: string | null) {
  if (!currentUserId) throw new Error("로그인이 필요합니다");
  if (claim.user_id !== currentUserId) throw new Error("내 정상인증만 삭제할 수 있습니다");

  await (supabase as any)
    .from("user_mountain_challenges")
    .delete()
    .eq("summit_claim_id", claim.id)
    .eq("user_id", currentUserId);

  const { error } = await (supabase as any)
    .from("summit_claims")
    .delete()
    .eq("id", claim.id)
    .eq("user_id", currentUserId);

  if (error) throw error;

  const photoPath = getSummitPhotoPath(claim.photo_url);
  if (photoPath) {
    void supabase.storage.from("summit-photos").remove([photoPath]);
  }

  try {
    window.dispatchEvent(new Event("wandeung_summit_claim_changed"));
    window.dispatchEvent(new Event("wandeung_journal_changed"));
  } catch {}
}
