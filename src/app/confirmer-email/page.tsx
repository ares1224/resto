import { redirect } from "next/navigation";
import Link from "next/link";
import { confirmSignupEmail } from "@/lib/signup";
import { ConfirmResendForm } from "./ConfirmResendForm";
import { homePathForRole, sessionFromUser, writeSessionCookie } from "@/lib/auth";
import { toPublicError } from "@/lib/public-error";

export default async function ConfirmerEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await confirmSignupEmail(token) : { error: "Lien invalide" };

  if ("ok" in result && result.ok) {
    await writeSessionCookie(sessionFromUser(result.user));
    redirect(homePathForRole(result.user.role));
  }

  const expired = "expired" in result && result.expired;
  const resendEmail = expired ? result.email : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B3AE8] text-lg font-bold text-white">
          R
        </div>
        <h1 className="text-2xl font-bold text-[#1A1D23]">
          {expired ? "Ce lien a expiré." : "Lien invalide"}
        </h1>
        <p className="mt-3 text-[14px] text-[#374151]">
          {expired
            ? "Demandez un nouveau lien de confirmation, valable 24 heures."
            : `${"error" in result ? toPublicError(result.error, "Ce lien n’est plus valable.") : "Ce lien n’est plus valable."} Vous pouvez demander un nouveau lien, valable 24 heures.`}
        </p>
        <ConfirmResendForm defaultEmail={resendEmail} submitLabel="Recevoir un nouveau lien" />
        <Link href="/login" className="mt-6 inline-block font-semibold text-[#1B3AE8]">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
