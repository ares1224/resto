import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import { toCsv, buildAccountingExport, buildStockExport, buildPayrollExport, buildPdfReport } from "@/lib/export";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "accounting";
    const format = searchParams.get("format") ?? "csv";

    if (type === "stock") {
      const session = await requireApiPermission("view_stocks");
      const db = await getDb();
      const rows = buildStockExport(db);
      await logAudit(session, "export_stock", "Export inventaire CSV");
      return toCsv(rows, "stocks.csv");
    }

    const session = await requireApiPermission("export_accounting");
    const db = await getDb();

    let rows: Record<string, unknown>[] = [];
    let title = "Export comptable";
    let filename = "export.csv";

    switch (type) {
      case "payroll":
        rows = buildPayrollExport(db);
        title = "Personnel";
        filename = "personnel.csv";
        break;
      default:
        rows = buildAccountingExport(db);
        filename = "comptabilite.csv";
    }

    await logAudit(session, "export_accounting", `Export ${type} ${format}`);

    if (format === "pdf") {
      const buffer = await buildPdfReport(title, rows, db.settings.restaurantName || "Mon restaurant");
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename.replace(".csv", ".pdf")}"`,
        },
      });
    }

    return toCsv(rows, filename);
  } catch (e) {
    return apiError(e);
  }
}
