import { Bot, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Decorative product visual for the marketing hero — a stylized
// recreation of the Inbox's hybrid (IA + humano) handoff, built from
// plain JSX/Tailwind. Not a screenshot of the real app and not meant
// to be pixel-accurate; it exists to make the headline's promise
// ("IA atende, humano assume na hora certa") visible at a glance.
const CONVERSATIONS = [
  { initials: "MC", name: "Marina Costa", message: "Quero entender como funciona o plano...", time: "14:02", active: true, unread: false },
  { initials: "PL", name: "Pedro Lima", message: "Pode me mandar o catálogo?", time: "13:47", active: false, unread: true },
  { initials: "SV", name: "Studio Vega", message: "Obrigado pelo atendimento!", time: "12:30", active: false, unread: false },
];

const MESSAGES = [
  { from: "contact" as const, text: "Oi! Vi o anúncio de vocês, queria entender como funciona." },
  { from: "ai" as const, text: "Olá! Posso te ajudar agora. Hoje vocês já atendem pelo WhatsApp?" },
  { from: "contact" as const, text: "Sim, mas perdemos muito lead fora do horário." },
  { from: "system" as const, text: "Conversa qualificada — transferida para Ana (vendas) às 14:02" },
  { from: "human" as const, text: "Oi, aqui é a Ana! Me conta um pouco mais sobre sua operação?" },
];

export function ProductMockup() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-4xl" aria-hidden="true">
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 20%, #2f5fff, transparent 60%), radial-gradient(circle at 80% 75%, #8b5cf6, transparent 60%)",
        }}
      />

      <div className="shadow-wavon-glow overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-wavon-gradient h-2 w-2 rounded-full" />
            <span className="text-xs font-medium text-muted-foreground">Inbox · WAVON</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
            Atendimento em tempo real
          </span>
        </div>

        <div className="grid sm:grid-cols-[220px_1fr]">
          <div className="border-b border-border sm:border-r sm:border-b-0">
            {CONVERSATIONS.map((c) => (
              <div
                key={c.name}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0",
                  c.active && "bg-primary/5",
                )}
              >
                <div className="bg-wavon-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white">
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.message}</p>
                </div>
                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-5 text-left">
            {MESSAGES.map((m, i) => {
              if (m.from === "system") {
                return (
                  <p key={i} className="py-1 text-center text-[11px] text-muted-foreground">
                    {m.text}
                  </p>
                );
              }
              if (m.from === "ai") {
                return (
                  <div key={i} className="flex max-w-[80%] flex-col gap-1">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Bot className="h-3 w-3" />
                      IA
                    </span>
                    <p className="rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground">
                      {m.text}
                    </p>
                  </div>
                );
              }
              if (m.from === "human") {
                return (
                  <div key={i} className="flex max-w-[80%] flex-col items-end gap-1 self-end">
                    <span className="text-[11px] font-medium text-muted-foreground">Ana · Vendas</span>
                    <p className="bg-wavon-gradient rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-white">
                      {m.text}
                    </p>
                  </div>
                );
              }
              return (
                <p key={i} className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2 text-sm text-foreground">
                  {m.text}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute -top-4 -right-3 hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg sm:flex">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Resposta em segundos
      </div>
    </div>
  );
}
