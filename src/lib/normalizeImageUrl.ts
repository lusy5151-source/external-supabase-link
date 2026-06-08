/**
 * Upgrade insecure (http://) image URLs to https:// to avoid Mixed Content warnings.
 * Primary targets: Kakao CDN (k.kakaocdn.net, t1.kakaocdn.net), but applied generally
 * to any http:// image URL since modern CDNs all support https.
 */
export function normalizeImageUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("http://")) {
    return ("https://" + url.slice("http://".length)) as T;
  }
  return url;
}
