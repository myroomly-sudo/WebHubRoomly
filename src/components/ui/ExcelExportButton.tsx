// src/components/ui/ExcelExportButton.tsx
"use client";

import { useState } from "react";

interface Column {
  header: string;
  key: string;
  formatter?: (value: unknown) => string;
}

interface ExcelExportButtonProps {
  filename: string;
  sheetName?: string;
  columns: Column[];
  data: Record<string, unknown>[];
  disabled?: boolean;
}

// Excel logo SVG — green Microsoft Excel icon style
function ExcelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="4" fill="#217346" />
      <path
        d="M14 4H20C20.5523 4 21 4.44772 21 5V19C21 19.5523 20.5523 20 20 20H14V4Z"
        fill="#1A5C38"
      />
      <path
        d="M14 4V20H8C7.44772 20 7 19.5523 7 19V12H14"
        fill="#21A366"
      />
      <path
        d="M7 12H3V5C3 4.44772 3.44772 4 4 4H14V12H7Z"
        fill="#33C481"
      />
      <path d="M14 4H21V8H14V4Z" fill="#21A366" />
      <path d="M14 8H21V12H14V8Z" fill="#217346" />
      <path d="M14 12H21V16H14V12Z" fill="#21A366" />
      <path d="M14 16H21V20H14V16Z" fill="#1A5C38" />
      <path
        d="M6.2 9L8 12L6.2 15H7.8L9 12.9L10.2 15H11.8L10 12L11.8 9H10.2L9 11.1L7.8 9H6.2Z"
        fill="white"
      />
    </svg>
  );
}

function escapeCSV(value: unknown, sep = ";"): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(sep) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(columns: Column[], data: Record<string, unknown>[]): string {
  // Use semicolon as separator for Excel compatibility in Spain/Europe
  const SEP = ";";
  const header = columns.map((c) => escapeCSV(c.header, SEP)).join(SEP);
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const formatted = c.formatter ? c.formatter(val) : val;
        return escapeCSV(formatted, SEP);
      })
      .join(SEP)
  );
  return [header, ...rows].join("\n");
}

function downloadCSV(content: string, filename: string) {
  // BOM for Excel to correctly read UTF-8
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExcelExportButton({
  filename,
  columns,
  data,
  disabled = false,
}: ExcelExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (!data.length || exporting) return;
    setExporting(true);
    await new Promise((r) => setTimeout(r, 200)); // small delay for UX
    const csv = toCSV(columns, data);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `${filename}_${dateStr}`);
    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || exporting || !data.length}
      title={data.length ? `Exportar ${data.length} registros a Excel` : "Sin datos para exportar"}
      className={`
        inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold
        border transition-all duration-150
        ${done
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#217346] hover:text-[#217346] hover:bg-green-50"
        }
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600 disabled:hover:bg-white
      `}
    >
      {done ? (
        <>
          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Exportado</span>
        </>
      ) : exporting ? (
        <>
          <svg className="w-4 h-4 animate-spin text-[#217346]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <span>Exportando…</span>
        </>
      ) : (
        <>
          <ExcelIcon className="w-4 h-4" />
          <span>Exportar Excel</span>
        </>
      )}
    </button>
  );
}
