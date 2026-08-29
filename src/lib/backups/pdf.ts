import "server-only";

import PDFDocument from "pdfkit";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BackupSnapshot, JsonRecord } from "@/lib/backups/types";
import { addressLabel, humanValue, personLabel, recordText } from "@/lib/backups/format";

const COLOR = {
  navy: "#183A59",
  aqua: "#60D1D0",
  coral: "#FF9B82",
  ink: "#263C4E",
  muted: "#708492",
  line: "#DDE7EC",
  pale: "#F3FAFA",
};

function table(snapshot: BackupSnapshot, name: string): JsonRecord[] {
  return snapshot.tables[name] ?? [];
}

function byId(rows: JsonRecord[]): Map<string, JsonRecord> {
  const output = new Map<string, JsonRecord>();
  for (const row of rows) {
    const id = recordText(row, "id");
    if (id) output.set(id, row);
  }
  return output;
}

function groupBy(rows: JsonRecord[], field: string): Map<string, JsonRecord[]> {
  const output = new Map<string, JsonRecord[]>();
  for (const row of rows) {
    const key = recordText(row, field);
    if (!key) continue;
    output.set(key, [...(output.get(key) ?? []), row]);
  }
  return output;
}

function localDate(generatedAt: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(generatedAt));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function memberLabel(members: Map<string, JsonRecord>, id: unknown): string | null {
  const key = typeof id === "string" ? id : "";
  return key && members.has(key) ? personLabel(members.get(key)) : null;
}

function roleLabel(value: string): string {
  return value === "admin" ? "Gérant" : value === "member" ? "Membre" : value || "—";
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    active: "Actif", paused: "En pause", ended: "Terminé", planned: "À faire",
    in_progress: "En cours", completed: "Terminé", postponed: "Reporté",
    cancelled: "Annulé", todo: "À faire", done: "Terminé", draft: "Brouillon",
    sent: "Envoyée", paid: "Payée", archived: "Archivé",
  };
  return labels[value] ?? (value || "—");
}

async function workspaceLogo(admin: SupabaseClient, snapshot: BackupSnapshot): Promise<Buffer | null> {
  const workspace = table(snapshot, "workspaces")[0];
  const settings = workspace?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const path = (settings as Record<string, unknown>).company_logo_path;
  if (typeof path !== "string" || !path.startsWith(`${snapshot.workspaceId}/`)) return null;
  const { data, error } = await admin.storage.from("workspace-assets").download(path);
  if (error || !data) return null;
  try {
    return await sharp(Buffer.from(await data.arrayBuffer())).png().toBuffer();
  } catch {
    return null;
  }
}

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function currentPageNumber(doc: PDFKit.PDFDocument): number {
  return doc.bufferedPageRange().count;
}

function drawContentHeader(doc: PDFKit.PDFDocument, companyName: string) {
  const cursorX = doc.x;
  const cursorY = doc.y;
  doc.rect(42, 22, 511, 36).fill("#FFFFFF");
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLOR.navy).text("LETI", 48, 34, { lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.muted).text(companyName, 95, 34, { width: 450, align: "right", lineBreak: false });
  doc.moveTo(48, 49).lineTo(547, 49).lineWidth(0.7).strokeColor(COLOR.aqua).stroke();
  doc.x = cursorX;
  doc.y = cursorY;
}

function writeContentHeader(doc: PDFKit.PDFDocument, companyName: string) {
  drawContentHeader(doc, companyName);
  doc.y = 66;
}

