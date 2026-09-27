import type { ReportExportModel } from "@/lib/report-export";

type Row = Record<string, string | number>;

function PrintTable({ title, rows }: { title: string; rows: Row[] }) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return <section className="report-print-section">
    <h2>{title}</h2>
    {rows.length ? <table><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column] ?? "—"}</td>)}</tr>)}</tbody></table> : <p>لا توجد سجلات لهذا القسم في الفترة المحددة.</p>}
  </section>;
}

export function ReportPrintSheet({ model }: { model: ReportExportModel }) {
  return <section className="report-print-sheet" lang="ar" dir="rtl" aria-label="تقرير رحلة التغيير القابل للطباعة">
    <header><p>رحلة التغيير</p><h1>تقرير الأداء</h1></header>
    <section className="report-print-section"><h2>الملخص</h2><dl>{Object.entries(model.summary[0] ?? {}).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <PrintTable title="الأيام" rows={model.timeline} />
    <PrintTable title="المهام" rows={model.tasks} />
    {model.participants && <PrintTable title="المشاركون" rows={model.participants} />}
  </section>;
}
