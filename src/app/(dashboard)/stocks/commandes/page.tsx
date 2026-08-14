import Link from "next/link";
import { SupplierOrderClient } from "@/components/stocks/SupplierOrderClient";

export default function CommandesFournisseursPage() {
  return (
    <div className="space-y-6">
      <Link href="/stocks" className="text-sm text-amber-700 hover:underline">
        ← Stocks
      </Link>
      <SupplierOrderClient />
    </div>
  );
}
