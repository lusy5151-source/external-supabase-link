import React, { createContext, useContext } from "react";
import { useMountainStore } from "@/hooks/useMountainStore";

type StoreContextType = ReturnType<typeof useMountainStore>;

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useMountainStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
