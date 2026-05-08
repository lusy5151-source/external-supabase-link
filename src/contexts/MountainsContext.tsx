import React, { createContext, useContext } from "react";
import { useMountainsData } from "@/hooks/useMountainsData";
import type { Mountain } from "@/data/mountains";

interface MountainsContextType {
  mountains: Mountain[];
  isLoading: boolean;
  getMountain: (id: number | string | undefined | null) => Mountain | undefined;
}

const MountainsContext = createContext<MountainsContextType>({
  mountains: [],
  isLoading: true,
  getMountain: () => undefined,
});

export const MountainsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: mountains = [], isLoading } = useMountainsData();
  const getMountain = React.useCallback(
    (id: number | string | undefined | null) => {
      if (id === undefined || id === null) return undefined;
      const numId = typeof id === "string" ? Number(id) : id;
      return mountains.find((m) => m.id === numId);
    },
    [mountains]
  );
  return (
    <MountainsContext.Provider value={{ mountains, isLoading, getMountain }}>
      {children}
    </MountainsContext.Provider>
  );
};

export function useMountains() {
  return useContext(MountainsContext);
}
