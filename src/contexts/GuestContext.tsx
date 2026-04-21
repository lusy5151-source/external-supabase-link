import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface GuestContextType {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  showLoginPrompt: () => void;
}

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
  showLoginPrompt: () => {},
});

export const useGuest = () => useContext(GuestContext);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGuest, setIsGuest] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const enterGuestMode = useCallback(() => setIsGuest(true), []);
  const exitGuestMode = useCallback(() => setIsGuest(false), []);
  const showLoginPrompt = useCallback(() => setPromptOpen(true), []);

  return (
    <GuestContext.Provider value={{ isGuest, enterGuestMode, exitGuestMode, showLoginPrompt }}>
      {children}
      <LoginPromptModal open={promptOpen} onOpenChange={setPromptOpen} />
    </GuestContext.Provider>
  );
};

function LoginPromptModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>로그인이 필요해요</AlertDialogTitle>
          <AlertDialogDescription>
            정상 인증과 기록은 로그인 후 이용할 수 있어요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <LoginButton onOpenChange={onOpenChange} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LoginButton({ onOpenChange }: { onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        onOpenChange(false);
        navigate("/auth");
      }}
      className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
      style={{ background: "#639922" }}
    >
      로그인하기
    </button>
  );
}
