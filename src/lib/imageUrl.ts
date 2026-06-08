/**
 * Normalize image URLs to https:// to avoid Mixed Content warnings
 * when the app is served over HTTPS. Kakao CDN and many legacy avatar
 * URLs come back as http:// — those work over http but get blocked by
 * the browser on an https page.
 */
export function normalizeImageUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  if (typeof url !== "string") return url;
  // Protocol-relative URL → assume https
  if (url.startsWith("//")) return ("https:" + url) as T;
  if (url.startsWith("http://")) return ("https://" + url.slice("http://".length)) as T;
  return url;
}
