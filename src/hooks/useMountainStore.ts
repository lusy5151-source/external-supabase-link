import { useState, useCallback, useEffect } from "react";

export type WeatherCondition = "맑음" | "구름" | "흐림" | "비" | "눈" | "안개" | "";

export interface CompletionRecord {
  id: string;
  mountainId: number;
  completedAt: string;
  notes: string;
  weather: WeatherCondition;
  photos: string[];
  taggedFriends?: string[];
  courseName?: string;
  courseStartingPoint?: string;
  courseNotes?: string;
  duration?: string;
  difficulty?: string;
}

const STORAGE_KEY = "korea-100-mountains";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadRecords(): CompletionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompletionRecord[];
    return parsed.map((r) => ({ ...r, id: r.id || generateId() }));
  } catch { return []; }
}

function saveRecords(records: CompletionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function useMountainStore() {
  const [records, setRecords] = useState<CompletionRecord[]>(loadRecords);
  useEffect(() => { saveRecords(records); }, [records]);

  const isCompleted = useCallback((id: number) => records.some((r) => r.mountainId === id), [records]);
  const getRecord = useCallback((id: number) => {
    const mountainRecords = records.filter((r) => r.mountainId === id);
    return mountainRecords.length === 0 ? undefined : mountainRecords[mountainRecords.length - 1];
  }, [records]);
  const getRecords = useCallback((id: number) => records.filter((r) => r.mountainId === id), [records]);
  const getCompletionCount = useCallback((id: number) => records.filter((r) => r.mountainId === id).length, [records]);

  const addCompletion = useCallback((id: number) => {
    setRecords((prev) => [...prev, { id: generateId(), mountainId: id, completedAt: new Date().toISOString(), notes: "", weather: "", photos: [], taggedFriends: [], courseName: "", courseStartingPoint: "", courseNotes: "", duration: "", difficulty: "" }]);
  }, []);

  const removeCompletion = useCallback((recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  }, []);

  const toggleComplete = useCallback((id: number) => {
    setRecords((prev) => {
      if (prev.some((r) => r.mountainId === id)) return prev.filter((r) => r.mountainId !== id);
      return [...prev, { id: generateId(), mountainId: id, completedAt: new Date().toISOString(), notes: "", weather: "", photos: [], taggedFriends: [], courseName: "", courseStartingPoint: "", courseNotes: "", duration: "", difficulty: "" }];
    });
  }, []);

  const updateRecord = useCallback((id: number, updates: Partial<CompletionRecord>) => {
    setRecords((prev) => {
      const lastIndex = prev.map((r, i) => (r.mountainId === id ? i : -1)).filter((i) => i !== -1).pop();
      if (lastIndex === undefined) return prev;
      return prev.map((r, i) => (i === lastIndex ? { ...r, ...updates } : r));
    });
  }, []);

  const updateNotes = useCallback((id: number, notes: string) => updateRecord(id, { notes }), [updateRecord]);
  const updateDate = useCallback((id: number, date: string) => updateRecord(id, { completedAt: date }), [updateRecord]);
  const updateWeather = useCallback((id: number, weather: WeatherCondition) => updateRecord(id, { weather }), [updateRecord]);
  const addPhotos = useCallback((id: number, newPhotos: string[]) => {
    setRecords((prev) => {
      const lastIndex = prev.map((r, i) => (r.mountainId === id ? i : -1)).filter((i) => i !== -1).pop();
      if (lastIndex === undefined) return prev;
      return prev.map((r, i) => i === lastIndex ? { ...r, photos: [...(r.photos || []), ...newPhotos] } : r);
    });
  }, []);
  const removePhoto = useCallback((id: number, index: number) => {
    setRecords((prev) => {
      const lastIndex = prev.map((r, i) => (r.mountainId === id ? i : -1)).filter((i) => i !== -1).pop();
      if (lastIndex === undefined) return prev;
      return prev.map((r, i) => i === lastIndex ? { ...r, photos: (r.photos || []).filter((_, pi) => pi !== index) } : r);
    });
  }, []);
  const updateTaggedFriends = useCallback((id: number, taggedFriends: string[]) => updateRecord(id, { taggedFriends }), [updateRecord]);
  const updateCourseInfo = useCallback((id: number, course: { courseName?: string; courseStartingPoint?: string; courseNotes?: string }) => updateRecord(id, course), [updateRecord]);
  const updateDuration = useCallback((id: number, duration: string) => updateRecord(id, { duration }), [updateRecord]);
  const updateDifficulty = useCallback((id: number, difficulty: string) => updateRecord(id, { difficulty }), [updateRecord]);

  const completedCount = new Set(records.map((r) => r.mountainId)).size;
  const totalCompletions = records.length;

  return { records, isCompleted, getRecord, getRecords, getCompletionCount, addCompletion, removeCompletion, toggleComplete, updateNotes, updateDate, updateWeather, addPhotos, removePhoto, updateTaggedFriends, updateCourseInfo, updateDuration, updateDifficulty, completedCount, totalCompletions };
}