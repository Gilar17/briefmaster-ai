import type { Brief } from "@/types/brief";

const STRING_FIELDS = [
  "projectOverview",
  "siteGoal",
  "targetAudience",
  "siteType",
] as const;

const ARRAY_FIELDS = [
  "siteStructure",
  "functionalRequirements",
  "designPreferences",
  "integrations",
  "requiredMaterials",
  "clarificationQuestions",
  "recommendedWorkflow",
] as const;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBriefFromModelText(raw: string): Brief {
  const jsonText = extractJsonText(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("INVALID_BRIEF");
  }

  return normalizeBrief(parsed);
}

export function normalizeBrief(value: unknown): Brief {
  if (!isPlainObject(value)) {
    throw new Error("INVALID_BRIEF");
  }

  const stringFields = {
    projectOverview: "",
    siteGoal: "",
    targetAudience: "",
    siteType: "",
  };

  for (const field of STRING_FIELDS) {
    stringFields[field] = readRequiredString(value[field]);
  }

  const arrayFields = {
    siteStructure: [] as string[],
    functionalRequirements: [] as string[],
    designPreferences: [] as string[],
    integrations: [] as string[],
    requiredMaterials: [] as string[],
    clarificationQuestions: [] as string[],
    recommendedWorkflow: [] as string[],
  };

  for (const field of ARRAY_FIELDS) {
    arrayFields[field] = readStringArray(value[field]);
  }

  return {
    ...stringFields,
    ...arrayFields,
  };
}

function extractJsonText(raw: string): string {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("INVALID_BRIEF");
  }

  return withoutFences.slice(start, end + 1);
}

function readRequiredString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("INVALID_BRIEF");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("INVALID_BRIEF");
  }

  return trimmed;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("INVALID_BRIEF");
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}
