"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SupplierEditForm } from "@/components/stocks/SupplierEditForm";
import { SupplierDeleteButton } from "@/components/stocks/SupplierDeleteButton";
import type { Supplier } from "@/types";

type ProductLine = { id: string; name: string; unitPrice: number; unit: string };
type PriceLine = { id: string; label: string; price: number; date: string };

type Props = {
  supplier: Supplier;
  products: ProductLine[];
  prices: PriceLine[];
};

export function FournisseurCard({ supplier, products, prices }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-lg font-semibold leading-snug">{supplier.name}</h3>
            {!editing && (
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button size="xs" variant="soft" onClick={() => setEditing(true)}>
                  Modifier
                </Button>
                <SupplierDeleteButton
                  supplierId={supplier.id}
                  supplierName={supplier.name}
                  inline
                />
              </div>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {supplier.contact ? `Contact commandes : ${supplier.contact}` : "Contact commandes : non renseigné"} · {supplier.phone || "—"}
          </p>
          <p className="text-sm">{supplier.email || "—"}</p>
          <p className="mt-1 text-sm">
            Délai livraison : {supplier.deliveryDays} jour(s) · {supplier.notes || "—"}
          </p>
        </div>
        <Badge variant={supplier.reliabilityScore >= 4.5 ? "success" : "default"}>
          Fiabilité {supplier.reliabilityScore}/5
        </Badge>
      </div>

      {editing && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <SupplierEditForm
            supplier={supplier}
            open={editing}
            onOpenChange={setEditing}
            showTrigger={false}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold">Produits ({products.length})</h4>
          <ul className="mt-1 text-sm text-stone-600">
            {products.length === 0 ? (
              <li>Aucun produit lié</li>
            ) : (
              products.map((i) => (
                <li key={i.id}>
                  {i.name} — {i.unitPrice.toFixed(2)} €/{i.unit}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Historique des prix</h4>
          <ul className="mt-1 text-sm text-stone-600">
            {prices.length === 0 ? (
              <li>Aucun historique</li>
            ) : (
              prices.map((p) => (
                <li key={p.id}>
                  {p.label}: {p.price.toFixed(2)} € ({p.date})
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
