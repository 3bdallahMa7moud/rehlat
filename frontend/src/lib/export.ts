import type { Report } from "@/types/models";

export type ExportFormat = "json" | "csv" | "excel" | "xlsx" | "pdf";

export interface ExportColumn<T = Record<string, unknown>> {
  key: string;
  header?: string;
  value?: (row: T) => unknown;
}

export interface ExportOptions<T = unknown> {
  data: T;
  format: ExportFormat;
  filename?: string;
  title?: string;
  columns?: readonly ExportColumn<Record<string, unknown>>[];
  metadata?: Readonly<Record<string, unknown>>;
  sheets?: Readonly<Record<string, unknown>>;
}

export interface ExportArtifact {
  blob: Blob;
  filename: string;
  format: ExportFormat;
  mimeType: string;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  excel: "application/vnd.ms-excel;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const EXTENSIONS: Record<ExportFormat, string> = { json: "json", csv: "csv", excel: "xls", xlsx: "xlsx", pdf: "pdf" };

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

function rowsFromData(data: unknown): Row[] {
  if (Array.isArray(data)) {
    return data.map((item) => isRecord(item) ? item : { value: item });
  }
  return [isRecord(data) ? data : { value: data }];
}

function columnsForRows(rows: readonly Row[], requested?: readonly ExportColumn<Record<string, unknown>>[]) {
  if (requested?.length) return requested.map((column) => ({ key: column.key, header: column.header ?? column.key }));
  const keys = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
  return [...keys].map((key) => ({ key, header: key }));
}

function cellValue(row: Row, column: ExportColumn<Record<string, unknown>> | { key: string }) {
  const value = "value" in column && column.value ? column.value(row) : row[column.key];
  return displayValue(value);
}

function csvEscape(value: string | number | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function xmlEscape(value: string | number | boolean) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function serializeJson(data: unknown, metadata?: Readonly<Record<string, unknown>>) {
  const payload = metadata ? { metadata, data } : data;
  return JSON.stringify(payload, null, 2);
}

export function serializeCsv(data: unknown, options: Pick<ExportOptions, "columns" | "metadata"> = {}) {
  const rows = rowsFromData(data);
  const columns = columnsForRows(rows, options.columns);
  const metadataRows = options.metadata ? Object.entries(options.metadata).map(([key, value]) => `${csvEscape(key)},${csvEscape(displayValue(value))}`) : [];
  const header = columns.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(cellValue(row, column))).join(","));
  return [...metadataRows, header, ...body].join("\r\n");
}

/** SpreadsheetML 2003 is a dependency-free Excel format supported by Excel/LibreOffice. */
export function serializeExcel(data: unknown, options: Pick<ExportOptions, "columns" | "metadata" | "title"> = {}) {
  const rows = rowsFromData(data);
  const columns = columnsForRows(rows, options.columns);
  const title = xmlEscape(options.title ?? "Journey of Change report");
  const metadata = options.metadata
    ? Object.entries(options.metadata).map(([key, value]) => `<Row><Cell><Data ss:Type="String">${xmlEscape(key)}</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(displayValue(value))}</Data></Cell></Row>`).join("")
    : "";
  const header = `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${xmlEscape(column.header)}</Data></Cell>`).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${columns.map((column) => {
    const value = cellValue(row, column);
    const type = typeof value === "number" ? "Number" : typeof value === "boolean" ? "Boolean" : "String";
    return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
  }).join("")}</Row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${title.slice(0, 31)}"><Table>${metadata}${header}${body}</Table></Worksheet></Workbook>`;
}

function createXlsxBuffer(_options: Pick<ExportOptions, "data" | "columns" | "metadata" | "title" | "sheets">): never {
  void _options;
  throw new Error("XLSX export is loaded on demand from xlsx-export.ts");
}

