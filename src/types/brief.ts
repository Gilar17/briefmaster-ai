export type AIProvider = "openrouter" | "openai";

export type Brief = {
  projectOverview: string;
  siteGoal: string;
  targetAudience: string;
  siteType: string;
  siteStructure: string[];
  functionalRequirements: string[];
  designPreferences: string[];
  integrations: string[];
  requiredMaterials: string[];
  clarificationQuestions: string[];
  recommendedWorkflow: string[];
};

export type RequestStatus = "idle" | "loading" | "success" | "error";
