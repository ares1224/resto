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

export function InventaireStockRow({
  item,
  supplierName,
  suppliers,
  fieldDefinitions,
  low,
}: Props) {
  const [editing, setEditing] = useState(false);
  const columnCount = 7 + fieldDefinitions.length;

  return (
    <>
      <tr className="border-b border-stone-50 align-top">
        <td className="py-3 align-top">
          <div className="font-medium leading-snug">{item.name}</div>
          <div className="text-xs text-stone-500">{supplierName ?? "—"}</div>
          <div className="text-xs text-stone-400">{item.category}</div>
          {!editing && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Button size="xs" variant="soft" onClick={() => setEditing(true)}>
                Modifier
              </Button>
              <StockItemDeleteButton itemId={item.id} itemName={item.name} inline />
            </div>
          )}
        </td>
        <td className="py-3 whitespace-nowrap">
          {item.quantity} {item.unit}
        </td>
        <td className="py-3">{item.minThreshold}</td>
        <td className="py-3 whitespace-nowrap">{item.expiryDate ?? "—"}</td>
        <td className="py-3 whitespace-nowrap">{item.unitPrice.toFixed(2)} €</td>
        {fieldDefinitions.map((f) => (
          <td key={f.id} className="py-3 text-stone-600">
            {item.customFields?.[f.key] ?? "—"}
          </td>
        ))}
        <td className="py-3">
          <Badge variant={low ? "danger" : "success"}>{low ? "Sous seuil" : "OK"}</Badge>
        </td>
        <td className="py-3">
          <StockAdjustForm itemId={item.id} current={item.quantity} />
        </td>
      </tr>
      {editing && (
        <tr className="border-b border-stone-50 bg-amber-50/30">
          <td colSpan={columnCount} className="px-3 py-3">
            <StockItemEditForm
              item={item}
              suppliers={suppliers}
              fieldDefinitions={fieldDefinitions}
              open={editing}
              onOpenChange={setEditing}
              showTrigger={false}
            />
          </td>
        </tr>
      )}
    </>
  );
}
