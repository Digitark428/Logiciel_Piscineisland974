export type IntelligenceModule = "clients" | "entretiens" | "planning" | "équipe" | "tâches" | "carte" | "documents";
export type MissionStatus = "proposée" | "à valider" | "approuvée" | "refusée" | "exécutée" | "échouée";

export interface IntelligenceItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  status?: string;
}

export interface IntelligenceSnapshot {
  date: string;
  user: string;
  workspace: string;
  services: IntelligenceItem[];
  events: IntelligenceItem[];
  tasks: IntelligenceItem[];
  overdueTasks: IntelligenceItem[];
  completedServices: number;
  remainingServices: number;
  completedTasks: number;
  activeClients: number | null;
  permissions: IntelligenceModule[];
  source: "live";
  unavailable: string[];
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
}

export interface ProposedChange {
  id: string;
  module: IntelligenceModule;
  label: string;
  before: string;
  after: string;
  status: MissionStatus;
}

export interface IntelligenceMission {
  id: string;
  objective: string;
  steps: string[];
  changes: ProposedChange[];
  status: MissionStatus;
  createdAt: string;
  user: string;
  /** Reserved for a future server executor with a unique constraint per action. */
  idempotencyKey?: string;
}

export interface IntelligenceExecutionContext {
  workspaceId: string;
  actorMembershipId: string;
  permission: string;
  approvalId: string;
  idempotencyKey: string;
}

/** Future server tools must be individually authorized and workspace scoped. No model receives a database client. */
export interface IntelligenceToolDefinition {
  module: IntelligenceModule;
  readPermission: string;
  writePermission: string | null;
  execution: "read-only" | "requires-approval";
}

export const INTELLIGENCE_TOOLS: readonly IntelligenceToolDefinition[] = [
  { module: "clients", readPermission: "clients.view", writePermission: "clients.edit", execution: "requires-approval" },
  { module: "entretiens", readPermission: "services.view", writePermission: "services.edit", execution: "requires-approval" },
  { module: "planning", readPermission: "planning.view", writePermission: null, execution: "read-only" },
  { module: "équipe", readPermission: "team.manage", writePermission: "team.manage", execution: "requires-approval" },
  { module: "tâches", readPermission: "tasks.view", writePermission: "tasks.manage", execution: "requires-approval" },
  { module: "carte", readPermission: "map.view", writePermission: null, execution: "read-only" },
  { module: "documents", readPermission: "documents.view", writePermission: "documents.manage", execution: "requires-approval" },
] as const;
