"use client";

import { useCallback, useMemo, useState, useTransition, type TransitionStartFunction } from "react";
import {
  createAppSupportConversation,
  markAppConversationSeen,
  sendAppSupportMessage,
} from "@/lib/actions/app-assistance";
import {
  CATEGORY_BY_KEY,
  STATUS_BY_KEY,
  SUPPORT_CATEGORIES,
  SUPPORT_MESSAGE_MAX,
} from "@/lib/assistance";
import type { SupportAuthorType, SupportCategory, SupportStatus } from "@/lib/db/types";

interface SupportMessage {
  id: string;
  author_type: SupportAuthorType;
  author_label: string | null;
  content: string;
  created_at: string;
}

interface SupportConversation {
  id: string;
  category: SupportCategory;
  status: SupportStatus;
  context: Record<string, unknown>;
  created_at: string;
  last_message_at: string;
  messages: SupportMessage[];
  unread: number;
}

interface SupportData {
  conversations: SupportConversation[];
  unreadTotal: number;
}

type Screen = "home" | "category" | "compose" | "thread";

function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    timeZone: "Indian/Reunion",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Assistance réservée aux membres connectés de l'application.
 * Les données ne sont demandées qu'à l'ouverture : aucune requête ne retarde
 * le rendu ou la navigation entre les pages de l'espace /app.
 */
