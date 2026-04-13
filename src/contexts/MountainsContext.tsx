import React, { createContext, useContext } from "react";
import { useMountainsData } from "@/hooks/useMountainsData";
import type { Mountain } from "@/data/mountains";

interface MountainsContextType {
  mountains: Mountain[];
  isLoading: boolean;
}

const MountainsContext = createContext<MountainsContextType>({
  mountains: [],
  isLoading: true,
});

export const MountainsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: mountains = [], isLoading } = useMountainsData();
  return (
    <MountainsContext.Provider value={{ mountains, isLoading }}>
      {children}
    </MountainsContext.Provider>
  );
};

export function useMountains() {
  return useContext(MountainsContext);
}
