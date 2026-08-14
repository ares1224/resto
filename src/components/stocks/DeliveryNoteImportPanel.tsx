"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DeliveryNoteParseResult, ParsedDeliveryLine } from "@/lib/ai/delivery-note-parser";

type SupplierOption = { id: string; name: string };
type StockOption = { id: string; name: string };

type ReviewLine = ParsedDeliveryLine & {
  enabled: boolean;
  stockItemId: string | null;
};

type Props = {
  suppliers: SupplierOption[];
  stockItems: StockOption[];
};

export function DeliveryNoteImportPanel({ suppliers, stockItems }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [parseResult, setParseResult] = useState<DeliveryNoteParseResult | null>(null);
  const [reviewLines, setReviewLines] = useState<ReviewLine[]>([]);
  const [defaultSupplierId, setDefaultSupplierId] = useState(suppliers[0]?.id ?? "");
  const [applySummary, setApplySummary] = useState<string | null>(null);

  async function extractTextFromImage(file: File) {
    setOcrLoading(true);
    setError("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("fra");
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      setRawText((prev) => (prev ? `${prev}\n${text}` : text));
    } catch {
      setError("Lecture automatique impossible — collez le texte de la fiche manuellement.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setApplySummary(null);
    setParseResult(null);
    setReviewLines([]);

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
      await extractTextFromImage(file);
      return;
    }

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      const text = await file.text();
      setRawText(text);
      return;
    }

    setPreviewUrl(null);
    setError("Format non supporté pour l'extraction automatique — collez le contenu de la fiche ci-dessous.");
  }

  async function analyze() {
    if (!rawText.trim()) {
      setError("Ajoutez une fiche ou saisissez son contenu.");
      return;
    }
    setParsing(true);
    setError("");
    setApplySummary(null);
    const res = await fetch("/api/stocks/delivery-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });
    setParsing(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Analyse impossible");
      return;
    }
    const result = (await res.json()) as DeliveryNoteParseResult;
    setParseResult(result);
    setReviewLines(
      result.lines.map((line) => ({
        ...line,
        enabled: true,
        stockItemId: line.matchedStockItemId,
      }))
    );
  }

  function updateLine(id: string, patch: Partial<ReviewLine>) {
    setReviewLines((lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function applyChanges() {
    if (!parseResult) return;
    if (!defaultSupplierId) {
      setError("Choisissez un fournisseur par défaut pour les nouveaux produits.");
      return;
    }
    setApplying(true);
    setError("");
    const res = await fetch("/api/stocks/delivery-note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultSupplierId,
        newFieldDefinitions: parseResult.newFieldDefinitions,
        addToExistingQuantity: true,
        lines: reviewLines.map((line) => ({
          lineId: line.id,
          productName: line.productName,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          expiryDate: line.expiryDate,
          stockItemId: line.stockItemId,
          action: line.stockItemId ? "update" : "create",
          customFields: Object.fromEntries(
            line.customFields.map((f) => [f.key, f.value])
          ),
          enabled: line.enabled,
        })),
      }),
    });
    setApplying(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mise à jour impossible");
      return;
    }
    const data = await res.json();
    setApplySummary(
      `${data.updated} produit(s) mis à jour, ${data.created} créé(s), ${data.skipped} ignoré(s).`
    );
    setTimeout(() => window.location.reload(), 1500);
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Importer une fiche de livraison
      </Button>
    );
  }

  return (
    <Card title="Import fiche de livraison (IA)" className="border-amber-200 bg-amber-50/40">
      <p className="mb-3 text-sm text-stone-600">
        Importez une photo, un scan ou un fichier texte. L&apos;IA extrait les produits et vous
        propose un résumé à vérifier avant mise à jour de l&apos;inventaire.
      </p>

      <div className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.txt,.csv,text/plain"
          onChange={onFileChange}
          className="block w-full text-sm"
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Aperçu fiche" className="max-h-40 rounded border object-contain" />
        )}
        {ocrLoading && <p className="text-sm text-stone-500">Lecture du document en cours…</p>}

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ou collez ici le texte de la fiche de livraison…"
          rows={6}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={analyze} disabled={parsing || ocrLoading}>
            {parsing ? "Analyse…" : "Analyser avec l'IA"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {applySummary && <p className="text-sm text-green-700">{applySummary}</p>}

        {parseResult && (
          <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {parseResult.supplierName && (
                <span>
                  <strong>Fournisseur détecté :</strong> {parseResult.supplierName}
                </span>
              )}
              {parseResult.deliveryDate && (
                <span>
                  <strong>Date livraison :</strong> {parseResult.deliveryDate}
                </span>
              )}
            </div>

            {parseResult.newFieldDefinitions.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm">
                <strong>Nouveaux champs produit proposés :</strong>
                <ul className="mt-1 list-inside list-disc">
                  {parseResult.newFieldDefinitions.map((f) => (
                    <li key={f.key}>
                      {f.label} ({f.key})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {reviewLines.map((line) => (
                <div key={line.id} className="rounded-lg border border-stone-100 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={line.enabled}
                        onChange={(e) => updateLine(line.id, { enabled: e.target.checked })}
                      />
                      Inclure
                    </label>
                    <Badge
                      variant={
                        line.confidence === "high"
                          ? "success"
                          : line.confidence === "medium"
                            ? "warning"
                            : "default"
                      }
                    >
                      {line.stockItemId ? "Mise à jour" : "Nouveau produit"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={line.productName}
                      onChange={(e) => updateLine(line.id, { productName: e.target.value })}
                      className="rounded border px-2 py-1 text-sm sm:col-span-2"
                      placeholder="Produit"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                      className="rounded border px-2 py-1 text-sm"
                      placeholder="Quantité"
                    />
                    <input
                      value={line.unit}
                      onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                      className="rounded border px-2 py-1 text-sm"
                      placeholder="Unité"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={line.unitPrice ?? ""}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unitPrice: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="rounded border px-2 py-1 text-sm"
                      placeholder="Prix unitaire"
                    />
                    <input
                      type="date"
                      value={line.expiryDate ?? ""}
                      onChange={(e) => updateLine(line.id, { expiryDate: e.target.value || undefined })}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <select
                      value={line.stockItemId ?? ""}
                      onChange={(e) =>
                        updateLine(line.id, {
                          stockItemId: e.target.value || null,
                          action: e.target.value ? "update" : "create",
                        })
                      }
                      className="rounded border px-2 py-1 text-sm sm:col-span-2"
                    >
                      <option value="">— Nouveau produit —</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          Associer à : {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {line.customFields.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {line.customFields.map((f) => (
                        <div key={f.key} className="flex items-center gap-2 text-xs text-stone-600">
                          <span>
                            {f.label}
                            {f.isNewField ? " (nouveau champ)" : ""} :
                          </span>
                          <input
                            value={f.value}
                            onChange={(e) =>
                              updateLine(line.id, {
                                customFields: line.customFields.map((cf) =>
                                  cf.key === f.key ? { ...cf, value: e.target.value } : cf
                                ),
                              })
                            }
                            className="flex-1 rounded border px-2 py-0.5"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <label className="block text-sm">
              <span className="text-stone-600">Fournisseur par défaut (nouveaux produits)</span>
              <select
                value={defaultSupplierId}
                onChange={(e) => setDefaultSupplierId(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Choisir…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <Button size="sm" onClick={applyChanges} disabled={applying}>
              {applying ? "Mise à jour…" : "Valider et mettre à jour l'inventaire"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
