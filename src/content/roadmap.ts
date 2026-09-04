export type RoadmapStatus = "IN PROGRESS" | "NEXT" | "PLANNED" | "RESEARCH" | "LAB";

export type RoadmapStage = {
  id: string;
  index: string;
  name: string;
  status: RoadmapStatus;
  goal?: string;
  items: string[];
  note?: string;
};

export const roadmapStages: RoadmapStage[] = [
  {
    id: "lab",
    index: "00",
    name: "Freedom Lab",
    status: "IN PROGRESS",
    goal: "Find what current open-source stacks are missing.",
    items: [
      "Hermes Agent",
      "Hindsight",
      "Qwen",
      "Local inference",
      "Memory benchmark",
      "Agent benchmark",
      "Freedom benchmark",
    ],
  },
  {
    id: "alpha",
    index: "01",
    name: "Freemy Alpha",
    status: "NEXT",
    items: [
      "Personal identity",
      "Persistent memory",
      "Project workspaces",
      "Local model",
      "Agent tools",
      "Owner permissions",
      "Activity log",
    ],
  },
  {
    id: "pro",
    index: "02",
    name: "Freemy Pro",
    status: "PLANNED",
    items: [
      "Encrypted backup",
      "Multi-device continuity",
      "Remote access",
      "Advanced memory",
      "Better routing",
      "Premium agent features",
    ],
  },
  {
    id: "cloud",
    index: "03",
    name: "Freemy Cloud",
    status: "PLANNED",
    items: ["Optional inference", "Private workloads", "Hybrid routing", "Developer API"],
    note: "Local remains first-class.",
  },
  {
    id: "node",
    index: "04",
    name: "Freemy Node",
    status: "RESEARCH",
    items: ["24×7 personal AI", "Storage", "Inference", "Memory", "Agents"],
    note: "Hardware only makes sense after the personal AI experience proves itself.",
  },
];

/** Condensed four-phase view used on the homepage. */
export const roadmapSummary = [
  {
    index: "01",
    name: "LAB",
    status: "IN PROGRESS" as const,
    items: ["Local model", "Persistent memory", "Agent sandbox", "FreedomBench"],
  },
  {
    index: "02",
    name: "ALPHA",
    status: "NEXT" as const,
    items: ["Desktop experience", "Memory control", "Project workspaces", "Owner permissions"],
  },
  {
    index: "03",
    name: "PRO",
    status: "PLANNED" as const,
    items: ["Multi-device", "Encrypted backup", "Remote access", "Advanced memory"],
  },
  {
    index: "04",
    name: "NODE",
    status: "RESEARCH" as const,
    items: ["Always-on personal AI", "Local inference", "Personal storage", "Dedicated hardware"],
  },
];
