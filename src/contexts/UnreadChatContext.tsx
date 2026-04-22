import React, { createContext, useContext, useState, useCallback } from "react";

interface UnreadChatContextType {
  unreadChatCount: number;
  increment: () => void;
  reset: () => void;
}

const UnreadChatContext = createContext<UnreadChatContextType>({
  unreadChatCount: 0,
  increment: () => {},
  reset: () => {},
});

export const useUnreadChat = () => useContext(UnreadChatContext);

export const UnreadChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const increment = useCallback(() => setUnreadChatCount((c) => c + 1), []);
  const reset = useCallback(() => setUnreadChatCount(0), []);

  return (
    <UnreadChatContext.Provider value={{ unreadChatCount, increment, reset }}>
      {children}
    </UnreadChatContext.Provider>
  );
};
