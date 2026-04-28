import { toUserMessage } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [active, setActive] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get conversations user participates in
      const { data: parts, error: e1 } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (e1) {
        toast({ title: "Couldn't load chats", description: e1.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const ids = (parts ?? []).map((p) => p.conversation_id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data: convs } = await supabase.from("conversations").select("*").in("id", ids).order("updated_at", { ascending: false });
      setConversations((convs ?? []) as Conversation[]);

      // Load other participants' profiles for DMs
      const { data: allParts } = await supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids);
      const otherUserIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id).filter((id) => id !== user.id)));
      if (otherUserIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("*").in("user_id", otherUserIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p) => (map[p.user_id] = p as Profile));
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [user]);

  if (active) {
    return <ConversationView conversation={active} onBack={() => setActive(null)} otherProfile={undefined} />;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Inbox</p>
          <h1 className="text-3xl font-display font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1 text-sm">Chats with organizers and teammates.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
            <div className="h-16 w-16 rounded-2xl bg-gradient-trust mx-auto flex items-center justify-center text-secondary-foreground mb-3">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-bold">No chats yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Apply to an opportunity to start the conversation.</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-card border border-border overflow-hidden animate-fade-up">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors border-b border-border last:border-0 text-left"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-impact flex items-center justify-center text-primary-foreground font-display font-bold shrink-0">
                  {(c.title ?? "C").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{c.title ?? (c.is_group ? "Group chat" : "Direct message")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const ConversationView = ({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
  otherProfile?: Profile;
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) toast({ title: "Couldn't load messages", description: error.message, variant: "destructive" });
      setMessages((data ?? []) as Message[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
      setInput(content);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-7rem)]">
        <header className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-border bg-background sticky top-0 z-10">
          <button onClick={onBack} className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-2xl bg-gradient-impact flex items-center justify-center text-primary-foreground font-display font-bold">
            {(conversation.title ?? "C").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold truncate">{conversation.title ?? "Chat"}</h2>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active now</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender_id === user?.id ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-3xl px-4 py-2.5 text-sm",
                    m.sender_id === user?.id
                      ? "bg-gradient-impact text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-background flex gap-2 sticky bottom-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Type a message…"
            className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button variant="hero" size="icon" onClick={send} disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default Messages;