export function AppSupportWidget() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [category, setCategory] = useState<SupportCategory>("bug");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<SupportData>({ conversations: [], unreadTotal: 0 });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => data.conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, data.conversations],
  );

  const loadSupport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/app-support", { cache: "no-store" });
      const result = await response.json() as SupportData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Lecture impossible.");
      setData({ conversations: result.conversations ?? [], unreadTotal: result.unreadTotal ?? 0 });
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lecture impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  function openPanel() {
    setOpen(true);
    setScreen("home");
    setError(null);
    void loadSupport();
  }

  function goHome() {
    setError(null);
    setScreen("home");
  }

  function openThread(conversation: SupportConversation) {
    setActiveId(conversation.id);
    setScreen("thread");
    setError(null);
    if (conversation.unread === 0) return;

    // Le marquage lu est non bloquant : la discussion s'affiche tout de suite.
    void markAppConversationSeen(conversation.id).then((result) => {
      if (!result.ok) return;
      setData((previous) => ({
        unreadTotal: Math.max(0, previous.unreadTotal - conversation.unread),
        conversations: previous.conversations.map((item) => (
          item.id === conversation.id ? { ...item, unread: 0 } : item
        )),
      }));
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="Ouvrir l'aide et les retours"
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-pool-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pool-600/20 backdrop-blur transition hover:bg-pool-700 active:scale-95"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <span aria-hidden="true" className="text-base leading-none">💬</span>
          <span className="hidden sm:inline">Aide & retours</span>
        </button>
      )}

      {open && (
        <section
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[85vh] w-auto max-w-sm flex-col overflow-hidden rounded-2xl border border-graphite-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[370px]"
          role="dialog"
          aria-label="Aide et retours"
        >
          <WidgetHeader
            screen={screen}
            onBack={goHome}
            onClose={() => setOpen(false)}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && !loaded ? <LoadingState /> : null}
            {!loading || loaded ? (
              <>
                {screen === "home" && (
                  <HomeList
                    conversations={data.conversations}
                    loading={loading}
                    onNew={() => { setError(null); setScreen("category"); }}
                    onOpen={openThread}
                  />
                )}
                {screen === "category" && (
                  <CategoryChoice
                    hasHistory={data.conversations.length > 0}
                    onHistory={goHome}
                    onPick={(next) => { setCategory(next); setError(null); setScreen("compose"); }}
                  />
                )}
                {screen === "compose" && (
                  <Compose
                    category={category}
                    pending={pending}
                    error={error}
                    onSend={(content) => {
                      setError(null);
                      startTransition(async () => {
                        const result = await createAppSupportConversation({
                          category,
                          content,
                          route: typeof window === "undefined" ? undefined : window.location.pathname,
                        });
                        if (!result.ok) { setError(result.message ?? "Envoi impossible."); return; }
                        const conversationId = typeof result.data?.conversationId === "string" ? result.data.conversationId : null;
                        setActiveId(conversationId);
                        await loadSupport();
                        setScreen(conversationId ? "thread" : "home");
                      });
                    }}
                  />
                )}
                {screen === "thread" && active && (
                  <Thread
                    conversation={active}
                    pending={pending}
                    error={error}
                    onSend={async (content) => {
                      setError(null);
                      const result = await sendAppSupportMessage(active.id, content);
                      if (!result.ok) { setError(result.message ?? "Envoi impossible."); return false; }
                      await loadSupport();
                      return true;
                    }}
                    startTransition={startTransition}
                  />
                )}
                {screen === "thread" && !active && (
                  <div className="p-6 text-center text-sm text-graphite-500">Conversation indisponible.</div>
                )}
              </>
            ) : null}
            {error && screen !== "compose" && screen !== "thread" && (
              <p className="px-4 pb-3 text-xs text-red-600">{error}</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function WidgetHeader({ screen, onBack, onClose }: { screen: Screen; onBack: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-graphite-100 bg-graphite-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {screen !== "home" && (
          <button type="button" onClick={onBack} aria-label="Retour" className="rounded-lg p-1 text-graphite-500 hover:bg-graphite-100">‹</button>
        )}
        <div>
          <div className="text-sm font-semibold text-graphite-900">Aide & retours</div>
          <div className="text-xs text-graphite-400">Réservé aux utilisateurs Piscine Island</div>
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100">✕</button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4" aria-label="Chargement des demandes">
      <div className="h-9 animate-pulse rounded-xl bg-graphite-100" />
      <div className="h-20 animate-pulse rounded-xl bg-graphite-100" />
      <div className="h-20 animate-pulse rounded-xl bg-graphite-100" />
    </div>
  );
}

function StatusPill({ status }: { status: SupportStatus }) {
  const item = STATUS_BY_KEY[status];
  return <span className={`badge ${item.tone}`}>{item.emoji} {item.label}</span>;
}

function HomeList({
  conversations,
  loading,
  onNew,
  onOpen,
}: {
  conversations: SupportConversation[];
  loading: boolean;
  onNew: () => void;
  onOpen: (conversation: SupportConversation) => void;
}) {
  return (
    <div className="p-3">
      <button type="button" onClick={onNew} className="btn-primary mb-3 w-full">＋ Nouvelle demande</button>
      {loading && <p className="mb-2 text-center text-xs text-graphite-400">Actualisation…</p>}
      {conversations.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-graphite-500">Signalez un bug, posez une question ou partagez une idée.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => {
            const category = CATEGORY_BY_KEY[conversation.category];
            const last = conversation.messages[conversation.messages.length - 1];
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onOpen(conversation)}
                className="block w-full rounded-xl border border-graphite-100 bg-white p-3 text-left transition hover:border-pool-200 hover:bg-pool-50/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-graphite-800">{category.emoji} {category.label}</span>
                  <span className="flex items-center gap-1.5">
                    {conversation.unread > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{conversation.unread > 99 ? "99+" : conversation.unread}</span>}
                    <StatusPill status={conversation.status} />
                  </span>
                </div>
                {last && <div className="truncate text-xs text-graphite-500">{last.author_type === "admin" ? "Assistance : " : "Vous : "}{last.content}</div>}
                <div className="mt-0.5 text-[11px] text-graphite-400">{timeLabel(conversation.last_message_at)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryChoice({
  hasHistory,
  onHistory,
  onPick,
}: {
  hasHistory: boolean;
  onHistory: () => void;
  onPick: (category: SupportCategory) => void;
}) {
  return (
    <div className="p-4">
      <h3 className="mb-1 text-center text-base font-semibold text-graphite-900">Comment pouvons-nous vous aider ?</h3>
      <p className="mb-4 text-center text-xs text-graphite-500">Votre retour est adressé à l'équipe Piscine Island.</p>
      <div className="space-y-2.5">
        {SUPPORT_CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onPick(item.key)}
            className="flex w-full items-center gap-3 rounded-xl border border-graphite-200 bg-white px-4 py-3 text-left transition hover:border-pool-300 hover:bg-pool-50/50 active:scale-[0.99]"
          >
            <span className="text-xl" aria-hidden="true">{item.emoji}</span>
            <span className="text-sm font-medium text-graphite-800">{item.choice}</span>
          </button>
        ))}
      </div>
      {hasHistory && <button type="button" onClick={onHistory} className="mt-4 w-full text-center text-xs text-pool-600 hover:text-pool-700">← Voir mes demandes</button>}
    </div>
  );
}

function Compose({
  category,
  pending,
  error,
  onSend,
}: {
  category: SupportCategory;
  pending: boolean;
  error: string | null;
  onSend: (content: string) => void;
}) {
  const [content, setContent] = useState("");
  const meta = CATEGORY_BY_KEY[category];
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-graphite-800"><span aria-hidden="true">{meta.emoji}</span>{meta.prompt}</div>
      <textarea
        autoFocus
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
        rows={6}
        placeholder={meta.example}
        className="w-full resize-none rounded-xl border border-graphite-200 bg-white px-3.5 py-3 text-sm text-graphite-800 placeholder:text-graphite-400 focus:border-pool-500 focus:outline-none"
      />
      <div className="mt-1 flex justify-end text-[11px] text-graphite-400">{content.length}/{SUPPORT_MESSAGE_MAX}</div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button type="button" onClick={() => onSend(content)} disabled={!content.trim() || pending} className="btn-primary mt-3 w-full disabled:opacity-50">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </div>
  );
}

function Thread({
  conversation,
  pending,
  error,
  onSend,
  startTransition,
}: {
  conversation: SupportConversation;
  pending: boolean;
  error: string | null;
  onSend: (content: string) => Promise<boolean>;
  startTransition: TransitionStartFunction;
}) {
  const [content, setContent] = useState("");
  const category = CATEGORY_BY_KEY[conversation.category];
  return (
    <div className="flex min-h-[360px] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-graphite-100 px-4 py-2.5">
        <div className="text-sm font-medium text-graphite-800">{category.emoji} {category.label}</div>
        <StatusPill status={conversation.status} />
      </div>
      <div className="flex-1 space-y-3 p-4">
        {conversation.messages.map((message) => {
          const isAdmin = message.author_type === "admin";
          return (
            <div key={message.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${isAdmin ? "rounded-bl-sm bg-graphite-100 text-graphite-800" : "rounded-br-sm bg-pool-600 text-white"}`}>
                <div className={`mb-0.5 text-[11px] font-semibold ${isAdmin ? "text-graphite-500" : "text-pool-100"}`}>{isAdmin ? "Assistance Piscine Island" : "Vous"}</div>
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                <div className={`mt-1 text-[10px] ${isAdmin ? "text-graphite-400" : "text-pool-100"}`}>{timeLabel(message.created_at)}</div>
              </div>
            </div>
          );
        })}
        {conversation.messages.length === 0 && <p className="text-center text-sm text-graphite-500">Aucun message.</p>}
      </div>
      <div className="border-t border-graphite-100 p-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
          rows={3}
          placeholder="Écrire une réponse…"
          className="w-full resize-none rounded-xl border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-800 placeholder:text-graphite-400 focus:border-pool-500 focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-graphite-400">{content.length}/{SUPPORT_MESSAGE_MAX}</span>
          <button
            type="button"
            onClick={() => startTransition(async () => {
              if (await onSend(content)) setContent("");
            })}
            disabled={!content.trim() || pending}
            className="btn-primary disabled:opacity-50"
          >
            {pending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
