import { useState, useCallback, useEffect } from "react";
export type GearCategory = "베이스레이어" | "재킷" | "바지" | "장갑" | "신발" | "액세서리";
export const gearCategories: GearCategory[] = ["베이스레이어", "재킷", "바지", "장갑", "신발", "액세서리"];
export interface GearItem { id: string; name: string; category: GearCategory; notes: string; photo: string; weatherTags: string[]; }
const STORAGE_KEY = "korea-100-gear";
function loadGear(): GearItem[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveGear(items: GearItem[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
export function useGearStore() {
  const [items, setItems] = useState<GearItem[]>(loadGear);
  useEffect(() => { saveGear(items); }, [items]);
  const addItem = useCallback((item: Omit<GearItem, "id">) => { setItems((prev) => [...prev, { ...item, id: Date.now().toString() }]); }, []);
  const updateItem = useCallback((id: string, updates: Partial<GearItem>) => { setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g))); }, []);
  const removeItem = useCallback((id: string) => { setItems((prev) => prev.filter((g) => g.id !== id)); }, []);
  const getByCategory = useCallback((cat: GearCategory) => items.filter((g) => g.category === cat), [items]);
  return { items, addItem, updateItem, removeItem, getByCategory };
}