function pdfSafe(value: unknown) {
  // Keep Arabic text intact. The UI uses the browser's RTL print path for PDF;
  // this legacy serializer remains available for non-print callers without
  // replacing readable text with question marks.
  return String(displayValue(value)).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

/** Create a small, valid PDF without pulling a heavy client-side PDF library. */
export function serializePdf(data: unknown, options: Pick<ExportOptions, "columns" | "metadata" | "title"> = {}) {
  const rows = rowsFromData(data);
  const columns = columnsForRows(rows, options.columns);
  const lines = [options.title ?? "Journey of Change report"];
  if (options.metadata) Object.entries(options.metadata).forEach(([key, value]) => lines.push(`${key}: ${displayValue(value)}`));
  lines.push(columns.map((column) => column.header).join(" | "));
  rows.forEach((row) => lines.push(columns.map((column) => String(cellValue(row, column))).join(" | ")));
  const visibleLines = lines.slice(0, 48);
  const stream = ["BT", "/F1 10 Tf", "50 790 Td", ...visibleLines.map((line, index) => `${index ? "0 -15 Td\n" : ""}(${pdfSafe(line)}) Tj`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function normalizedFilename(filename: string | undefined, format: ExportFormat) {
  const base = (filename ?? "journey-of-change-report").replace(/[\\/:*?"<>|]+/g, "-").replace(/\.+$/, "") || "journey-of-change-report";
  const extension = `.${EXTENSIONS[format]}`;
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

export function createExportArtifact<T>(options: ExportOptions<T>): ExportArtifact {
  const { format } = options;
  let body: string | ArrayBuffer;
  switch (format) {
    case "json": body = serializeJson(options.data, options.metadata); break;
    case "csv": body = `\uFEFF${serializeCsv(options.data, options)}`; break;
    case "excel": body = serializeExcel(options.data, options); break;
    case "xlsx": body = createXlsxBuffer(options); break;
    case "pdf": body = serializePdf(options.data, options); break;
    default: body = serializeJson(options.data, options.metadata);
  }
  return {
    blob: new Blob([body], { type: MIME_TYPES[format] }),
    filename: normalizedFilename(options.filename, format),
    format,
    mimeType: MIME_TYPES[format],
  };
}

export function downloadExport(artifact: ExportArtifact) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const url = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/** Create and immediately download a report in a browser; returns the artifact for tests. */
export function exportReport<T>(data: T | Report, format: ExportFormat, options: Omit<ExportOptions<T>, "data" | "format"> = {}) {
  const artifact = createExportArtifact({ ...options, data, format });
  downloadExport(artifact);
  return artifact;
}

/** Opens a printable, RTL Arabic report using the same dataset shown on screen. */
export function printReport<T>(data: T, options: Omit<ExportOptions<T>, "data" | "format"> = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const rows = rowsFromData(data);
  const columns = columnsForRows(rows, options.columns);
  const metadata = Object.entries(options.metadata ?? {}).map(([key, value]) => `<p><b>${xmlEscape(key)}</b>: ${xmlEscape(displayValue(value))}</p>`).join("");
  const table = `<table><thead><tr>${columns.map((column) => `<th>${xmlEscape(column.header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${xmlEscape(cellValue(row, column))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const popup = window.open("", "journey-report-print", "noopener,noreferrer,width=900,height=700");
  if (!popup) return false;
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${xmlEscape(options.title ?? "تقرير رحلة التغيير")}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#102a43}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;text-align:right}th{background:#e2e8f0}h1{margin-bottom:20px}@media print{body{padding:0}}</style></head><body><h1>${xmlEscape(options.title ?? "تقرير رحلة التغيير")}</h1>${metadata}${table}<script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
  return true;
}

export const exportData = exportReport;
export const exportToJson = (data: unknown, options: Omit<ExportOptions, "data" | "format"> = {}) => createExportArtifact({ ...options, data, format: "json" });
export const exportToCsv = (data: unknown, options: Omit<ExportOptions, "data" | "format"> = {}) => createExportArtifact({ ...options, data, format: "csv" });
export const exportToExcel = (data: unknown, options: Omit<ExportOptions, "data" | "format"> = {}) => createExportArtifact({ ...options, data, format: "excel" });
export const exportToPdf = (data: unknown, options: Omit<ExportOptions, "data" | "format"> = {}) => createExportArtifact({ ...options, data, format: "pdf" });
