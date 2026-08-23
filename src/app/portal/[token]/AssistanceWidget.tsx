"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSupportConversation,
  sendSupportMessage,
  markConversationSeenByClient,
} from "@/lib/actions/assistance";
import {
  SUPPORT_CATEGORIES,
  CATEGORY_BY_KEY,
  STATUS_BY_KEY,
  SUPPORT_MESSAGE_MAX,
} from "@/lib/assistance";
import type { SupportCategory, SupportStatus } from "@/lib/db/types";

export interface WidgetMessage {
  id: string;
  author_type: "client" | "admin";
  author_label: string | null;
  content: string;
  created_at: string;
}
export interface WidgetConversation {
  id: string;
  category: SupportCategory;
  status: SupportStatus;
  created_at: string;
  last_message_at: string;
  context: Record<string, unknown>;
  messages: WidgetMessage[];
  unread: number;
}
export interface WidgetService {
  id: string;
  code: string;
  label: string;
}

interface Props {
  token: string;
  conversations: WidgetConversation[];
  unreadTotal: number;
  services: WidgetService[];
}

type Screen = "home" | "category" | "compose" | "sent" | "thread";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function deviceLabel(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Ordinateur";
  const br = /CriOS|Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Navigateur";
  return `${os} · ${br}`;
}

export function AssistanceWidget({ token, conversations, unreadTotal, services }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>(conversations.length ? "home" : "category");
  const [category, setCategory] = useState<SupportCategory>("bug");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  // Si la conversation active reçoit une réponse, marquer comme vue.
  useEffect(() => {
    if (open && screen === "thread" && active && active.unread > 0) {
      markConversationSeenByClient(token, active.id).then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, screen, activeId, active?.unread]);

  function openPanel() {
    setOpen(true);
    setError(null);
    setScreen(conversations.length ? "home" : "category");
  }

  return (
    <>
      {!open && (
        <button
          onClick={openPanel}
          aria-label="Ouvrir l'assistance"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-pool-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pool-600/30 transition hover:bg-pool-700 active:scale-95"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <span className="text-base leading-none">💬</span>
          <span className="hidden sm:inline">Assistance</span>
          {unreadTotal > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadTotal}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[85vh] w-auto max-w-sm flex-col overflow-hidden rounded-2xl border border-graphite-200 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[370px]"
          role="dialog"
          aria-label="Assistance"
        >
          <Header
            screen={screen}
            onBack={() => { setError(null); setScreen(conversations.length ? "home" : "category"); }}
            onClose={() => setOpen(false)}
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {screen === "home" && (
              <HomeList
                conversations={conversations}
                onNew={() => { setError(null); setScreen("category"); }}
                onOpen={(id) => { setActiveId(id); setScreen("thread"); }}
              />
            )}

            {screen === "category" && (
              <CategoryChoice
                onPick={(c) => { setCategory(c); setScreen("compose"); }}
                hasHistory={conversations.length > 0}
                onHistory={() => setScreen("home")}
              />
            )}

            {screen === "compose" && (
              <Compose
                category={category}
                services={services}
                pending={pending}
                error={error}
                onSend={(content, serviceId) => {
                  setError(null);
                  startTransition(async () => {
                    const res = await createSupportConversation(token, {
                      category,
                      content,
                      route: typeof window !== "undefined" ? window.location.pathname : undefined,
                      device: deviceLabel(),
                      serviceId,
                    });
                    if (!res.ok) { setError(res.message ?? "Envoi impossible."); return; }
                    setActiveId((res.data?.conversationId as string) ?? null);
                    setScreen("sent");
                    router.refresh();
                  });
                }}
              />
            )}

            {screen === "sent" && (
              <SentScreen onView={() => setScreen(activeId ? "thread" : "home")} />
            )}

            {screen === "thread" && active && (
              <Thread
                conversation={active}
                pending={pending}
                error={error}
                onReply={(content) => {
                  setError(null);
                  startTransition(async () => {
                    const res = await sendSupportMessage(token, active.id, content);
                    if (!res.ok) { setError(res.message ?? "Envoi impossible."); return; }
                    router.refresh();
                  });
                }}
              />
            )}
            {screen === "thread" && !active && (
              <div className="p-6 text-center text-sm text-graphite-500">Conversation indisponible.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Header({ screen, onBack, onClose }: { screen: Screen; onBack: () => void; onClose: () => void }) {
  const showBack = screen !== "home";
  return (
    <div className="flex items-center justify-between gap-2 border-b border-graphite-100 bg-graphite-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {showBack && (
          <button onClick={onBack} aria-label="Retour" className="rounded-lg p-1 text-graphite-500 hover:bg-graphite-100">
            ‹
          </button>
        )}
        <div>
          <div className="text-sm font-semibold text-graphite-900">Assistance</div>
          <div className="text-xs text-graphite-400">Nous vous répondons ici</div>
        </div>
      </div>
      <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100">
        ✕
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: SupportStatus }) {
  const s = STATUS_BY_KEY[status];
  return <span className={`badge ${s.tone}`}>{s.emoji} {s.label}</span>;
}

function HomeList({
  conversations,
  onNew,
  onOpen,
}: {
  conversations: WidgetConversation[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="p-3">
      <button onClick={onNew} className="btn-primary mb-3 w-full">＋ Nouvelle demande</button>
      <div className="space-y-2">
        {conversations.map((c) => {
          const cat = CATEGORY_BY_KEY[c.category];
          const last = c.messages[c.messages.length - 1];
          return (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="block w-full rounded-xl border border-graphite-100 bg-white p-3 text-left transition hover:border-pool-200 hover:bg-pool-50/40"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-graphite-800">{cat.emoji} {cat.label}</span>
                <span className="flex items-center gap-1.5">
                  {c.unread > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                  <StatusPill status={c.status} />
                </span>
              </div>
              {last && <div className="truncate text-xs text-graphite-500">{last.author_type === "admin" ? "Assistance : " : ""}{last.content}</div>}
              <div className="mt-0.5 text-[11px] text-graphite-400">{timeLabel(c.last_message_at)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryChoice({
  onPick,
  hasHistory,
  onHistory,
}: {
  onPick: (c: SupportCategory) => void;
  hasHistory: boolean;
  onHistory: () => void;
}) {
  return (
    <div className="p-4">
      <h3 className="mb-3 text-center text-base font-semibold text-graphite-900">Comment pouvons-nous vous aider ?</h3>
      <div className="space-y-2.5">
        {SUPPORT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onPick(c.key)}
            className="flex w-full items-center gap-3 rounded-xl border border-graphite-200 bg-white px-4 py-3 text-left transition hover:border-pool-300 hover:bg-pool-50/50 active:scale-[0.99]"
          >
            <span className="text-xl">{c.emoji}</span>
            <span className="text-sm font-medium text-graphite-800">{c.choice}</span>
          </button>
        ))}
      </div>
      {hasHistory && (
        <button onClick={onHistory} className="mt-4 w-full text-center text-xs text-pool-600 hover:text-pool-700">
          ← Voir mes demandes
        </button>
      )}
    </div>
  );
}

function Compose({
  category,
  services,
  pending,
  error,
  onSend,
}: {
  category: SupportCategory;
  services: WidgetService[];
  pending: boolean;
  error: string | null;
  onSend: (content: string, serviceId: string | null) => void;
}) {
  const meta = CATEGORY_BY_KEY[category];
  const [value, setValue] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle } = useSpeech((text) => {
    setValue((prev) => (prev ? prev.trimEnd() + " " : "") + text);
    taRef.current?.focus();
  });

  const canSend = value.trim().length > 0 && !pending;

  return (
    <div className="flex flex-col p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">{meta.emoji}</span>
        <label className="text-sm font-semibold text-graphite-900">{meta.prompt}</label>
      </div>

      <div className="relative mt-2">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
          rows={5}
          placeholder={`Ex : « ${meta.example} »`}
          className="input min-h-[120px] w-full resize-none pr-12"
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? "Arrêter la dictée" : "Dicter le message"}
            title={listening ? "Arrêter la dictée" : "Dicter le message"}
            className={`absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full transition ${
              listening ? "animate-pulse bg-red-500 text-white" : "bg-graphite-100 text-graphite-600 hover:bg-pool-100 hover:text-pool-700"
            }`}
          >
            🎙️
          </button>
        )}
      </div>
      {supported ? (
        <p className="mt-1 text-[11px] text-graphite-400">
          {listening ? "🔴 Parlez, votre message s'écrit tout seul…" : "Astuce : appuyez sur 🎙️ pour dicter, puis corrigez si besoin."}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-graphite-400">Écrivez votre message ci-dessus.</p>
      )}

      {services.length > 0 && category !== "suggestion" && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-graphite-600">Entretien concerné (facultatif)</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input">
            <option value="">— Aucune —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        onClick={() => onSend(value, serviceId || null)}
        disabled={!canSend}
        className="btn-primary mt-4 w-full"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </div>
  );
}

function SentScreen({ onView }: { onView: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">✅</div>
      <h3 className="text-base font-semibold text-graphite-900">Votre demande a bien été envoyée.</h3>
      <p className="mt-1 text-sm text-graphite-500">Nous vous répondrons directement ici, dans l'assistance.</p>
      <button onClick={onView} className="btn-secondary mt-5">Voir la conversation</button>
    </div>
  );
}

function Thread({
  conversation,
  pending,
  error,
  onReply,
}: {
  conversation: WidgetConversation;
  pending: boolean;
  error: string | null;
  onReply: (content: string) => void;
}) {
  const meta = CATEGORY_BY_KEY[conversation.category];
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle } = useSpeech((text) => {
    setValue((prev) => (prev ? prev.trimEnd() + " " : "") + text);
    taRef.current?.focus();
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const closed = conversation.status === "closed";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-graphite-100 px-4 py-2">
        <span className="text-sm font-medium text-graphite-800">{meta.emoji} {meta.label}</span>
        <StatusPill status={conversation.status} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.map((m) => (
          <div key={m.id} className={`flex ${m.author_type === "client" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.author_type === "client"
                  ? "rounded-br-sm bg-pool-600 text-white"
                  : "rounded-bl-sm bg-graphite-100 text-graphite-800"
              }`}
            >
              {m.author_type === "admin" && <div className="mb-0.5 text-[11px] font-semibold text-pool-700">Assistance</div>}
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
              <div className={`mt-1 text-[10px] ${m.author_type === "client" ? "text-pool-100" : "text-graphite-400"}`}>{timeLabel(m.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-xs text-red-600">{error}</p>}

      {closed ? (
        <div className="border-t border-graphite-100 p-3 text-center text-xs text-graphite-400">Cette demande est fermée.</div>
      ) : (
        <div className="border-t border-graphite-100 p-3">
          <div className="relative">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, SUPPORT_MESSAGE_MAX))}
              rows={2}
              placeholder="Votre message…"
              className="input min-h-[44px] w-full resize-none pr-12"
            />
            {supported && (
              <button
                type="button"
                onClick={toggle}
                aria-label={listening ? "Arrêter la dictée" : "Dicter le message"}
                className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full transition ${
                  listening ? "animate-pulse bg-red-500 text-white" : "bg-graphite-100 text-graphite-600 hover:bg-pool-100 hover:text-pool-700"
                }`}
              >
                🎙️
              </button>
            )}
          </div>
          <button
            onClick={() => { onReply(value); setValue(""); }}
            disabled={value.trim().length === 0 || pending}
            className="btn-primary mt-2 w-full"
          >
            {pending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Saisie vocale via l'API Web Speech native du navigateur (aucun service externe).
 * Dégrade proprement : si non supportée, `supported` = false et le champ texte reste utilisable.
 */
function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (Ctor) {
      setSupported(true);
      const rec = new Ctor();
      rec.lang = "fr-FR";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) text += e.results[i][0].transcript;
        }
        if (text) onText(text.trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
    }
    return () => {
      try { recRef.current?.stop(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch { /* noop */ }
      setListening(false);
    } else {
      try { rec.start(); setListening(true); } catch { /* noop */ }
    }
  }

  return { supported, listening, toggle };
}

// ---- Types minimaux Web Speech API (non fournis par lib.dom selon la cible) ----
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { 0: SpeechRecognitionAlternativeLike; isFinal: boolean; length: number }
interface SpeechRecognitionResultListLike { length: number; [index: number]: SpeechRecognitionResultLike }
interface SpeechRecognitionEventLike { resultIndex: number; results: SpeechRecognitionResultListLike }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
