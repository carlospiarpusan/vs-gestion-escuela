import { Download, FileSpreadsheet } from "lucide-react";

type ExportFormatActionsProps = {
  exportingFormat: "csv" | "xls" | null;
  onExportCsv: () => void;
  onExportXls: () => void;
  disabled?: boolean;
  csvLabel?: string;
  xlsLabel?: string;
};

export default function ExportFormatActions({
  exportingFormat,
  onExportCsv,
  onExportXls,
  disabled = false,
  csvLabel = "Exportar CSV",
  xlsLabel = "Exportar XLS",
}: ExportFormatActionsProps) {
  const isCsvBusy = exportingFormat === "csv";
  const isXlsBusy = exportingFormat === "xls";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onExportCsv}
        disabled={disabled || exportingFormat !== null}
        className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
      >
        <Download size={16} />
        {isCsvBusy ? "Exportando CSV..." : csvLabel}
      </button>
      <button
        type="button"
        onClick={onExportXls}
        disabled={disabled || exportingFormat !== null}
        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
      >
        <FileSpreadsheet size={16} />
        {isXlsBusy ? "Exportando XLS..." : xlsLabel}
      </button>
    </div>
  );
}
