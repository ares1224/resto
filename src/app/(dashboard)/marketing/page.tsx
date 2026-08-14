import { ModuleLinks } from "@/components/ModuleLinks";

export default function MarketingPage() {
  return (
    <ModuleLinks
      title="Digital & marketing"
      links={[
        { href: "/marketing/frequentation", title: "Fréquentation", desc: "Stats par jour et heure" },
      ]}
    />
  );
}
