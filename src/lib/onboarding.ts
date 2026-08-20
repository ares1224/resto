import type { Role } from "@/types";

export type OnboardingStep = {
  title: string;
  body: string;
  highlight?: string;
};

export const ONBOARDING_STEPS: Record<Role, OnboardingStep[]> = {
  superadmin: [],
  employe: [
    {
      title: "Bienvenue dans votre espace",
      body: "Ici, vous retrouvez tout ce dont vous avez besoin au quotidien : vos horaires, votre pointage et vos disponibilités.",
      highlight: "dashboard-welcome",
    },
    {
      title: "Vos horaires de travail",
      body: "Consultez vos créneaux de la semaine. Les jours où vous travaillez apparaissent en premier.",
      highlight: "employee-planning",
    },
    {
      title: "Pointer votre arrivée",
      body: "En début et fin de service, montrez votre QR code à l'accueil pour enregistrer vos heures.",
      highlight: "employee-clock",
    },
    {
      title: "Signaler une indisponibilité",
      body: "Vous ne pouvez pas travailler un jour prévu ? Indiquez-le depuis « Mes disponibilités ».",
      highlight: "employee-availability",
    },
  ],
  manager: [
    {
      title: "Votre tableau de bord",
      body: "En un coup d'œil : ce qui demande votre attention aujourd'hui (stocks, équipe, hygiène).",
      highlight: "dashboard-welcome",
    },
    {
      title: "Actions du quotidien",
      body: "Les boutons en évidence mènent aux tâches les plus fréquentes : planning, stocks, réservations…",
      highlight: "manager-daily",
    },
    {
      title: "Le menu latéral",
      body: "Tout le reste est classé par thème. Cliquez sur un module pour déplier ses pages.",
      highlight: "sidebar-nav",
    },
  ],
  gerant: [
    {
      title: "Vue d'ensemble de votre établissement",
      body: "Le chiffre du jour et les alertes importantes sont affichés en premier. Le détail reste accessible via le menu.",
      highlight: "dashboard-welcome",
    },
    {
      title: "Ce qui demande votre attention",
      body: "Stocks bas, réservations, anomalies… traitez l'essentiel sans parcourir tous les modules.",
      highlight: "gerant-attention",
    },
    {
      title: "Accès aux modules",
      body: "Personnel, stocks, finances, assistant… chaque grand thème a sa section dans le menu à gauche.",
      highlight: "sidebar-nav",
    },
    {
      title: "L'assistant intelligent",
      body: "Posez une question, générez un planning ou consultez les prévisions depuis « Assistant IA ».",
      highlight: "gerant-ai",
    },
  ],
};

export function onboardingStorageKey(userId: string): string {
  return `bistrot-onboarding-v1-${userId}`;
}
