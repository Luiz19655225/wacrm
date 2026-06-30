"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationInsights, InsightScoreLabel, InsightSentiment } from "@/lib/ai/inbox-assistant";

interface WaviInsightsPanelProps {
  conversationId: string | null;
}

const SCORE_COLORS: Record<InsightScoreLabel, string> = {
  Perdido: "bg-zinc-500",
  Frio: "bg-blue-500",
  Morno: "bg-amber-500",
  Quente: "bg-orange-500",
  Cliente: "bg-emerald-500",
  Indefinido: "bg-muted",
};

const SCORE_TEXT_COLORS: Record<InsightScoreLabel, string> = {
  Perdido: "text-zinc-400",
  Frio: "text-blue-400",
  Morno: "text-amber-400",
  Quente: "text-orange-400",
  Cliente: "text-emerald-400",
  Indefinido: "text-muted-foreground",
};

const SENTIMENT_CONFIG: Record<InsightSentiment, { label: string; className: string }> = {
  Positivo: { label: "Positivo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  Neutro: { label: "Neutro", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  Negativo: { label: "Negativo", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export function WaviInsightsPanel({ conversationId }: WaviInsightsPanelProps) {
  const [insights, setInsights] = useState<ConversationInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInsights = useCallback(async (convId: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ai/inbox/insights?conversation_id=${encodeURIComponent(convId)}`,
        { signal: ctrl.signal },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        // 422 = IA não configurada — não é erro crítico, só não mostra o painel
        if (res.status === 422) {
          setInsights(null);
          return;
        }
        setError(body.error ?? "Falha ao carregar insights.");
        return;
      }
      const data = await res.json() as ConversationInsights;
      setInsights(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Falha ao carregar insights da WAVI.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setInsights(null);
      setError(null);
      return;
    }
    void fetchInsights(conversationId);
    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId, fetchInsights]);

  if (!conversationId) return null;

  return (
    <div data-testid="wavi-insights-panel" className="border-t border-border">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            WAVI Insights
          </span>
        </div>
        <div className="flex items-center gap-1">
          {loading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {!loading && conversationId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void fetchInsights(conversationId);
              }}
              className="rounded p-0.5 hover:bg-muted text-muted-foreground"
              title="Atualizar insights"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Loading skeleton */}
          {loading && !insights && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 12}%` }} />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Insights content */}
          {insights && !loading && (
            <div className="space-y-3" data-testid="wavi-insights-content">

              {/* Score + label */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
                  <span className={cn("text-[11px] font-semibold", SCORE_TEXT_COLORS[insights.scoreLabel])}>
                    {insights.scoreLabel} · {insights.score}/100
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", SCORE_COLORS[insights.scoreLabel])}
                    style={{ width: `${insights.score}%` }}
                  />
                </div>
              </div>

              {/* Intenção */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Intenção</p>
                <p className="text-xs text-foreground leading-snug">{insights.intent}</p>
              </div>

              {/* Sentimento */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sentimento</span>
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  SENTIMENT_CONFIG[insights.sentiment].className,
                )}>
                  {SENTIMENT_CONFIG[insights.sentiment].label}
                </span>
              </div>

              {/* Próxima ação */}
              <div className="rounded-lg bg-primary/8 border border-primary/15 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Próxima ação</span>
                </div>
                <p className="text-xs text-foreground leading-snug">{insights.nextAction}</p>
              </div>

              {/* Sugestão de estágio */}
              {insights.stageSuggestion && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sugestão de estágio</p>
                  <span className="rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                    → {insights.stageSuggestion}
                  </span>
                </div>
              )}

              {/* Alertas */}
              {insights.alerts.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Alertas</p>
                  <div className="flex flex-wrap gap-1">
                    {insights.alerts.map((alert, i) => (
                      <span key={i} className="rounded-full bg-amber-500/12 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                        {alert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Em risco */}
              {insights.atRisk && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-red-400">Cliente em risco</p>
                    {insights.riskReason && (
                      <p className="text-[10px] text-red-400/80 mt-0.5">{insights.riskReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
