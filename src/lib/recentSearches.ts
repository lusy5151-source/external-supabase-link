const KEY = "wandeung_recent_searches";
const MAX = 8;

export interface RecentSearch {
  id: number;
  name: string;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.id === "number" && typeof x.name === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecentSearch(item: RecentSearch) {
  if (!item || typeof item.id !== "number" || !item.name) return;
  const list = getRecentSearches().filter((x) => x.id !== item.id);
  list.unshift(item);
  const trimmed = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new Event("wandeung_recent_searches_updated"));
  } catch {}
}

export function removeRecentSearch(id: number) {
  const list = getRecentSearches().filter((x) => x.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("wandeung_recent_searches_updated"));
  } catch {}
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("wandeung_recent_searches_updated"));
  } catch {}
}
