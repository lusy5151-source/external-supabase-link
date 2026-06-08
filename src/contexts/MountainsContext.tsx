import React, { createContext, useContext } from "react";
import { useMountainsData, useIdleEnabled } from "@/hooks/useMountainsData";
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
  // Defer the network fetch until the browser is idle so the home/Dashboard
  // first paint isn't blocked by the mountains_list request. The session cache
  // still hydrates instantly on warm navigations.
  const enabled = useIdleEnabled(400);
  const { data: mountains = [], isLoading } = useMountainsData({ enabled });
  const getMountain = React.useCallback(
    (id: number | string | undefined | null) => {
      if (id === undefined || id === null) return undefined;
      const numId = typeof id === "string" ? Number(id) : id;
      return mountains.find((m) => m.id === numId);
    },
    [mountains]
  );
  return (
    <MountainsContext.Provider value={{ mountains, isLoading: enabled && isLoading }}>
      {children}
    </MountainsContext.Provider>
  );
};

// NOTE: getMountain re-added below for backward compatibility.


export function useMountains() {
  return useContext(MountainsContext);
}
