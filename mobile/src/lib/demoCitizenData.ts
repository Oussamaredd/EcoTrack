import type {
  CitizenChallenge,
  CitizenHistoryItem,
  CitizenProfile
} from "@api/modules/citizen";
import type { ContainerOption } from "@api/modules/containers";

export const demoCitizenProfile: CitizenProfile = {
  user: {
    id: "demo-citizen",
    email: "citizen.demo@ecotrack.local",
    displayName: "Citizen Demo"
  },
  gamification: {
    points: 245,
    level: 4,
    badges: ["Reporter", "Neighborhood Hero"],
    leaderboardPosition: 4
  },
  impact: {
    reportsSubmitted: 18,
    reportsResolved: 11,
    estimatedWasteDivertedKg: 84,
    estimatedCo2SavedKg: 31
  }
};

export const demoCitizenContainers: ContainerOption[] = [
  {
    id: "demo-container-rivoli-glass",
    code: "PAR-01-001",
    label: "Rue de Rivoli - Verre",
    zoneName: "Paris Centre",
    status: "critical",
    latitude: "48.8566",
    longitude: "2.3522",
    fillLevelPercent: 96
  },
  {
    id: "demo-container-hugo-plastic",
    code: "PAR-16-014",
    label: "Avenue Victor Hugo - Plastique",
    zoneName: "Paris 16",
    status: "warning",
    latitude: "48.8702",
    longitude: "2.2852",
    fillLevelPercent: 78
  },
  {
    id: "demo-container-vaugirard-mixed",
    code: "PAR-15-022",
    label: "Rue de Vaugirard - Mixte",
    zoneName: "Paris 15",
    status: "available",
    latitude: "48.8412",
    longitude: "2.3036",
    fillLevelPercent: 62
  },
  {
    id: "demo-container-bastille-paper",
    code: "PAR-11-008",
    label: "Bastille - Papier",
    zoneName: "Paris 11",
    status: "available",
    latitude: "48.8532",
    longitude: "2.3691",
    fillLevelPercent: 44
  },
  {
    id: "demo-container-montmartre-glass",
    code: "PAR-18-031",
    label: "Montmartre - Verre",
    zoneName: "Paris 18",
    status: "warning",
    latitude: "48.8867",
    longitude: "2.3431",
    fillLevelPercent: 71
  },
  {
    id: "demo-container-menilmontant-organic",
    code: "PAR-20-006",
    label: "Menilmontant - Organique",
    zoneName: "Paris 20",
    status: "available",
    latitude: "48.8662",
    longitude: "2.3834",
    fillLevelPercent: 38
  }
];

export const demoCitizenChallenges: CitizenChallenge[] = [
  {
    id: "demo-challenge-neighborhood-reporter",
    code: "CHL-NEIGHBORHOOD-03",
    title: "Neighborhood Reporter Sprint",
    description: "Submit 3 validated neighborhood reports this month.",
    targetValue: 3,
    rewardPoints: 75,
    enrollmentStatus: "in_progress",
    progress: 1,
    completionPercent: 33
  },
  {
    id: "demo-challenge-smart-route",
    code: "CHL-SMART-ROUTE-05",
    title: "Smart Route Support",
    description: "Report 5 containers before peak overflow windows.",
    targetValue: 5,
    rewardPoints: 120,
    enrollmentStatus: "not_enrolled",
    progress: 0,
    completionPercent: 0
  },
  {
    id: "demo-challenge-photo-evidence",
    code: "CHL-PHOTO-EVIDENCE-02",
    title: "Photo evidence",
    description: "Attach photo evidence to two reports.",
    targetValue: 2,
    rewardPoints: 40,
    enrollmentStatus: "in_progress",
    progress: 1,
    completionPercent: 50
  }
];

const reportTypes = [
  "container_full",
  "damaged_container",
  "access_blocked",
  "general_issue"
] as const;

const statuses = ["submitted", "in_review", "resolved", "submitted", "in_review"] as const;

export const demoCitizenHistory: CitizenHistoryItem[] = Array.from({ length: 24 }, (_, index) => {
  const reportType = reportTypes[index % reportTypes.length];
  const status = statuses[index % statuses.length];
  const day = String(29 - Math.floor(index / 4)).padStart(2, "0");
  const hour = String(10 - (index % 4)).padStart(2, "0");
  const containerNumber = String(index + 1).padStart(3, "0");
  const demoContainer = demoCitizenContainers[index % demoCitizenContainers.length];

  return {
    id: `demo-report-${index + 1}`,
    containerId: demoContainer.id,
    containerCode:
      index < demoCitizenContainers.length ? demoContainer.code : `PAR-01-${containerNumber}`,
    containerLabel: demoContainer.label,
    status,
    reportType,
    description:
      status === "resolved"
        ? "Operations confirmed the issue was handled."
        : "Citizen report submitted from the mobile demo flow.",
    photoUrl: null,
    latitude: demoContainer.latitude ?? "48.8566",
    longitude: demoContainer.longitude ?? "2.3522",
    reportedAt: `2026-06-${day}T${hour}:00:00.000Z`
  };
});
