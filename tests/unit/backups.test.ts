import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BACKUP_TABLES } from "@/lib/backups/catalog";
import { backupDateTime, backupFileName, safeFileSegment } from "@/lib/backups/format";
import type { BackupSnapshot } from "@/lib/backups/types";
import { generateProfessionalPdf } from "@/lib/backups/pdf";
import { generateProfessionalXlsx } from "@/lib/backups/xlsx";
import { isDailyBackupDue, isValidIanaTimezone, nextDailyRun, zonedClock } from "@/lib/timezone";

function snapshotFixture(): BackupSnapshot {
  return {
    schemaVersion: 1,
    workspaceId: "11111111-1111-4111-8111-111111111111",
    generatedAt: "2026-08-29T17:30:00.000Z",
    timeZone: "Indian/Reunion",
    tables: {
      workspaces: [{ id: "11111111-1111-4111-8111-111111111111", name: "Piscine Island", company_code: "PI974", timezone: "Indian/Reunion", city: "Saint-Paul", settings: {} }],
      memberships: [{ id: "m-1", first_name: "Aline", last_name: "Payet", role: "admin", status: "active", email: "aline@example.test" }],
      permissions: [],
      clients: [{ id: "c-1", first_name: "Léa", last_name: "Martin", address_line1: "12 chemin des Filaos", postal_code: "97460", city: "Saint-Paul", email: "lea@example.test" }],
      pools: [{ id: "p-1", client_id: "c-1", name: "Piscine principale" }],
      service_series: [{ id: "ss-1", client_id: "c-1", status: "active", recurrence_weekday: 1, starts_on: "2026-01-05", ends_on: null, notes: "Passage chaque lundi" }],
      services: [{ id: "s-1", client_id: "c-1", code: "ENT-001", scheduled_date: "2026-08-29", scheduled_time: "09:00", status: "completed", report: "Eau équilibrée", notes: "RAS" }],
      service_financials: [{ id: "f-1", client_id: "c-1", service_id: "s-1", financial_kind: "one_off", amount_cents: 9500, created_at: "2026-08-29T10:00:00Z" }],
      service_tasks: [{ id: "st-1", service_id: "s-1", label: "Contrôler le pH", done: true }],
      service_client_notes: [{ id: "cn-1", service_id: "s-1", client_id: "c-1", content: "Portail réparé", is_important: false }],
      contracts: [{ id: "ct-1", client_id: "c-1", title: "Contrat annuel", status: "active", amount: 1200 }],
      invoices: [{ id: "i-1", client_id: "c-1", number: "F-2026-001", issue_date: "2026-08-29", status: "paid", subtotal: 100, tax_amount: 20, total: 120, currency: "EUR" }],
      invoice_lines: [{ id: "il-1", invoice_id: "i-1", label: "Entretien", quantity: 1, unit_price: 100 }],
      documents: [],
      tasks: [{ id: "t-1", title: "Commander du chlore", category: "professional", status: "todo", due_date: "2026-09-02" }],
      team_notes: [{ id: "n-1", content: "Réunion à 17h", created_at: "2026-08-29T08:00:00Z" }],
      team_note_reads: [], team_note_executions: [], team_note_comments: [],
      community_posts: [{ id: "cp-1", content: "Belle rénovation", created_at: "2026-08-28T08:00:00Z" }],
      community_post_comments: [], community_post_reactions: [], community_post_media: [],
    },
  };
}

