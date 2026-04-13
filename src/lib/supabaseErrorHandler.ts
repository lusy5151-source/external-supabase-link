export function handleSupabaseError(error: any, context?: string) {
  console.error(`Supabase error${context ? ` (${context})` : ""}:`, error);
  return error?.message || "알 수 없는 오류가 발생했습니다";
}
