export interface StepEvent {
  step: string;
  title: string;
  output: string;
  sessionId?: string;
  tech_stack?: string;
  delivery_context?: string;
  type?: 'step' | 'error';
  error?: StepError;
}

export interface StepError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
  suggestedAction?: string;
}

export interface TechStack {
  platforms: string[];
  integrations: string[];
  mobile_stack: string[];
  web_stack: string[];
  backend_stack: string[];
  database: string;
  deployment: string;
  design: string[];
  stack_model: string;
  rationale: string;
  ai_needed: boolean;
}

export interface DeliveryContext {
  regulatory_requirements: string[];
  localization: string[];
  user_types: string[];
  project_type: string;
  delivery_model: string;
  security_needs: string[];
  timeline_pressure: string;
}

export interface Step {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  description?: string;
  details?: string;
  tech_stack?: TechStack;
  delivery_context?: DeliveryContext;
  document_preparation_data?: DocumentPreparationData;
  platforms_data?: PlatformsData;
  requirements_data?: RequirementsData;
  team_composition_data?: TeamCompositionData;
  effort_estimation_data?: EffortEstimationData;
  development_plan_data?: DevelopmentPlan;
}

export interface DevelopmentPhase {
  name: string;
  sprints: {
    start: number;
    end: number;
  };
  items: string[];
}

export interface CrossCuttingConcerns {
  infrastructure: string[];
  security: string[];
  testing: string[];
  documentation: string[];
  deployment: string[];
}

export interface DevelopmentPlan {
  phases: DevelopmentPhase[];
  cross_cutting: CrossCuttingConcerns;
}

export interface EmailFormData {
  email: string;
  isSubmitting: boolean;
}

export interface UploadResponse {
  md5: string;
  fileName: string;
  sessionId: string;
  date: string;
  link: string;
  indexName: string;
}

export interface DocumentPreparationData {
  client_name: string;
  project_name: string;
  industry: string;
  publish_date: string;
  submission_deadline: string;
  questions_deadline: string;
  contact_email: string;
}

export interface PlatformInfo {
  enum: string;
  text: string;
}

export interface HighlightCoordinates {
  b: number;
  l: number;
  r: number;
  t: number;
  coord_origin: string;
}

export interface HighlightData {
  ref_number: number;
  chunk_id: string;
  page: number;
  coordinates: HighlightCoordinates;
  text?: string;
  text_preview?: string;
}

export interface TraceabilityData {
  cited_references: number[];
  highlight_data: HighlightData[];
  total_highlights: number;
  pages_affected: number[];
}

export interface PlatformsData {
  platforms: PlatformInfo[];
  rationale: string;
  traceability?: TraceabilityData;
}

export interface RequirementsData {
  functional: string[];
  non_functional: string[];
}

export interface TeamRole {
  role: string;
  fte: number;
  rationale: string;
}

export interface TeamCompositionData {
  roles: TeamRole[];
  rationale: string;
}

export interface EffortEstimationData {
  min_sprints: number;
  max_sprints: number;
  rationale: string;
} 