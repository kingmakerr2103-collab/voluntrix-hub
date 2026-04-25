import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ChatbotFAB } from "./ChatbotFAB";

export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-32">{children}</main>
      <ChatbotFAB />
      <BottomNav />
    </div>
  );
};
