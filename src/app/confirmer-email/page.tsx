import Link from "next/link";
import { confirmSignupEmail } from "@/lib/signup";
import { ConfirmResendForm } from "./ConfirmResendForm";

export default async function ConfirmerEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await confirmSignupEmail(token) : { error: "Lien invalide" };
  const ok = "ok" in result;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B3AE8] text-lg font-bold text-white">
          R
        </div>
        {ok ? (
          <>
            <h1 className="text-2xl font-bold text-[#1A1D23]">Espace activé</h1>
            <p className="mt-3 text-[14px] text-[#374151]">
              Votre adresse email est confirmée. Vous pouvez maintenant vous connecter à l’espace de votre restaurant.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#1B3AE8] px-6 font-semibold text-white"
            >
              Se connecter
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#1A1D23]">Lien invalide</h1>
            <p className="mt-3 text-[14px] text-[#374151]">
              {"error" in result ? result.error : "Ce lien de confirmation n’est plus valable."}
              {" "}Vous pouvez demander un nouveau lien, valable 24 heures.
            </p>
            <ConfirmResendForm />
            <Link href="/login" className="mt-6 inline-block font-semibold text-[#1B3AE8]">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
