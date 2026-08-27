export type AIProvider = "openrouter" | "openai";

export const MIN_MESSAGE_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 8000;

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

export type GenerateBriefRequest = {
  provider: AIProvider;
  message: string;
};

export type GenerateBriefSuccessResponse = {
  success: true;
  brief: Brief;
  provider: AIProvider;
};

export type GenerateBriefErrorResponse = {
  success: false;
  error: string;
};

export type GenerateBriefResponse =
  | GenerateBriefSuccessResponse
  | GenerateBriefErrorResponse;

export type RequestStatus = "idle" | "loading" | "success" | "error";
