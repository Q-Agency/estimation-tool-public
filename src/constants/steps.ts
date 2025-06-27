import { Step } from '@/types';

export const INITIAL_STEPS: Step[] = [
  {
    id: 'document_preparation',
    title: 'Document Preparation',
    status: 'pending',
    description: 'Structuring and preparing document for analysis',
    details: 'Your uploaded RFP document is being processed and structured. The system is extracting text content, analyzing document layout, and preparing the data for comprehensive AI analysis.'
  },
  { 
    id: 'platforms', 
    title: 'Platforms Info', 
    status: 'pending',
    description: 'Identify target platforms and technologies',
    details: 'Analyzing the document to identify which platforms the solution will need to support (web, mobile, backend, admin portal, etc.) based on the project requirements.'
  },
  { 
    id: 'requirements', 
    title: 'Requirements', 
    status: 'pending',
    description: 'Extract functional and non-functional requirements',
    details: 'Analyzing the document to identify and categorize all functional and non-functional requirements specified in the RFP.'
  },
  { 
    id: 'techstack', 
    title: 'Techstack', 
    status: 'pending',
    description: 'Determine optimal technology stack',
    details: 'Analyzing requirements and constraints to recommend the most suitable technology stack for the project implementation.'
  },
  { 
    id: 'team_composition', 
    title: 'Team Composition', 
    status: 'pending',
    description: 'Determine optimal team structure',
    details: 'Analyzing project requirements and technology stack to recommend the optimal team composition, roles, and resource allocation.'
  },
  { 
    id: 'effort_estimation', 
    title: 'Effort Estimation', 
    status: 'pending',
    description: 'Estimate effort required for each component',
    details: 'Based on the analyzed requirements, technology stack, and team composition, calculating the effort required for project implementation in sprint cycles.'
  },
  { 
    id: 'development_plan', 
    title: 'Development Plan', 
    status: 'pending',
    description: 'Create detailed development roadmap',
    details: 'A comprehensive development plan is generated, outlining phases, milestones, and timelines for the project implementation.'
  },
  { 
    id: 'final_report', 
    title: 'Final Report', 
    status: 'pending',
    description: 'Generate comprehensive estimation report',
    details: 'The final report provides a complete summary of the analysis, including cost estimates, timeline projections, and recommendations for project execution.'
  },
]; 