import * as XLSX from "xlsx";
import { reportExportSheets, type ReportExportModel } from "./report-export.ts";

export async function exportXlsxReport(model: ReportExportModel, filename: string) {
  const workbook = XLSX.utils.book_new();
  Object.entries(reportExportSheets(model)).forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name));
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const artifact = { blob: new Blob([bytes], { type: mimeType }), filename: `${filename.replace(/\.xlsx$/i, "")}.xlsx`, mimeType };
  if (typeof document !== "undefined") { const url = URL.createObjectURL(artifact.blob); const link = document.createElement("a"); link.href = url; link.download = artifact.filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
  return artifact;
}