describe("Sauvegardes professionnelles", () => {
  it("détermine 21h dans le fuseau de chaque entreprise, indépendamment du serveur", () => {
    expect(zonedClock(new Date("2026-08-29T17:00:00Z"), "Indian/Reunion")).toEqual({ date: "2026-08-29", hour: 21, minute: 0 });
    expect(isDailyBackupDue(new Date("2026-08-29T16:59:00Z"), "Indian/Reunion").due).toBe(false);
    expect(isDailyBackupDue(new Date("2026-08-29T17:00:00Z"), "Indian/Reunion")).toEqual({ due: true, localDate: "2026-08-29" });
    expect(nextDailyRun(new Date("2026-08-29T00:05:00Z"), "Indian/Reunion")).toEqual({
      at: new Date("2026-08-29T17:00:00.000Z"),
      localDate: "2026-08-29",
    });
    expect(nextDailyRun(new Date("2026-08-29T00:05:00Z"), "Europe/Paris")).toEqual({
      at: new Date("2026-08-29T19:00:00.000Z"),
      localDate: "2026-08-29",
    });
    expect(nextDailyRun(new Date("2026-12-15T00:05:00Z"), "Europe/Paris").at).toEqual(new Date("2026-12-15T20:00:00.000Z"));
    expect(isValidIanaTimezone("Indian/Reunion")).toBe(true);
    expect(isValidIanaTimezone("Fuseau/Inconnu")).toBe(false);
  });

  it("produit un nom ZIP stable et sûr", () => {
    expect(backupFileName("Piscine Île & Océan", new Date("2026-08-29T17:05:00Z"), "Indian/Reunion"))
      .toBe("LETI_Sauvegarde_Piscine-Ile-Ocean_2026-08-29_21h05.zip");
    expect(safeFileSegment("../../contrat client?.pdf")).toBe("..-..-contrat-client-.pdf");
  });

  it("formate la date d’une sauvegarde sans dépendre d’un composant client", () => {
    expect(backupDateTime("2026-08-29T17:05:00.000Z", "Indian/Reunion")).toBe("29 août 2026 à 21:05");
    expect(backupDateTime("date-invalide", "Indian/Reunion")).toBe("—");
  });

  it("exclut explicitement les secrets et les données personnelles du catalogue", () => {
    const clients = BACKUP_TABLES.find((entry) => entry.table === "clients");
    expect(clients?.excludedColumns).toEqual(expect.arrayContaining(["private_code_hash", "portal_token", "access_code"]));
    expect(BACKUP_TABLES.find((entry) => entry.table === "tasks")?.filter).toBe("professional_tasks");
    expect(BACKUP_TABLES.find((entry) => entry.table === "documents")?.filter).toBe("exclude_pool_documents");
    expect(BACKUP_TABLES.find((entry) => entry.table === "services")?.excludedColumns).toContain("pool_id");
    expect(BACKUP_TABLES.some((entry) => entry.table === "pools")).toBe(false);
    expect(BACKUP_TABLES.some((entry) => entry.table === "planning_events")).toBe(false);
  });

  it("génère un PDF paginé et un classeur structuré sans feuilles artificielles", async () => {
    const snapshot = snapshotFixture();
    const adminWithoutLogo = { storage: { from: () => ({ download: async () => ({ data: null, error: null }) }) } } as never;
    const pdf = await generateProfessionalPdf(adminWithoutLogo, snapshot);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(8_000);

    const xlsx = await generateProfessionalXlsx(snapshot);
    expect(xlsx.subarray(0, 2).toString()).toBe("PK");
    const workbook = new ExcelJS.Workbook();
    const workbookBytes = xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength) as ArrayBuffer;
    await workbook.xlsx.load(workbookBytes);
    expect(workbook.worksheets[0].name).toBe("Sommaire");
    expect(workbook.getWorksheet("Clients")?.getCell("A5").value).toBe("Identifiant");
    expect(workbook.getWorksheet("Entretiens")?.autoFilter).toBeTruthy();
    expect(workbook.getWorksheet("Piscines")).toBeUndefined();
    expect(workbook.worksheets.some((sheet) => sheet.name === "Planning personnel")).toBe(false);

    const fixtureDirectory = process.env.LETI_WRITE_BACKUP_FIXTURES_DIR;
    if (fixtureDirectory) {
      await mkdir(fixtureDirectory, { recursive: true });
      await Promise.all([
        writeFile(join(fixtureDirectory, "Dossier-Entreprise-LETI.pdf"), pdf),
        writeFile(join(fixtureDirectory, "Donnees-LETI.xlsx"), xlsx),
      ]);
    }
  }, 20_000);
});