function addContentPage(doc: PDFKit.PDFDocument, companyName?: string) {
  doc.addPage();
  // PDFKit restaure parfois le curseur de la page précédente après l'événement
  // `pageAdded`. Le repositionnement explicite évite qu'un titre soit dessiné
  // hors page tandis que son texte bascule seul sur la suivante.
  doc.x = 48;
  doc.y = 66;
  if (companyName) {
    drawContentHeader(doc, companyName);
    doc.x = 48;
    doc.y = 66;
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number, companyName?: string) {
  if (doc.y + height > doc.page.height - 55) addContentPage(doc, companyName);
}

function sectionTitle(doc: PDFKit.PDFDocument, companyName: string, title: string, intro?: string): number {
  // Conserver le titre avec le début de son contenu pour éviter les titres orphelins en bas de page.
  // La réserve est volontairement généreuse : PDFKit peut déclencher un saut
  // automatique un peu avant la marge quand le texte suivant est multiligne.
  ensureSpace(doc, intro ? 240 : 150, companyName);
  drawContentHeader(doc, companyName);
  const page = currentPageNumber(doc);
  doc.roundedRect(48, doc.y, 499, intro ? 58 : 38, 6).fill(COLOR.pale);
  doc.rect(48, doc.y, 4, intro ? 58 : 38).fill(COLOR.coral);
  const y = doc.y + 10;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(COLOR.navy).text(title, 64, y, { width: 465 });
  if (intro) doc.font("Helvetica").fontSize(8.5).fillColor(COLOR.muted).text(intro, 64, y + 23, { width: 455, lineGap: 1.5 });
  doc.y = y + (intro ? 60 : 45);
  return page;
}

function emptyState(doc: PDFKit.PDFDocument, companyName: string) {
  ensureSpace(doc, 28, companyName);
  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(COLOR.muted).text("Aucune donnée enregistrée.", { paragraphGap: 10 });
}

function entry(
  doc: PDFKit.PDFDocument,
  companyName: string,
  title: string,
  lines: Array<[string, unknown]>,
) {
  const visible = lines.filter(([, value]) => value !== null && value !== undefined && value !== "");
  const estimated = 30 + visible.reduce((sum, [, value]) => sum + Math.max(13, Math.ceil(humanValue(value).length / 88) * 11), 0);
  ensureSpace(doc, Math.min(estimated, 130), companyName);
  const startY = doc.y;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLOR.ink).text(title, 58, startY, { width: 479 });
  doc.y += 5;
  for (const [label, value] of visible) {
    const renderedValue = humanValue(value);
    doc.font("Helvetica").fontSize(8);
    const valueHeight = doc.heightOfString(renderedValue, { width: 372, lineGap: 1.2 });
    ensureSpace(doc, Math.max(19, valueHeight + 4), companyName);
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(7.3).fillColor(COLOR.muted).text(`${label} :`, 58, y, { width: 105 });
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.ink).text(renderedValue, 165, y, { width: 372, lineGap: 1.2 });
    doc.y = y + Math.max(12, valueHeight);
  }
  const pageBottom = doc.page.height - 55;
  if (doc.y + 14 <= pageBottom) {
    doc.y += 4;
    doc.moveTo(58, doc.y).lineTo(537, doc.y).lineWidth(0.35).strokeColor(COLOR.line).stroke();
    doc.y += 9;
  } else {
    doc.y = pageBottom;
  }
}

