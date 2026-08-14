import Link from "next/link";

export function AiPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
        ← Tableau de bord
      </Link>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-600">Assistant IA</p>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}
