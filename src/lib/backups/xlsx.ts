import "server-only";

import ExcelJS from "exceljs";
import { BACKUP_TABLES, columnLabel } from "@/lib/backups/catalog";
import { humanValue } from "@/lib/backups/format";
import type { BackupSnapshot, JsonRecord } from "@/lib/backups/types";

const NAVY = "183A59";
const AQUA = "60D1D0";
const PALE = "EFFAFA";
const MUTED = "6E8290";
const WHITE = "FFFFFF";
const LIGHT_LINE = "DDE7EC";

const FIRST_COLUMNS = [
  "id", "code", "number", "reference", "name", "title", "first_name", "last_name", "company_name",
  "status", "kind", "category", "workspace_id", "client_id", "service_id", "service_series_id",
];

function orderedColumns(rows: JsonRecord[]): string[] {
  const keys = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
  return [
    ...FIRST_COLUMNS.filter((column) => keys.delete(column)),
    ...Array.from(keys).sort((left, right) => left.localeCompare(right, "fr")),
  ];
}

function excelValue(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
      const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return value;
  }
  return humanValue(value);
}

function isDateColumn(column: string): boolean {
  return /(?:_at|_date|_on)$/.test(column) || ["read_at", "executed_at"].includes(column);
}

function isLongTextColumn(column: string): boolean {
  return ["content", "description", "notes", "report", "access_info", "access_details", "legal_info", "settings", "professional_info", "extra"].includes(column);
}

function columnWidth(column: string, rows: JsonRecord[]): number {
  if (isLongTextColumn(column)) return 42;
  if (column === "id" || column.endsWith("_id") || column.endsWith("_path")) return 24;
  if (isDateColumn(column)) return column.endsWith("_at") ? 21 : 16;
  const longest = Math.max(columnLabel(column).length, ...rows.slice(0, 250).map((row) => String(row[column] ?? "").length));
  return Math.min(34, Math.max(12, longest + 2));
}

function styleTitleRows(sheet: ExcelJS.Worksheet, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  sheet.mergeCells(3, 1, 3, lastColumn);
  sheet.getRow(1).height = 31;
  sheet.getCell(1, 1).font = { name: "Arial", size: 18, bold: true, color: { argb: NAVY } };
  sheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } };
  sheet.getCell(1, 1).alignment = { vertical: "middle" };
  sheet.getCell(2, 1).font = { name: "Arial", size: 10, color: { argb: MUTED } };
  sheet.getCell(3, 1).font = { name: "Arial", size: 9, italic: true, color: { argb: MUTED } };
}

export async function generateProfessionalXlsx(snapshot: BackupSnapshot): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LETI";
  workbook.company = String(snapshot.tables.workspaces?.[0]?.name ?? "");
  workbook.created = new Date(snapshot.generatedAt);
  workbook.modified = new Date(snapshot.generatedAt);
  workbook.subject = "Sauvegarde professionnelle des données LETI";
  workbook.title = `Données LETI - ${workbook.company || "Entreprise"}`;

  const generatedLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long", timeStyle: "short", timeZone: snapshot.timeZone,
  }).format(new Date(snapshot.generatedAt));

  const summary = workbook.addWorksheet("Sommaire", { views: [{ showGridLines: false }] });
  summary.columns = [{ width: 30 }, { width: 15 }, { width: 68 }];
  summary.getCell("A1").value = "Sauvegarde des données LETI";
  summary.getCell("A2").value = String(snapshot.tables.workspaces?.[0]?.name ?? "Entreprise");
  summary.getCell("A3").value = `Générée le ${generatedLabel} - ${snapshot.timeZone}`;
  styleTitleRows(summary, 3);
  summary.getRow(5).values = ["Feuille", "Enregistrements", "Contenu"];
  BACKUP_TABLES.forEach((definition, index) => {
    summary.getRow(6 + index).values = [definition.sheet, snapshot.tables[definition.table]?.length ?? 0, definition.description];
  });
  summary.getRow(5).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
  });
  summary.getRow(5).height = 24;
  for (let row = 6; row < 6 + BACKUP_TABLES.length; row += 1) {
    summary.getRow(row).height = 21;
    summary.getCell(row, 2).numFmt = "#,##0";
    summary.getCell(row, 2).alignment = { horizontal: "right" };
    summary.getCell(row, 3).alignment = { wrapText: true, vertical: "top" };
    if (row % 2 === 0) summary.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F7FAFB" } };
  }
  summary.autoFilter = { from: "A5", to: `C${5 + BACKUP_TABLES.length}` };
  summary.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];

  for (const definition of BACKUP_TABLES) {
    const rows = snapshot.tables[definition.table] ?? [];
    const columns = orderedColumns(rows);
    const lastColumn = Math.max(1, columns.length);
    const sheet = workbook.addWorksheet(definition.sheet.slice(0, 31), { views: [{ showGridLines: false }] });
    sheet.getCell(1, 1).value = definition.title;
    sheet.getCell(2, 1).value = definition.description;
    sheet.getCell(3, 1).value = `Généré le ${generatedLabel} - ${rows.length} enregistrement${rows.length > 1 ? "s" : ""}`;
    styleTitleRows(sheet, lastColumn);

    if (columns.length === 0) {
      sheet.getCell("A5").value = "Aucune donnée enregistrée";
      sheet.getCell("A5").font = { name: "Arial", size: 10, italic: true, color: { argb: MUTED } };
      sheet.getColumn(1).width = 32;
      continue;
    }

    columns.forEach((column, index) => {
      const cell = sheet.getCell(5, index + 1);
      cell.value = columnLabel(column);
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: AQUA } } };
      sheet.getColumn(index + 1).width = columnWidth(column, rows);
    });
    sheet.getRow(5).height = 30;

    rows.forEach((record, rowIndex) => {
      const row = sheet.getRow(6 + rowIndex);
      row.values = columns.map((column) => excelValue(record[column]));
      row.font = { name: "Arial", size: 9, color: { argb: "263C4E" } };
      row.alignment = { vertical: "top" };
      row.height = columns.some((column) => isLongTextColumn(column) && record[column]) ? 34 : 20;
      if (rowIndex % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F7FAFB" } };
      row.eachCell((cell, columnIndex) => {
        const column = columns[columnIndex - 1];
        cell.border = { bottom: { style: "hair", color: { argb: LIGHT_LINE } } };
        if (isDateColumn(column) && cell.value instanceof Date) {
          cell.numFmt = column.endsWith("_at") ? "yyyy-mm-dd hh:mm" : "yyyy-mm-dd";
        }
        if (isLongTextColumn(column)) cell.alignment = { vertical: "top", wrapText: true };
        if (column === "postal_code" || column === "phone" || column === "code" || column === "reference" || column === "number" || column === "id" || column.endsWith("_id")) cell.numFmt = "@";
      });
    });

    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, 5 + rows.length), column: columns.length } };
    sheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    sheet.headerFooter.oddFooter = `&L${workbook.company || "Entreprise"} - LETI&CConfidentiel&RPage &P / &N`;
  }

  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