export async function generateProfessionalPdf(admin: SupabaseClient, snapshot: BackupSnapshot): Promise<Buffer> {
  const workspace = table(snapshot, "workspaces")[0] ?? {};
  const companyName = recordText(workspace, "name") || "Entreprise";
  const logo = await workspaceLogo(admin, snapshot);
  const doc = new PDFDocument({ size: "A4", margins: { top: 56, right: 48, bottom: 52, left: 48 }, bufferPages: true, info: {
    Title: `Dossier entreprise LETI - ${companyName}`,
    Author: "LETI",
    Subject: "Sauvegarde professionnelle des données de l’entreprise",
    CreationDate: new Date(snapshot.generatedAt),
  } });
  const result = collectPdf(doc);
  const generatedLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long", timeStyle: "short", timeZone: snapshot.timeZone,
  }).format(new Date(snapshot.generatedAt));
  const clients = table(snapshot, "clients");
  const memberships = table(snapshot, "memberships");
  const services = table(snapshot, "services");
  const series = table(snapshot, "service_series");
  const clientById = byId(clients);
  const membershipById = byId(memberships);
  const poolById = byId(table(snapshot, "pools"));
  const serviceTasksByService = groupBy(table(snapshot, "service_tasks"), "service_id");
  const clientNotesByService = groupBy(table(snapshot, "service_client_notes"), "service_id");
  const generatedLocalDate = localDate(snapshot.generatedAt, snapshot.timeZone);
  const futureServices = services.filter((service) => recordText(service, "scheduled_date") > generatedLocalDate);
  const historicalServices = services.filter((service) => recordText(service, "scheduled_date") <= generatedLocalDate);
  const sections: Array<{ title: string; page: number }> = [];

  // Couverture
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#F7FBFC");
  doc.rect(0, 0, 18, doc.page.height).fill(COLOR.aqua);
  doc.roundedRect(48, 58, 499, 675, 12).fill("#FFFFFF");
  if (logo) {
    try { doc.image(logo, 70, 86, { fit: [190, 70], valign: "center" }); } catch { /* logo facultatif */ }
  }
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR.navy).text("LETI", 430, 88, { width: 92, align: "right" });
  doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.muted).text("Logiciel de gestion pour piscinistes", 310, 108, { width: 212, align: "right" });
  doc.font("Helvetica-Bold").fontSize(30).fillColor(COLOR.navy).text("Dossier entreprise", 70, 245, { width: 450 });
  doc.font("Helvetica").fontSize(17).fillColor(COLOR.coral).text(companyName, 70, 290, { width: 450 });
  doc.moveTo(70, 335).lineTo(520, 335).lineWidth(2).strokeColor(COLOR.aqua).stroke();
  doc.font("Helvetica").fontSize(10).fillColor(COLOR.ink)
    .text(`Sauvegarde professionnelle générée le ${generatedLabel}`, 70, 365, { width: 430 })
    .moveDown(0.8)
    .text(`Fuseau horaire : ${snapshot.timeZone}`, { width: 430 });
  doc.roundedRect(70, 500, 135, 78, 8).fill(COLOR.pale);
  doc.roundedRect(225, 500, 135, 78, 8).fill(COLOR.pale);
  doc.roundedRect(380, 500, 135, 78, 8).fill(COLOR.pale);
  ([
    { value: String(clients.length), label: "clients", x: 70 },
    { value: String(services.length), label: "entretiens", x: 225 },
    { value: String(memberships.length), label: "membres", x: 380 },
  ]).forEach(({ value, label, x }) => {
    doc.font("Helvetica-Bold").fontSize(21).fillColor(COLOR.navy).text(value, x, 518, { width: 135, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(COLOR.muted).text(label, x, 548, { width: 135, align: "center" });
  });
  doc.font("Helvetica").fontSize(7.2).fillColor(COLOR.muted).text(
    "Document confidentiel - réservé à l’administrateur de l’entreprise.", 70, 680, { width: 445, align: "center" },
  );

  // Page réservée au sommaire, remplie une fois les numéros connus.
  doc.addPage();
  doc.y = 120;

  // PDFKit peut créer lui-même une page lors d'un texte très long : le listener
  // garantit alors le même en-tête que pour les sauts de page explicites.
  doc.on("pageAdded", () => writeContentHeader(doc, companyName));
  addContentPage(doc, companyName);
  sections.push({ title: "Identité de l’entreprise", page: sectionTitle(doc, companyName, "Identité de l’entreprise", "Coordonnées, informations légales et paramètres essentiels.") });
  entry(doc, companyName, companyName, [
    ["Code entreprise", workspace.company_code], ["Forme juridique", workspace.legal_form], ["SIRET", workspace.siret],
    ["N° TVA", workspace.vat_number], ["Adresse", addressLabel(workspace)], ["Téléphone", workspace.phone],
    ["E-mail", workspace.email], ["Fuseau horaire", snapshot.timeZone],
  ]);

  sections.push({ title: "Équipe", page: sectionTitle(doc, companyName, "Équipe", "Membres actifs et désactivés, rôles et coordonnées professionnelles.") });
  if (memberships.length === 0) emptyState(doc, companyName);
  memberships.forEach((member) => entry(doc, companyName, personLabel(member), [
    ["Rôle", roleLabel(recordText(member, "role"))], ["Poste", member.job_title], ["Type", member.member_type],
    ["Statut", statusLabel(recordText(member, "status"))], ["E-mail", member.email], ["Téléphone", member.phone],
  ]));

  sections.push({ title: "Clients et piscines", page: sectionTitle(doc, companyName, "Clients et piscines", "Fichier clients et bassins rattachés.") });
  const pools = table(snapshot, "pools");
  if (clients.length === 0) emptyState(doc, companyName);
  clients.forEach((client) => {
    const clientPools = pools.filter((pool) => recordText(pool, "client_id") === recordText(client, "id"));
    entry(doc, companyName, personLabel(client), [
      ["Société", client.company_name], ["Adresse", addressLabel(client)], ["E-mail", client.email], ["Téléphone", client.phone],
      ["Informations d’accès", client.access_info], ["Détails d’accès", client.access_details], ["Notes", client.notes],
      ["Piscines", clientPools.map((pool) => recordText(pool, "name") || "Piscine").join(", ") || "Aucune"],
    ]);
    clientPools.forEach((pool) => entry(doc, companyName, `Piscine — ${recordText(pool, "name") || "Sans nom"}`, [
      ["Adresse", addressLabel(pool)], ["Type", pool.pool_type], ["Volume (m³)", pool.volume_m3],
      ["Dimensions", [pool.length_m, pool.width_m, pool.depth_m].filter((value) => value !== null && value !== undefined && value !== "").join(" × ")],
      ["Traitement de l’eau", pool.water_treatment], ["Équipements", pool.equipment], ["Notes techniques", pool.technical_notes],
      ["Statut", statusLabel(recordText(pool, "status"))],
    ]));
  });

  sections.push({ title: "Contrats d’entretien", page: sectionTitle(doc, companyName, "Contrats d’entretien", "Contrats hebdomadaires et règles de récurrence. Les séries sans date de fin ne sont pas développées artificiellement à l’infini.") });
  if (series.length === 0) emptyState(doc, companyName);
  series.forEach((item) => entry(doc, companyName, personLabel(clientById.get(recordText(item, "client_id"))), [
    ["Type d’entretien", item.service_type], ["Statut", statusLabel(recordText(item, "status"))],
    ["Jour de récurrence", item.recurrence_weekday], ["Début", item.starts_on], ["Fin", item.ends_on || "Sans date de fin"],
    ["Horaire", item.default_time], ["Technicien", memberLabel(membershipById, item.assigned_membership_id)],
    ["Notes du contrat", item.notes], ["Document contrat", item.contract_document_id], ["Document facture", item.invoice_document_id],
  ]));

  sections.push({ title: "Planning futur", page: sectionTitle(doc, companyName, "Planning futur", "Entretiens matérialisés après la date de sauvegarde, sans duplication dans l’historique ci-dessous.") });
  if (futureServices.length === 0) emptyState(doc, companyName);
  futureServices.forEach((service) => {
    const client = clientById.get(recordText(service, "client_id"));
    const pool = poolById.get(recordText(service, "pool_id"));
    entry(doc, companyName, `${humanValue(service.scheduled_date)} — ${personLabel(client)}`, [
      ["Heure", service.scheduled_time], ["Adresse", addressLabel(pool ?? client)], ["Piscine", pool ? recordText(pool, "name") : null],
      ["Type", service.service_type], ["Statut", statusLabel(recordText(service, "status"))],
      ["Technicien", memberLabel(membershipById, service.assigned_membership_id)], ["Notes", service.notes],
    ]);
  });

  sections.push({ title: "Historique des entretiens", page: sectionTitle(doc, companyName, "Historique des entretiens", "Historique complet des entretiens matérialisés dans LETI.") });
  if (historicalServices.length === 0) emptyState(doc, companyName);
  historicalServices.forEach((service) => {
    const serviceId = recordText(service, "id");
    const pool = poolById.get(recordText(service, "pool_id"));
    const tasks = serviceTasksByService.get(serviceId) ?? [];
    const clientNotes = clientNotesByService.get(serviceId) ?? [];
    entry(doc, companyName, `${humanValue(service.scheduled_date)} — ${personLabel(clientById.get(recordText(service, "client_id")))}`, [
      ["Code", service.code], ["Statut", statusLabel(recordText(service, "status"))], ["Heure", service.scheduled_time],
      ["Type", service.service_type], ["Piscine", pool ? recordText(pool, "name") : null],
      ["Technicien planifié", memberLabel(membershipById, service.assigned_membership_id)],
      ["Réalisé par", memberLabel(membershipById, service.completed_by)],
      ["Notes", service.notes], ["Compte rendu", service.report],
      ["Tâches d’entretien", tasks.map((task) => `${task.done ? "✓" : "○"} ${recordText(task, "label")}`).join(" · ")],
      ["Notes du client", clientNotes.map((note) => recordText(note, "content")).join(" · ")],
      ["Démarré le", service.started_at], ["Terminé le", service.completed_at],
      ["Créé le", service.created_at], ["Modifié le", service.updated_at],
    ]);
  });

  sections.push({ title: "Gestion financière", page: sectionTitle(doc, companyName, "Gestion financière", "Revenus d’entretien, contrats commerciaux et factures.") });
  const financials = table(snapshot, "service_financials");
  const invoices = table(snapshot, "invoices");
  if (financials.length === 0 && invoices.length === 0) emptyState(doc, companyName);
  financials.forEach((item) => entry(doc, companyName, `Revenu entretien ${recordText(item, "service_id")}`, [
    ["Type", item.financial_kind], ["Montant (centimes)", item.amount_cents], ["Client", personLabel(clientById.get(recordText(item, "client_id")))], ["Date", item.created_at],
  ]));
  invoices.forEach((invoice) => entry(doc, companyName, `Facture ${recordText(invoice, "number")}`, [
    ["Client", personLabel(clientById.get(recordText(invoice, "client_id")))], ["Émission", invoice.issue_date], ["Échéance", invoice.due_date],
    ["Statut", statusLabel(recordText(invoice, "status"))], ["Sous-total", invoice.subtotal], ["TVA", invoice.tax_amount], ["Total", invoice.total], ["Devise", invoice.currency],
  ]));

  sections.push({ title: "Tâches et notes d’équipe", page: sectionTitle(doc, companyName, "Tâches et notes d’équipe", "Données collaboratives professionnelles. Les éléments personnels restent privés conformément aux permissions LETI.") });
  const tasks = table(snapshot, "tasks");
  const notes = table(snapshot, "team_notes");
  if (tasks.length === 0 && notes.length === 0) emptyState(doc, companyName);
  tasks.forEach((task) => entry(doc, companyName, recordText(task, "title") || "Tâche professionnelle", [
    ["Description", task.description], ["Statut", statusLabel(recordText(task, "status"))], ["Échéance", task.due_date],
    ["Personne concernée", memberLabel(membershipById, task.assigned_membership_id)],
    ["Créée par", memberLabel(membershipById, task.created_by)], ["Créé le", task.created_at], ["Modifié le", task.updated_at],
  ]));
  notes.forEach((note) => entry(doc, companyName, `Note du ${humanValue(note.created_at, snapshot.timeZone)}`, [
    ["Auteur", memberLabel(membershipById, note.author_membership_id)], ["Contenu", note.content],
  ]));

  sections.push({ title: "Entre nous et galerie", page: sectionTitle(doc, companyName, "Entre nous et galerie", "Publications internes et inventaire des médias. Les fichiers image originaux disponibles sont placés dans le dossier Galerie du ZIP.") });
  const posts = table(snapshot, "community_posts");
  const media = table(snapshot, "community_post_media");
  if (posts.length === 0 && media.length === 0) emptyState(doc, companyName);
  posts.forEach((post) => entry(doc, companyName, `Publication du ${humanValue(post.created_at, snapshot.timeZone)}`, [
    ["Contenu", post.content], ["Auteur", memberLabel(membershipById, post.author_membership_id)],
  ]));
  media.forEach((item) => entry(doc, companyName, recordText(item, "original_name") || `Photo du ${humanValue(item.created_at, snapshot.timeZone)}`, [
    ["Publication", item.post_id], ["Type original", item.original_mime_type || item.mime_type], ["Taille originale", item.original_size_bytes || item.size_bytes], ["Ajoutée le", item.created_at],
  ]));

  sections.push({ title: "Documents", page: sectionTitle(doc, companyName, "Documents", "Index des documents copiés dans le ZIP, classés par catégorie métier.") });
  const documents = table(snapshot, "documents");
  const contracts = table(snapshot, "contracts");
  if (documents.length === 0 && contracts.length === 0) emptyState(doc, companyName);
  documents.forEach((item) => entry(doc, companyName, recordText(item, "name") || "Document", [
    ["Entité", item.entity_type], ["Type", item.mime_type], ["Taille", item.size_bytes], ["Ajouté le", item.created_at],
  ]));
  contracts.forEach((item) => entry(doc, companyName, recordText(item, "title") || "Contrat", [
    ["Référence", item.reference], ["Client", personLabel(clientById.get(recordText(item, "client_id")))], ["Statut", statusLabel(recordText(item, "status"))], ["Début", item.start_date], ["Fin", item.end_date], ["Montant", item.amount], ["Notes", item.notes],
  ]));

  // Sommaire réel, une fois toutes les pages connues.
  doc.switchToPage(1);
  doc.font("Helvetica-Bold").fontSize(24).fillColor(COLOR.navy).text("Sommaire", 48, 72);
  doc.moveTo(48, 108).lineTo(547, 108).lineWidth(1.2).strokeColor(COLOR.aqua).stroke();
  let tocY = 138;
  for (const section of sections) {
    doc.font("Helvetica").fontSize(10).fillColor(COLOR.ink).text(section.title, 58, tocY, { width: 420, lineBreak: false });
    doc.font("Helvetica-Bold").fillColor(COLOR.coral).text(String(section.page), 490, tocY, { width: 42, align: "right", lineBreak: false });
    doc.moveTo(58, tocY + 16).lineTo(532, tocY + 16).lineWidth(0.3).strokeColor(COLOR.line).stroke();
    tocY += 34;
  }
  doc.font("Helvetica").fontSize(7.5).fillColor(COLOR.muted).text(
    "Les données structurées exhaustives figurent également dans le classeur Donnees-LETI.xlsx inclus dans la même archive.",
    58, 690, { width: 474, align: "center" },
  );

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = 0; pageIndex < pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(6.5).fillColor(COLOR.muted).text(
      `${companyName} - LETI`, 48, doc.page.height - 32, { width: 300, lineBreak: false },
    );
    doc.text(`Page ${pageIndex + 1} / ${pageRange.count}`, 397, doc.page.height - 32, { width: 150, align: "right", lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return result;
}
