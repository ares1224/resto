"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SupplierOrderDraftLine } from "@/types";
import { toPublicError } from "@/lib/public-error";

type UrgentSupplier = {
  id: string;
  name: string;
  email: string;
  contact: string;
  lowStockCount: number;
  draftId?: string;
};

type SupplierOption = {
  id: string;
  name: string;
  email: string;
  contact: string;
  productCount: number;
  hasLowStock: boolean;
};

type DraftView = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierContact: string;
  lines: SupplierOrderDraftLine[];
  draftMessage: string;
  isUrgent: boolean;
  allProducts?: ProductOption[];
};

type ProductOption = {
  stockItemId: string;
  productName: string;
  currentQuantity: number;
  suggestedQuantity: number;
  unit: string;
  selected: boolean;
  isLowStock?: boolean;
};

export function SupplierOrderClient() {
  const [urgentSuppliers, setUrgentSuppliers] = useState<UrgentSupplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<SupplierOption[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<DraftView[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftView | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/stocks/supplier-orders");
    if (res.ok) {
      const data = await res.json();
      setUrgentSuppliers(data.urgentSuppliers ?? []);
      setAllSuppliers(data.allSuppliers ?? []);
      setPendingDrafts(data.pendingDrafts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function applyDraft(draft: DraftView) {
    setActiveDraft(draft);
    setSelectedSupplierId(draft.supplierId);
    setProductOptions(
      draft.allProducts ??
        draft.lines.map((l) => ({
          ...l,
          selected: true,
        }))
    );
    setError("");
    setSuccess("");
  }

  async function composeForSupplier(supplierId: string, lowStockOnly: boolean) {
    setBusy(true);
    setError("");
    setSuccess("");
    setSelectedSupplierId(supplierId);
    const res = await fetch("/api/stocks/supplier-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "compose", supplierId, lowStockOnly }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(toPublicError(data.error, "Impossible de préparer la commande"));
      return;
    }
    const draft = (await res.json()) as DraftView;
    applyDraft(draft);
    await load();
  }

  async function onSupplierChange(supplierId: string) {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setActiveDraft(null);
      setProductOptions([]);
      return;
    }
    await composeForSupplier(supplierId, false);
  }

  function toggleProduct(stockItemId: string) {
    setProductOptions((prev) =>
      prev.map((p) => (p.stockItemId === stockItemId ? { ...p, selected: !p.selected } : p))
    );
  }

  function updateProductQty(stockItemId: string, suggestedQuantity: number) {
    setProductOptions((prev) =>
      prev.map((p) => (p.stockItemId === stockItemId ? { ...p, suggestedQuantity } : p))
    );
  }

  async function refreshMessage() {
    if (!activeDraft) return;
    const selectedLines: SupplierOrderDraftLine[] = productOptions
      .filter((p) => p.selected)
      .map(({ stockItemId, productName, currentQuantity, suggestedQuantity, unit }) => ({
        stockItemId,
        productName,
        currentQuantity,
        suggestedQuantity,
        unit,
      }));

    setBusy(true);
    setError("");
    const res = await fetch("/api/stocks/supplier-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "compose",
        supplierId: activeDraft.supplierId,
        lines: selectedLines,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(toPublicError(data.error, "Actualisation impossible"));
      return;
    }
    const draft = (await res.json()) as DraftView;
    applyDraft(draft);
    await load();
  }

  function updateMessage(text: string) {
    setActiveDraft((d) => (d ? { ...d, draftMessage: text } : d));
  }

  async function sendDraft() {
    if (!activeDraft) return;
    if (
      !window.confirm(
        `Confirmer l'envoi du message à ${activeDraft.supplierName}${activeDraft.supplierEmail ? ` (${activeDraft.supplierEmail})` : ""} ?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/stocks/supplier-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        id: activeDraft.id,
        draftMessage: activeDraft.draftMessage,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(toPublicError(data.error, "Envoi impossible"));
      return;
    }
    const data = await res.json();
    setSuccess(`Message envoyé à ${data.sentTo}.`);
    setActiveDraft(null);
    setSelectedSupplierId("");
    setProductOptions([]);
    await load();
  }

  async function cancelDraft(id: string) {
    setBusy(true);
    await fetch("/api/stocks/supplier-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", id }),
    });
    setBusy(false);
    if (activeDraft?.id === id) {
      setActiveDraft(null);
      setSelectedSupplierId("");
      setProductOptions([]);
    }
    await load();
  }

  if (loading) {
    return (
      <Card title="Commandes fournisseurs">
        <p className="text-sm text-stone-500">Chargement…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commandes fournisseurs</h1>
        <p className="text-stone-500">
          Préparez et envoyez un message de commande à tout moment. Rien n&apos;est transmis sans votre validation.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      {urgentSuppliers.length > 0 && (
        <Card title="Priorité — stock bas détecté" className="border-amber-200 bg-amber-50/30">
          <p className="mb-3 text-sm text-stone-600">
            Fournisseurs concernés par une alerte de rupture de stock. Cliquez pour préparer la commande.
          </p>
          <div className="flex flex-wrap gap-2">
            {urgentSuppliers.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeDraft?.supplierId === s.id ? "primary" : "secondary"}
                onClick={() => composeForSupplier(s.id, true)}
                disabled={busy}
              >
                {s.name} ({s.lowStockCount} produit{s.lowStockCount > 1 ? "s" : ""} bas)
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Envoyer une commande">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-stone-600">Sélectionner un fournisseur</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => onSupplierChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              disabled={busy}
            >
              <option value="">Choisir un fournisseur…</option>
              {allSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.hasLowStock ? " ⚠ stock bas" : ""}
                  {s.productCount === 0 ? " (aucun produit lié)" : ""}
                </option>
              ))}
            </select>
          </label>

          {activeDraft && (
            <>
              <div className="rounded-lg bg-stone-50 p-3 text-sm">
                <p className="font-medium">{activeDraft.supplierName}</p>
                <p className="text-stone-500">
                  Contact commandes : {activeDraft.supplierContact || "non renseigné — message générique utilisé"}
                </p>
                <p className="text-stone-500">
                  Email : {activeDraft.supplierEmail || "non renseigné — ajoutez-le sur la fiche fournisseur"}
                </p>
                {!activeDraft.supplierContact && (
                  <Link href="/stocks/fournisseurs" className="mt-1 inline-block text-xs text-amber-700 hover:underline">
                    Compléter la fiche fournisseur →
                  </Link>
                )}
              </div>

              {productOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Produits</p>
                  <ul className="space-y-2">
                    {productOptions.map((p) => (
                      <li
                        key={p.stockItemId}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-100 p-2 text-sm"
                      >
                        <label className="flex min-w-[140px] flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={p.selected}
                            onChange={() => toggleProduct(p.stockItemId)}
                          />
                          <span>{p.productName}</span>
                          {p.isLowStock && (
                            <Badge variant="warning">Stock bas</Badge>
                          )}
                        </label>
                        <span className="text-xs text-stone-500">
                          Stock : {p.currentQuantity} {p.unit}
                        </span>
                        <label className="flex items-center gap-1">
                          <span className="text-xs text-stone-500">Qté</span>
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={p.suggestedQuantity}
                            onChange={(e) =>
                              updateProductQty(p.stockItemId, Number(e.target.value))
                            }
                            className="w-20 rounded border px-2 py-0.5"
                            disabled={!p.selected}
                          />
                          <span className="text-xs text-stone-500">{p.unit}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="secondary" className="mt-2" onClick={refreshMessage} disabled={busy}>
                    Actualiser le message
                  </Button>
                </div>
              )}

              <label className="block text-sm">
                <span className="mb-1 block text-stone-600">Message au fournisseur</span>
                <textarea
                  value={activeDraft.draftMessage}
                  onChange={(e) => updateMessage(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={sendDraft}
                  disabled={busy || !activeDraft.supplierEmail}
                >
                  Valider et envoyer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => cancelDraft(activeDraft.id)}
                  disabled={busy}
                >
                  Annuler le brouillon
                </Button>
              </div>
            </>
          )}

          {allSuppliers.length === 0 && (
            <p className="text-sm text-stone-500">
              Aucun fournisseur enregistré.{" "}
              <Link href="/stocks/fournisseurs" className="text-amber-700 hover:underline">
                Ajouter un fournisseur
              </Link>
            </p>
          )}
        </div>
      </Card>

      {pendingDrafts.filter((d) => d.id !== activeDraft?.id).length > 0 && (
        <Card title="Autres brouillons en attente">
          <ul className="space-y-2">
            {pendingDrafts
              .filter((d) => d.id !== activeDraft?.id)
              .map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{d.supplierName}</span>
                    {d.isUrgent && (
                      <Badge variant="warning" >
                        {" "}Stock bas
                      </Badge>
                    )}
                    <span className="ml-2 text-stone-500">{d.lines.length} produit(s)</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="xs" variant="secondary" onClick={() => applyDraft(d)} disabled={busy}>
                      Ouvrir
                    </Button>
                    <Button size="xs" variant="secondary" onClick={() => cancelDraft(d.id)} disabled={busy}>
                      Ignorer
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
