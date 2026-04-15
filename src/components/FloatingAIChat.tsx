import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function FloatingAIChat({ onDataChanged }: { onDataChanged?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workout-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: "⏳ Muitas requisições. Aguarde um momento e tente novamente." }]);
        return;
      }
      if (res.status === 402) {
        setMessages((prev) => [...prev, { role: "assistant", content: "💳 Créditos de IA esgotados." }]);
        return;
      }

      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        // If AI made changes, refresh workout data
        onDataChanged?.();
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Erro de conexão. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full gradient-primary shadow-lg flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform animate-slide-up"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-sm text-foreground">Assistente de Treino</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([])}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                title="Limpar conversa"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Olá! Sou seu assistente de treino 💪</p>
                <p className="text-xs mt-1">Peça pra criar, editar ou excluir treinos e exercícios!</p>
                <div className="mt-4 space-y-2">
                  {[
                    "Crie um treino de peito para segunda",
                    "Adicione supino 3x15 com 40kg no treino de peito",
                    "Liste meus treinos",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-foreground"
                    >
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-neutral max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-card pb-safe">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ex: Crie um treino de força..."
                className="flex-1 rounded-xl bg-muted border-none px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
