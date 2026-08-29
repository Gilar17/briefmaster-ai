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

const MIN_ARRAY_LENGTH: Record<(typeof ARRAY_FIELDS)[number], number> = {
  siteStructure: 5,
  functionalRequirements: 3,
  designPreferences: 1,
  integrations: 2,
  requiredMaterials: 5,
  clarificationQuestions: 3,
  recommendedWorkflow: 6,
};

const PLACEHOLDER_EXACT = new Set([
  "данные отсутствуют",
  "информация отсутствует",
  "информация не указана",
  "не указано",
  "требуется уточнить",
  "нет данных",
  "не определено",
]);

const PLACEHOLDER_PATTERNS = [
  /^(данные|информация)( о .+)? (отсутствует|отсутствуют|не указан[аыо]?)$/i,
  /^данных нет$/i,
  /^сведения отсутствуют$/i,
];

const STRICT_PLACEHOLDER_FIELDS = new Set<string>([
  "siteStructure",
  "integrations",
  "requiredMaterials",
]);

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
    arrayFields[field] = readRecommendationArray(
      value[field],
      MIN_ARRAY_LENGTH[field],
      STRICT_PLACEHOLDER_FIELDS.has(field),
    );
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

function readRecommendationArray(
  value: unknown,
  minLength: number,
  rejectPlaceholderOnly: boolean,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("INVALID_BRIEF");
  }

  const items = value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (rejectPlaceholderOnly && items.length > 0 && items.every(isPlaceholderItem)) {
    throw new Error("INVALID_BRIEF");
  }

  const usefulItems = items.filter((item) => !isPlaceholderItem(item));

  if (usefulItems.length < minLength) {
    throw new Error("INVALID_BRIEF");
  }

  return usefulItems;
}

function isPlaceholderItem(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[«»""„“.!?,:;]/g, "")
    .replace(/\s+/g, " ");

  if (PLACEHOLDER_EXACT.has(normalized)) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}
