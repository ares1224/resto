import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/mon-espace/PasswordChangeForm";

export default async function MotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const required = params.required === "1" || session.mustChangePassword === true;

  return (
    <div className="space-y-6">
      {!required && (
        <Link href="/dashboard" className="text-sm text-amber-700 hover:underline">← Mon espace</Link>
      )}
      <h1 className="text-2xl font-bold text-amber-950">
        {required ? "Changement de mot de passe obligatoire" : "Mon mot de passe"}
      </h1>
      <PasswordChangeForm required={required} />
    </div>
  );
}
