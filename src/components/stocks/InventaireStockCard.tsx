"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StockAdjustForm } from "@/components/stocks/StockAdjustForm";
import { StockItemEditForm } from "@/components/stocks/StockItemEditForm";
import { StockItemDeleteButton } from "@/components/stocks/StockItemDeleteButton";
import type { StockFieldDefinition, StockItem } from "@/types";

type SupplierOption = { id: string; name: string };

type Props = {
  item: StockItem;
  supplierName?: string;
  suppliers: SupplierOption[];
  fieldDefinitions: StockFieldDefinition[];
  low: boolean;
};

/** Variante mobile de la ligne d'inventaire : une carte en colonne unique,
 *  sans défilement horizontal, avec les mêmes actions que le tableau. */
export function InventaireStockCard({
  item,
  supplierName,
  suppliers,
  fieldDefinitions,
  low,
}: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug text-[#1A1D23]">{item.name}</p>
          <p className="text-[12px] text-[#6B7280]">{supplierName ?? "—"}</p>
          <p className="text-[12px] text-[#9CA3AF]">{item.category}</p>
        </div>
        <Badge variant={low ? "danger" : "success"}>{low ? "Sous seuil" : "OK"}</Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <dt className="section-label">Quantité</dt>
          <dd className="text-[14px] font-semibold text-[#1A1D23]">
            {item.quantity} {item.unit}
          </dd>
        </div>
        <div>
          <dt className="section-label">Seuil</dt>
          <dd className="text-[14px] text-[#1A1D23]">
            {item.minThreshold} {item.unit}
          </dd>
        </div>
        <div>
          <dt className="section-label">Péremption</dt>
          <dd className="text-[14px] text-[#1A1D23]">{item.expiryDate ?? "—"}</dd>
        </div>
        <div>
          <dt className="section-label">Prix / unité</dt>
          <dd className="text-[14px] text-[#1A1D23]">{item.unitPrice.toFixed(2)} €</dd>
        </div>
        {fieldDefinitions.map((f) => (
          <div key={f.id}>
            <dt className="section-label">{f.label}</dt>
            <dd className="text-[14px] text-[#1A1D23]">{item.customFields?.[f.key] ?? "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#ECEEF3] pt-3">
        <StockAdjustForm itemId={item.id} current={item.quantity} />
        {!editing && (
          <div className="ml-auto flex items-center gap-1">
            <Button size="xs" variant="soft" onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <StockItemDeleteButton itemId={item.id} itemName={item.name} inline />
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-3">
          <StockItemEditForm
            item={item}
            suppliers={suppliers}
            fieldDefinitions={fieldDefinitions}
            open={editing}
            onOpenChange={setEditing}
            showTrigger={false}
          />
        </div>
      )}
    </div>
  );
}
