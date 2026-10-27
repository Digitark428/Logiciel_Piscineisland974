"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/app/icons";
import type { Conversation, ConversationMessage, IntelligenceItem, IntelligenceMission, IntelligenceModule, IntelligenceSnapshot, MissionStatus } from "@/lib/leti-intelligence/types";
import styles from "./IntelligenceWorkspace.module.css";

type Section = "assistant" | "briefing" | "bilan" | "missions" | "validations" | "suggestions" | "connecteurs" | "activite";
type AssistantState = "prêt" | "écoute" | "réflexion" | "réponse" | "attente de validation";
const sections: { id: Section; label: string; icon: string }[] = [
  { id: "assistant", label: "Assistant", icon: "sparkles" },
  { id: "briefing", label: "Briefing du matin", icon: "home" },
  { id: "bilan", label: "Bilan du soir", icon: "activity" },
  { id: "missions", label: "Missions IA", icon: "check" },
  { id: "validations", label: "Centre de validation", icon: "receipt" },
  { id: "suggestions", label: "Suggestions", icon: "calendar" },
  { id: "connecteurs", label: "Connecteurs", icon: "settings" },
  { id: "activite", label: "Historique d’activité", icon: "file" },
];
const moduleLinks: Record<IntelligenceModule, string> = {
  clients: "/app/clients", entretiens: "/app/services", planning: "/app/planning", équipe: "/app/team",
  tâches: "/app/tasks/personal", carte: "/app/map", documents: "/app/documents",
};
const commandSuggestions = ["Résume ma journée", "Quelles tâches sont en retard ?", "Prépare mon planning", "Créer une mission"];
function id() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function dateLabel(date: string) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function countText(n: number, one: string, many: string) { return `${n} ${n > 1 ? many : one}`; }
function previewAnswer(text: string, snapshot: IntelligenceSnapshot): string {
  const q = text.toLocaleLowerCase("fr");
  if (q.includes("retard") || q.includes("urgent")) return snapshot.permissions.includes("tâches")
    ? snapshot.overdueTasks.length ? `${countText(snapshot.overdueTasks.length, "tâche en retard", "tâches en retard")} : ${snapshot.overdueTasks.slice(0, 3).map((t) => t.title).join(", ")}. Consultez les suggestions pour les détails.` : "Aucune tâche en retard dans les données visibles."
    : "L’accès aux tâches n’est pas autorisé pour votre rôle.";
  if (q.includes("journée") || q.includes("briefing") || q.includes("bilan")) return `Données du ${dateLabel(snapshot.date)} : ${countText(snapshot.services.length, "entretien", "entretiens")}, ${countText(snapshot.events.length, "événement", "événements")} et ${countText(snapshot.tasks.length, "tâche à suivre", "tâches à suivre")}. Ouvrez le briefing ou le bilan pour le détail. Lecture seule.`;
  if (q.includes("planning") || q.includes("rendez-vous")) return `${countText(snapshot.services.length, "entretien", "entretiens")} et ${countText(snapshot.events.length, "événement personnel", "événements personnels")} visibles aujourd’hui. Une réorganisation peut être préparée dans Missions IA, avec validation avant toute action future.`;
  return "J’ai reçu votre demande. Le raisonnement libre et l’exécution par IA seront disponibles après la connexion OpenAI. Vous pouvez préparer une mission et consulter les données du jour en lecture seule.";
}
function planFor(objective: string, permissions: IntelligenceModule[]) {
  const lower = objective.toLocaleLowerCase("fr");
  const targetModule = (Object.keys(moduleLinks) as IntelligenceModule[]).find((key) => lower.includes(key.slice(0, -1))) ?? (lower.includes("client") ? "clients" : lower.includes("tâche") ? "tâches" : lower.includes("rendez") ? "planning" : "planning");
  const accessible = permissions.includes(targetModule);
  return {
    module: targetModule,
    steps: ["Analyser la demande et vérifier les droits du membre", `Examiner les données du module ${targetModule} dans le périmètre de l’entreprise`, "Préparer les changements à valider", "Exécuter une seule fois après connexion des outils métier et nouvelle validation serveur"],
    accessible,
  };
}
function ItemList({ items, empty }: { items: IntelligenceItem[]; empty: string }) {
  return items.length ? <ul className="space-y-2">{items.map((item) => <li key={item.id}><Link href={item.href} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-graphite-100 bg-white px-4 py-3 transition hover:border-pool-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500"><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-graphite-900">{item.title}</strong><span className="text-xs text-graphite-500">{item.detail}</span></span><span aria-hidden>↗</span></Link></li>)}</ul> : <p className="rounded-xl bg-graphite-50 px-4 py-5 text-sm text-graphite-500">{empty}</p>;
}
function StatusPill({ children }: { children: string }) { return <span className="inline-flex rounded-full border border-pool-200 bg-pool-50 px-3 py-1 text-xs font-medium text-pool-700">{children}</span>; }

