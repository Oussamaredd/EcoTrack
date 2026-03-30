export const citizenReportTypes = [
  {
    value: "container_full",
    label: "Container full",
    helper: "Use this when the container is already full or close to overflowing.",
  },
  {
    value: "damaged_container",
    label: "Damaged container",
    helper: "Use this when the structure, lid, or wheels are damaged.",
  },
  {
    value: "access_blocked",
    label: "Access blocked",
    helper: "Use this when vehicles or obstacles prevent collection access.",
  },
  {
    value: "general_issue",
    label: "General issue",
    helper: "Use this for issues that do not fit the main categories.",
  },
] as const;

export type CitizenReportType = (typeof citizenReportTypes)[number]["value"];

export const DEFAULT_CITIZEN_REPORT_TYPE: CitizenReportType = "container_full";
