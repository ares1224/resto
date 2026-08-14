import { ModuleLinks } from "@/components/ModuleLinks";

export default function OperationsPage() {
  return (
    <ModuleLinks
      title="Opérationnel quotidien"
      links={[
        { href: "/operations/menu", title: "Carte / Menu", desc: "Plat du jour, ruptures masquées auto" },
        { href: "/operations/maintenance", title: "Maintenance matériel", desc: "Pannes, interventions, contrats" },
        { href: "/operations/main-courante", title: "Main courante", desc: "Incidents et passation entre shifts" },
      ]}
    />
  );
}
