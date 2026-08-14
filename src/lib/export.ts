import type { Database } from "@/types";

export function toCsv(rows: Record<string, unknown>[], filename: string): Response {
  if (rows.length === 0) {
    return new Response("Aucune donnée", { status: 404 });
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(";")
    ),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function buildAccountingExport(db: Database): Record<string, unknown>[] {
  return db.cashFlow.map((entry) => ({
    Date: entry.date,
    Type: entry.type === "income" ? "Entrée" : "Sortie",
    Catégorie: entry.category,
    Montant: entry.amount.toFixed(2),
    Description: entry.description,
    Fixe: entry.isFixed ? "Oui" : "Non",
  }));
}

export function buildStockExport(db: Database): Record<string, unknown>[] {
  return db.stockItems.map((item) => {
    const supplier = db.suppliers.find((s) => s.id === item.supplierId);
    return {
      Produit: item.name,
      Catégorie: item.category,
      Quantité: item.quantity,
      Unité: item.unit,
      Seuil: item.minThreshold,
      Prix_unitaire: item.unitPrice.toFixed(2),
      Fournisseur: supplier?.name ?? "",
      Péremption: item.expiryDate ?? "",
    };
  });
}

export function buildPayrollExport(db: Database): Record<string, unknown>[] {
  return db.employees.filter((e) => e.active).map((emp) => ({
    Nom: `${emp.firstName} ${emp.lastName}`,
    Poste: emp.role,
    Contrat: emp.contractType,
    Taux_horaire: emp.hourlyRate.toFixed(2),
    Heures_max: emp.weeklyMaxHours,
  }));
}

export async function buildPdfReport(title: string, rows: Record<string, unknown>[], restaurantName = "Mon restaurant"): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`${restaurantName} — Export du ${new Date().toLocaleDateString("fr-FR")}`, 14, 28);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((h) => String(row[h] ?? "")));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      head: [headers],
      body,
      startY: 35,
      styles: { fontSize: 8 },
    });
  }

  return doc.output("arraybuffer");
}
