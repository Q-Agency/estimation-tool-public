import { Step } from '@/types';
import { en } from '@/lib/localization';

export const INITIAL_STEPS: Step[] = [
  {
    id: 'document_preparation',
    title: en.steps.documentPreparation.title,
    status: 'pending',
    description: en.steps.documentPreparation.description,
    details: en.steps.documentPreparation.details
  },
  { 
    id: 'platforms', 
    title: en.steps.platforms.title, 
    status: 'pending',
    description: en.steps.platforms.description,
    details: en.steps.platforms.details
  },
  { 
    id: 'requirements', 
    title: en.steps.requirements.title, 
    status: 'pending',
    description: en.steps.requirements.description,
    details: en.steps.requirements.details
  },
  { 
    id: 'techstack', 
    title: en.steps.techstack.title, 
    status: 'pending',
    description: en.steps.techstack.description,
    details: en.steps.techstack.details
  },
  { 
    id: 'team_composition', 
    title: en.steps.teamComposition.title, 
    status: 'pending',
    description: en.steps.teamComposition.description,
    details: en.steps.teamComposition.details
  },
  { 
    id: 'effort_estimation', 
    title: en.steps.effortEstimation.title, 
    status: 'pending',
    description: en.steps.effortEstimation.description,
    details: en.steps.effortEstimation.details
  },
  { 
    id: 'development_plan', 
    title: en.steps.developmentPlan.title, 
    status: 'pending',
    description: en.steps.developmentPlan.description,
    details: en.steps.developmentPlan.details
  },
  { 
    id: 'final_report', 
    title: en.steps.finalReport.title, 
    status: 'pending',
    description: en.steps.finalReport.description,
    details: en.steps.finalReport.details
  },
]; 