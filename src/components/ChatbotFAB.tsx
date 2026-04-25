import { useState } from "react";
import { MessageCircleHeart, X, Send, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const ChatbotFAB = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const hidden = ["/login", "/register", "/forgot-password", "/profile-setup", "/", "/welcome", "/chat"].includes(
    location.pathname,
  );
  if (hidden) return null;

  return (
    <>
      <button
        aria-label="Open Voluntrix assistant"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-30 right-4 bottom-24 h-14 w-14 rounded-full bg-gradient-cta shadow-glow-cta",
          "flex items-center justify-center text-accent-foreground transition-transform hover:scale-105 active:scale-95",
        )}
      >
        <span className="absolute inset-0 rounded-full bg-accent/40 animate-pulse-ring" aria-hidden />
        <MessageCircleHeart className="h-6 w-6 relative" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-up">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-lg overflow-hidden animate-scale-in">
            <div className="bg-gradient-hero px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-display font-semibold">Vox · AI assistant</h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%]">
                Hi! I'm Vox 👋 Looking for opportunities near you, or want help managing a project?
              </div>
              <div className="flex flex-wrap gap-2">
                {["Find urgent needs", "Match my skills", "How do I apply?"].map((s) => (
                  <button
                    key={s}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <input
                placeholder="Ask anything…"
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="icon" variant="hero">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