export function IntelligenceWorkspace({ snapshot, storageKey }: { snapshot: IntelligenceSnapshot; storageKey: string }) {
  const [section, setSection] = useState<Section>("assistant");
  const [assistantState, setAssistantState] = useState<AssistantState>("prêt");
  const [input, setInput] = useState("");
  const [missionInput, setMissionInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [missions, setMissions] = useState<IntelligenceMission[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
      if (Array.isArray(saved.conversations)) setConversations(saved.conversations);
      if (Array.isArray(saved.missions)) setMissions(saved.missions);
      if (typeof saved.speechEnabled === "boolean") setSpeechEnabled(saved.speechEnabled);
      if (typeof saved.briefingEnabled === "boolean") setBriefingEnabled(saved.briefingEnabled);
      if (typeof saved.eveningEnabled === "boolean") setEveningEnabled(saved.eveningEnabled);
    } catch { /* Storage unavailable: keep the session in memory. */ }
    hydrated.current = true;
  }, [storageKey]);
  useEffect(() => {
    if (!hydrated.current) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ conversations, missions, speechEnabled, briefingEnabled, eveningEnabled })); } catch { /* Private browsing may disable storage. */ }
  }, [storageKey, conversations, missions, speechEnabled, briefingEnabled, eveningEnabled]);
  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  const currentConversation = activeConversation ? conversations.find((c) => c.id === activeConversation) : undefined;
  const waitingChanges = missions.flatMap((m) => m.changes.filter((c) => c.status === "à valider").map((c) => ({ mission: m, change: c })));
  const briefing = `Bonjour ${snapshot.user}. Aujourd’hui ${dateLabel(snapshot.date)}, ${countText(snapshot.services.length, "entretien est prévu", "entretiens sont prévus")}, ${countText(snapshot.events.length, "événement personnel", "événements personnels")} et ${countText(snapshot.tasks.length, "tâche à suivre", "tâches à suivre")}. ${snapshot.activeClients === null ? "" : `${countText(snapshot.activeClients, "client actif", "clients actifs")} dans votre espace. `}${snapshot.overdueTasks.length ? `${countText(snapshot.overdueTasks.length, "tâche est en retard", "tâches sont en retard")}.` : "Aucune tâche en retard visible."}`;
  const bilan = `Bilan du ${dateLabel(snapshot.date)}. ${countText(snapshot.completedServices, "entretien terminé", "entretiens terminés")}, ${countText(snapshot.remainingServices, "entretien encore à traiter", "entretiens encore à traiter")}. ${countText(snapshot.completedTasks, "tâche terminée", "tâches terminées")} aujourd’hui et ${countText(snapshot.tasks.length + snapshot.overdueTasks.length, "tâche restante", "tâches restantes")} visibles. Pour demain, consultez le planning.`;
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) { setVoiceMessage("Lecture vocale indisponible dans ce navigateur."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.96;
    utterance.onend = () => setAssistantState("prêt");
    utterance.onerror = () => setAssistantState("prêt");
    window.speechSynthesis.speak(utterance);
    setAssistantState("réponse");
  };
  const submitMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const conversationId = currentConversation?.id ?? id();
    const userMessage: ConversationMessage = { id: id(), role: "user", text: trimmed, createdAt: now() };
    const answer: ConversationMessage = { id: id(), role: "assistant", text: previewAnswer(trimmed, snapshot), createdAt: now() };
    setAssistantState("réflexion");
    setConversations((previous) => {
      const existing = previous.find((c) => c.id === conversationId);
      if (existing) return previous.map((c) => c.id === conversationId ? { ...c, messages: [...c.messages, userMessage, answer] } : c);
      return [{ id: conversationId, title: trimmed.slice(0, 46), messages: [userMessage, answer], createdAt: now() }, ...previous];
    });
    setActiveConversation(conversationId);
    setInput("");
    setAssistantState("réponse");
    if (speechEnabled) speak(answer.text);
  };
  const listen = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setAssistantState("prêt"); return; }
    const BrowserRecognition = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!BrowserRecognition) { setVoiceMessage("Dictée non disponible dans ce navigateur. Utilisez la saisie texte."); return; }
    const recognition = new BrowserRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => { setInput(event.results[0][0].transcript); setAssistantState("prêt"); };
    recognition.onerror = () => { setVoiceMessage("La dictée n’a pas abouti."); setAssistantState("prêt"); recognitionRef.current = null; };
    recognition.onend = () => { setAssistantState("prêt"); recognitionRef.current = null; };
    recognition.start();
    recognitionRef.current = recognition;
    setAssistantState("écoute");
    setVoiceMessage("");
  };
  const createMission = () => {
    const objective = missionInput.trim();
    if (!objective) return;
    const plan = planFor(objective, snapshot.permissions);
    const mission: IntelligenceMission = { id: id(), objective, steps: plan.steps, createdAt: now(), user: snapshot.user, status: plan.accessible ? "à valider" : "proposée", changes: plan.accessible ? [{ id: id(), module: plan.module, label: `Préparer une action : ${objective}`, before: "Aucune donnée modifiée", after: "Intention à préciser avant exécution", status: "à valider" }] : [] };
    setMissions((previous) => [mission, ...previous]);
    setMissionInput("");
    setAssistantState(plan.accessible ? "attente de validation" : "prêt");
  };
  const updateChange = (missionId: string, changeId: string, status: MissionStatus, after?: string) => {
    setMissions((previous) => previous.map((mission) => mission.id !== missionId ? mission : {
      ...mission, status, changes: mission.changes.map((change) => change.id !== changeId ? change : { ...change, status, after: after ?? change.after }),
    }));
    setAssistantState(status === "à valider" ? "attente de validation" : "prêt");
  };
  const suggestions = [
    ...(snapshot.overdueTasks.length ? [{ title: `${snapshot.overdueTasks.length} tâche(s) en retard`, body: "Vérifier les échéances et les priorités.", href: "/app/tasks/personal" }] : []),
    ...(snapshot.remainingServices ? [{ title: `${snapshot.remainingServices} entretien(s) à suivre`, body: "Consulter les interventions prévues ou non terminées.", href: "/app/services" }] : []),
    ...(snapshot.services.length > 1 ? [{ title: "Organisation des rendez-vous", body: "Comparer les horaires et ouvrir la carte pour préparer les trajets.", href: snapshot.permissions.includes("carte") ? "/app/map" : "/app/planning" }] : []),
  ];

  return <div className="pb-10">
    {snapshot.unavailable.length > 0 && <p role="status" className="mb-5 rounded-xl border border-coral-100 bg-coral-50 px-4 py-3 text-sm text-graphite-700">Lecture momentanément indisponible : {snapshot.unavailable.join(", ")}. Les totaux affichés pour ces rubriques sont incomplets.</p>}
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><Link href="/app/leti-ia" className="text-sm font-medium text-graphite-500 hover:text-graphite-900">← Retour à LETI IA</Link><StatusPill>Bêta · lecture seule</StatusPill></div>
    <header className="mb-7 flex flex-wrap items-center gap-5"><div className={styles.orb} aria-hidden><span /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-pool-700">Votre espace de travail</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-graphite-900 sm:text-4xl">LETI Intelligence</h1><p className="mt-2 max-w-2xl text-sm text-graphite-500">Un regard clair sur votre journée et un espace pour préparer vos prochaines actions.</p></div></header>
    <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)]"><nav aria-label="Sections LETI Intelligence" className="card flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-24 lg:h-fit lg:flex-col">{sections.map((item) => <button type="button" key={item.id} onClick={() => setSection(item.id)} aria-current={section === item.id ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pool-500 lg:w-full ${section === item.id ? "bg-pool-50 text-graphite-900" : "text-graphite-500 hover:bg-graphite-50 hover:text-graphite-900"}`}><Icon name={item.icon} size={17} />{item.label}{item.id === "validations" && waitingChanges.length > 0 && <span className="ml-auto rounded-full bg-coral-100 px-2 text-xs text-coral-700">{waitingChanges.length}</span>}</button>)}</nav>
    <div className="min-w-0 space-y-5">
      {section === "assistant" && <><Card className="border-pool-100 bg-gradient-to-br from-white via-white to-pool-50/50"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-graphite-900">Assistant central</h2><p className="mt-1 text-sm text-graphite-500">Réponses guidées par les données visibles · IA libre bientôt disponible</p></div><StatusPill>{assistantState}</StatusPill></div><div className="mt-5 flex flex-wrap gap-2">{commandSuggestions.map((command) => <button key={command} type="button" className="btn-secondary text-xs" onClick={() => command === "Créer une mission" ? setSection("missions") : submitMessage(command)}>{command}</button>)}</div><div className="mt-5 min-h-64 space-y-3 rounded-2xl border border-graphite-100 bg-white/80 p-4" aria-live="polite">{currentConversation?.messages.length ? currentConversation.messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-pool-50 text-graphite-900" : "border border-graphite-100 bg-white text-graphite-700"}`}>{message.text}</div>) : <div className="flex min-h-56 flex-col items-center justify-center text-center"><div className={styles.orbSmall} aria-hidden /><p className="mt-5 font-medium text-graphite-900">Bonjour {snapshot.user.split(" ")[0]}, que souhaitez-vous préparer ?</p><p className="mt-1 text-sm text-graphite-500">Demandez un résumé ou explorez une suggestion.</p></div>}</div><form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); submitMessage(input); }}><input className="input min-w-0 flex-1" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Écrivez votre demande…" aria-label="Votre message" /><button type="button" onClick={listen} className="btn-secondary min-w-11 px-3" aria-label={assistantState === "écoute" ? "Arrêter la dictée" : "Dicter un message"} title="Dictée vocale du navigateur"><span aria-hidden>🎙</span></button><button className="btn-primary px-4" type="submit">Envoyer</button></form>{voiceMessage && <p className="mt-2 text-xs text-coral-700" role="status">{voiceMessage}</p>}</Card><Card><div className="flex items-center justify-between"><h3 className="font-semibold">Conversations de cette session</h3><button type="button" className="text-sm text-pool-700" onClick={() => setActiveConversation(null)}>Nouvelle conversation</button></div>{conversations.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => setActiveConversation(conversation.id)} className="min-h-11 rounded-xl border border-graphite-100 px-3 text-left text-sm hover:border-pool-200">{conversation.title}</button>)}</div> : <p className="mt-3 text-sm text-graphite-500">Aucune conversation enregistrée pour cette session.</p>}</Card></>}
      {section === "briefing" && <><Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-pool-700">Données du jour · {dateLabel(snapshot.date)}</p><h2 className="mt-1 text-2xl font-semibold">Briefing du matin</h2></div><button type="button" className="btn-primary" onClick={() => speak(briefing)}>▶ Mon briefing du jour</button></div><p className="mt-5 rounded-2xl bg-pool-50 p-5 text-sm leading-7 text-graphite-800">{briefing}</p><button type="button" className="mt-3 text-sm text-graphite-500 underline" onClick={() => window.speechSynthesis?.cancel()}>Arrêter la lecture</button></Card><div className="grid gap-5 xl:grid-cols-2"><Card><h3 className="mb-3 font-semibold">Entretiens et planning</h3><ItemList items={[...snapshot.services, ...snapshot.events]} empty="Aucun rendez-vous visible aujourd’hui." /></Card><Card><h3 className="mb-3 font-semibold">Tâches et priorités</h3><ItemList items={[...snapshot.overdueTasks, ...snapshot.tasks]} empty="Aucune tâche à signaler." /></Card></div><Card><h3 className="font-semibold">Actions suggérées</h3><p className="mt-2 text-sm text-graphite-500">Vérifier les tâches en retard, puis préparer les entretiens du jour. Clients à relancer : analyse bientôt disponible.</p><button type="button" className="btn-secondary mt-4" onClick={() => setSection("suggestions")}>Voir les suggestions →</button></Card></>}
      {section === "bilan" && <><Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-coral-700">Synthèse du jour · {dateLabel(snapshot.date)}</p><h2 className="mt-1 text-2xl font-semibold">Bilan du soir</h2></div><button type="button" className="btn-primary" onClick={() => speak(bilan)}>▶ Mon bilan de journée</button></div><p className="mt-5 rounded-2xl bg-pool-50 p-5 text-sm leading-7 text-graphite-800">{bilan}</p><button type="button" className="mt-3 text-sm text-graphite-500 underline" onClick={() => window.speechSynthesis?.cancel()}>Arrêter la lecture</button></Card><div className="grid gap-4 sm:grid-cols-3">{[["Entretiens terminés", snapshot.completedServices], ["Entretiens à suivre", snapshot.remainingServices], ["Tâches restantes", snapshot.tasks.length + snapshot.overdueTasks.length]].map(([label, value]) => <Card key={label as string}><p className="text-sm text-graphite-500">{label}</p><strong className="mt-2 block text-3xl text-graphite-900">{value}</strong></Card>)}</div><Card><h3 className="font-semibold">Préparer demain</h3><p className="mt-2 text-sm text-graphite-500">Les anomalies techniques et les interventions de demain demanderont des outils connectés. Consultez le planning pour vérifier les prochains rendez-vous.</p><Link href="/app/planning" className="btn-secondary mt-4">Ouvrir le planning →</Link></Card></>}
      {section === "missions" && <><Card><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold">Missions IA</h2><p className="mt-2 text-sm text-graphite-500">Décrivez votre objectif. La bêta prépare un plan ; aucune action métier n’est exécutée.</p></div><Badge tone="draft">Préparation</Badge></div><form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); createMission(); }}><textarea className="input min-h-28 w-full resize-y" value={missionInput} onChange={(event) => setMissionInput(event.target.value)} placeholder="Ex. Réorganiser les rendez-vous de demain et préparer les tâches de l’équipe" aria-label="Objectif de la mission" /><button className="btn-primary" type="submit">Préparer une mission</button></form></Card>{missions.length ? missions.map((mission) => <Card key={mission.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-graphite-900">{mission.objective}</h3><p className="mt-1 text-xs text-graphite-500">{new Date(mission.createdAt).toLocaleString("fr-FR")} · {mission.user}</p></div><StatusPill>{mission.status}</StatusPill></div><ol className="mt-5 space-y-2">{mission.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm text-graphite-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pool-50 text-xs font-semibold text-pool-700">{index + 1}</span>{step}</li>)}</ol><p className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-xs text-graphite-600">Statut réel : plan préparé localement. Aucune lecture approfondie, modification ou exécution automatique.</p>{mission.changes.length > 0 && <button type="button" className="btn-secondary mt-4" onClick={() => setSection("validations")}>Examiner la validation →</button>}{mission.changes.length === 0 && <p className="mt-4 text-sm text-coral-700">Module non accessible avec vos permissions actuelles.</p>}</Card>) : <Card><p className="text-sm text-graphite-500">Aucune mission préparée.</p></Card>}</>}
      {section === "validations" && <><Card><h2 className="text-2xl font-semibold">Centre de validation</h2><p className="mt-2 text-sm text-graphite-500">Les décisions ci-dessous concernent des propositions locales. Une action réelle demandera une nouvelle validation quand les outils seront connectés.</p></Card>{waitingChanges.length ? waitingChanges.map(({ mission, change }) => <Card key={change.id}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{change.label}</h3><StatusPill>À valider</StatusPill></div><p className="mt-2 text-xs text-graphite-500">Module : {change.module} · Mission de {mission.user}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-graphite-100 bg-graphite-50 p-4"><p className="text-xs font-semibold uppercase text-graphite-500">Avant</p><p className="mt-2 text-sm">{change.before}</p></div><div className="rounded-xl border border-pool-100 bg-pool-50 p-4"><p className="text-xs font-semibold uppercase text-pool-700">Après proposé</p><p className="mt-2 text-sm">{change.after}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" className="btn-primary" onClick={() => updateChange(mission.id, change.id, "approuvée")}>Approuver le principe</button><button type="button" className="btn-secondary" onClick={() => updateChange(mission.id, change.id, "refusée")}>Refuser</button><button type="button" className="btn-secondary" onClick={() => { const revised = window.prompt("Modifier la proposition", change.after); if (revised?.trim()) updateChange(mission.id, change.id, "à valider", revised.trim()); }}>Modifier</button></div></Card>) : <Card><p className="text-sm text-graphite-500">Aucune proposition en attente. Préparez une mission pour examiner son plan.</p></Card>}</>}
      {section === "suggestions" && <><Card><h2 className="text-2xl font-semibold">Suggestions intelligentes</h2><p className="mt-2 text-sm text-graphite-500">Signaux simples calculés sur vos données visibles aujourd’hui.</p></Card>{suggestions.length ? suggestions.map((suggestion) => <Card key={suggestion.title}><h3 className="font-semibold">{suggestion.title}</h3><p className="mt-2 text-sm text-graphite-500">{suggestion.body}</p><Link href={suggestion.href} className="btn-secondary mt-4">Examiner →</Link></Card>) : <Card><p className="text-sm text-graphite-500">Aucune alerte détectée dans les données visibles.</p></Card>}<Card><h3 className="font-semibold">À connecter progressivement</h3><p className="mt-2 text-sm text-graphite-500">Entretiens incomplets, clients à relancer et optimisation d’itinéraire nécessitent des règles métier supplémentaires. Aucune recommandation n’est inventée.</p></Card></>}
      {section === "connecteurs" && <><Card><h2 className="text-2xl font-semibold">Connecteurs et paramètres</h2><p className="mt-2 text-sm text-graphite-500">Les secrets et jetons seront gérés côté serveur. Aucun identifiant n’est demandé dans cette interface.</p></Card><div className="grid gap-4 sm:grid-cols-2"><Card><h3 className="font-semibold">OpenAI</h3><p className="mt-2 text-sm text-graphite-500">Conversation libre, outils métier et voix bidirectionnelle.</p><div className="mt-4"><StatusPill>Non configuré</StatusPill></div></Card><Card><h3 className="font-semibold">Gmail</h3><p className="mt-2 text-sm text-graphite-500">Connexion OAuth et préparation de messages à valider.</p><div className="mt-4"><StatusPill>Bientôt disponible</StatusPill></div></Card></div><Card><h3 className="font-semibold">Préférences de cette session</h3><div className="mt-4 space-y-3">{[["Lecture vocale des réponses", speechEnabled, setSpeechEnabled], ["Briefing du matin", briefingEnabled, setBriefingEnabled], ["Bilan du soir", eveningEnabled, setEveningEnabled]].map(([label, checked, setter]) => <label key={label as string} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-graphite-100 px-4 text-sm"><span>{label as string}</span><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-5 w-5 accent-[#5FC6E3]" /></label>)}</div><p className="mt-4 text-xs text-graphite-500">Les briefings programmés et la voix bidirectionnelle seront activés après connexion serveur. Les interrupteurs définissent seulement les préférences locales.</p></Card></>}
      {section === "activite" && <><Card><h2 className="text-2xl font-semibold">Historique d’activité</h2><p className="mt-2 text-sm text-graphite-500">Journal local de cette session. Aucun événement ci-dessous ne représente une action métier exécutée.</p></Card>{missions.length ? <div className="space-y-3">{missions.map((mission) => <Card key={mission.id}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{mission.objective}</h3><StatusPill>{mission.status}</StatusPill></div><p className="mt-2 text-xs text-graphite-500">{new Date(mission.createdAt).toLocaleString("fr-FR")} · {mission.user}</p><p className="mt-3 text-sm text-graphite-600">{mission.changes.length ? `Validation : ${mission.changes.map((change) => change.status).join(", ")}` : "Plan proposé, accès au module indisponible"}. Exécution : non connectée.</p></Card>)}</div> : <Card><p className="text-sm text-graphite-500">Aucune activité de mission dans cette session.</p></Card>}</>}
    </div></div>
    <p className="mt-6 text-center text-xs text-graphite-400">Données réelles accessibles selon votre rôle · Historique bêta conservé uniquement dans cet onglet · Aucune action exécutée</p>
  </div>;
}
