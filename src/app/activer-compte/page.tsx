import { ActiverCompteForm } from "./ActiverCompteForm";

export default async function ActiverComptePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ActiverCompteForm token={params.token ?? ""} />;
}
