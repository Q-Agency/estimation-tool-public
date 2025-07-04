export const en = {
  // General
  general: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    yes: 'Yes',
    understand: 'I Understand',
    close: 'Close',
    retry: 'Retry',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    pending: 'Pending',
    complete: 'Complete',
    completed: 'Completed',
    totalSteps: 'Total Steps',
    sprints: 'Sprints',
    gotIt: 'Got it'
  },

  // Layout & Meta
  layout: {
    title: 'Estimation Tool SSE Client',
    description: 'Real-time estimation tool updates via Server-Sent Events'
  },

  // Connection Status
  connection: {
    connected: 'Connected',
    connecting: 'Connecting',
    disconnected: 'Disconnected',
    analysisComplete: 'Analysis Complete'
  },

  // File Upload
  fileUpload: {
    uploadSuccess: 'File Uploaded Successfully!',
    fileValidated: 'PDF validated and ready for analysis',
    uploadRfpTitle: 'Upload RFP Document',
    uploadRfpDescription: 'Your RFP document has been successfully uploaded and validated.',
    whatHappensNext: 'What Happens Next',
    analysisDescription: 'Our advanced AI will analyze your document through 8 comprehensive steps including platform identification, requirements extraction, technology stack recommendations, team composition planning, effort estimation, and detailed development roadmap creation.',
    startAnalysis: 'Start RFP Analysis',
    uploadDifferent: 'Upload Different RFP',
    chooseFile: 'Choose Your RFP File',
    readyToAnalyze: 'Ready to Analyze Your RFP',
    legalDisclaimer: 'Legal Disclaimer',
    uploadingDocument: 'Uploading Your Document',
    processingMessage: 'Please wait while we securely process your RFP file...',
    processingPdf: 'Processing PDF document...',
    uploadDifferentFile: 'Upload Different File',
    exportReport: 'Export Report',
    clickStartAnalysis: 'Click "Start AI Analysis" below to begin your comprehensive project estimation'
  },

  // Page Content
  pageContent: {
    aiPoweredTitle: 'AI-Powered Project Estimation',
    aiPoweredDescription: 'Upload your RFP document and receive comprehensive AI analysis with detailed project estimation, team recommendations, and development roadmaps.',
    exploreFullVersion: 'Explore Full Version',
    wantMoreFeatures: '✨ Want More Advanced Features?',
    upgradeDescription: 'Upgrade to the full Q Estimation Tool for comprehensive project planning'
  },

  // Confirmation Dialogs
  confirmations: {
    uploadDifferentTitle: 'Upload Different RFP',
    uploadDifferentMessage: 'Are you sure you want to upload a different RFP? This will start a completely new analysis and you will lose the current progress.',
    uploadDifferentConfirm: 'Upload Different RFP'
  },

  // Error Messages
  errors: {
    somethingWentWrong: 'Something went wrong',
    defaultErrorMessage: 'We encountered an issue processing your file. Please try uploading again and if the problem persists, contact support.',
    stepFailed: 'Step Failed',
    stepFailedDescription: 'This step encountered an error during processing. Please check the details below or try restarting the analysis to resolve the issue.',
    tryAgain: 'Try Again',
    uploadInvalid: 'Upload completed but response was invalid. Please try again.',
    uploadFailed: 'Upload failed. Please try again.',
    failedToRestart: 'Failed to restart analysis. Please try again.',
    failedToStart: 'Failed to start analysis. Please try again.',
    failedToSend: 'Failed to send report. Please try again.',
    failedToExport: 'Failed to export PDF. Please try again.',
    failedToGenerate: 'Failed to generate PDF',
    enterEmail: 'Please enter an email address',
    enterValidEmail: 'Please enter a valid email address',
    pleaseUploadPdf: 'Please upload a PDF file',
    uploadFailedWithStatus: 'Upload failed: {status}',
    uploadFailedTryAgain: 'Upload failed. Please try again.',
    failedToSendReport: 'Failed to send report. Please try again.'
  },

  // Analysis Progress
  analysis: {
    inProgress: 'Analysis in Progress',
    inProgressDescription: 'Your RFP document is being analyzed. Click on any step in the progress bar above to view detailed results as they become available.',
    currentlyProcessing: 'Currently Processing',
    waitingToStart: 'Waiting to Start',
    analysisCompleteTitle: 'Analysis Complete! 🎉',
    analysisCompleteDescription: 'Your project estimation is ready. Export the report or send it via email.',
    navigationDescription: 'Navigate through the analysis steps using the progress bar above. Click on any completed step to view detailed insights and recommendations.',
    processingDescription: 'Your RFP document is being analyzed with advanced AI technology. Results will appear as each step completes.',
    comprehensiveReady: 'Your comprehensive project estimation is ready for export',
    comprehensiveProjectReady: 'Your comprehensive project estimation is ready',
    analysisProgress: 'Analysis Progress',
    aiAnalyzing: 'AI is analyzing your RFP document...',
    analysisInProgress: 'Analysis in progress...',
    complete: 'Complete',
    allStepsCompleted: 'All {steps} steps completed successfully'
  },

  // Step Status Messages
  stepStatus: {
    pending: {
      firstStep: 'This is the first step of the analysis. It will begin automatically when you start the analysis process.',
      firstStepStarted: 'Analysis is starting. This step should begin processing shortly.',
      waitingForPrevious: 'Waiting for preceding steps to be completed before this step will be started automatically.',
      readyToStart: 'This step is ready to begin and will start automatically once the analysis process is initiated.'
    },
    processing: {
      activelyAnalyzing: 'AI is actively analyzing your RFP for',
      resultsWillAppear: 'Results will appear here when complete.'
    },
    completed: {
      analysisComplete: 'This analysis step has been completed successfully! Review the detailed results and insights below.',
      documentPreparation: 'Your RFP has been successfully prepared for analysis',
      platforms: 'Target platforms have been identified based on your requirements',
      requirements: 'Functional and non-functional requirements have been extracted',
      techstack: 'Technology recommendations have been generated',
      teamComposition: 'Optimal team structure has been determined',
      effortEstimation: 'Timeline and effort estimates have been calculated',
      developmentPlan: 'Comprehensive development roadmap has been created',
      finalReport: 'Complete project estimation report is ready',
      platformAnalysisComplete: 'Platform Analysis Complete',
      requirementsAnalysisComplete: 'Requirements Analysis Complete',
      technologyStackAnalysisComplete: 'Technology Stack Analysis Complete',
      teamCompositionAnalysisComplete: 'Team Composition Analysis Complete',
      documentPreparationComplete: 'Document Preparation Complete',
      effortEstimationComplete: 'Effort Estimation Complete',
      developmentPlanComplete: 'Development Plan Complete',
      finalReportComplete: 'Final Report Complete'
    }
  },

  // Step Durations
  stepDurations: {
    documentPreparation: 'This typically takes 5-10 seconds.',
    platforms: 'This typically takes 7-15 seconds.',
    requirements: 'This typically takes 1-2 minutes.',
    techstack: 'This typically takes 10-20 seconds.',
    teamComposition: 'This typically takes 10-20 seconds.',
    effortEstimation: 'This typically takes 7-15 seconds.',
    developmentPlan: 'This typically takes 1-2 minutes.',
    default: 'This typically takes 10-30 seconds.'
  },

  // Development Plan
  developmentPlan: {
    phases: 'Development Phases',
    crossCuttingConcerns: 'Cross-cutting Concerns'
  },

  // Modal Content
  modals: {
    privacyTitle: 'Privacy & Email Usage',
    documentUploadTitle: 'Document Upload & Usage',
    documentUploadContent: 'By uploading documents to this platform, you confirm that you have the necessary rights and permissions to share this information. You agree that uploaded documents may be stored and processed by our platform for analysis purposes.',
    confidentialityTitle: 'Confidentiality & Data Handling',
    confidentialityContent: 'Documents uploaded to this platform are considered public domain with no confidentiality guarantee. We recommend not uploading sensitive, proprietary, or confidential information. The platform is designed for public RFP documents and general project specifications.',
    legalComplianceTitle: 'Legal Compliance',
    legalComplianceContent: 'You are responsible for ensuring that your uploads do not violate any applicable laws, regulations, or third-party rights. This includes but is not limited to copyright, trademark, privacy, and data protection laws.',
    aiDisclaimerTitle: 'AI Analysis Disclaimer',
    aiDisclaimerContent: 'The analysis provided by this platform is generated using artificial intelligence and should be used as a reference tool only. Results are estimates and recommendations based on the information provided. We do not guarantee the accuracy, completeness, or suitability of the analysis for any specific purpose.',
    limitationTitle: 'Limitation of Liability',
    limitationContent: 'This platform is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use of this platform or reliance on the analysis results.'
  },

  // Features
  features: {
    riskAnalysis: 'Risk Analysis',
    riskAnalysisDescription: 'Risk identification, mitigation strategies, and regulatory compliance',
    manualControl: 'Manual Control',
    manualControlDescription: 'Human oversight, manual steering, and approval workflows'
  },

  // Success Messages
  success: {
    reportSent: 'Professional report sent successfully!',
    pdfExported: 'Professional PDF exported successfully!',
    reportSentSuccess: 'Report sent successfully!'
  },

  // Email Content
  email: {
    emailAddress: 'Email Address',
    enterEmailAddress: 'Enter your email address',
    enterValidEmail: '• Please enter a valid email address',
    emailConsentText: 'Your email address is required to deliver your personalized project estimation report. By providing your email, you consent to receive:',
    qLogo: 'Q Logo',
    sending: 'Sending...',
    sendViaEmail: 'Send via Email',
    downloadPdf: 'Download PDF',
    privacyDisclaimer: 'Privacy & Email Usage Disclaimer',
    understood: 'Understood'
  },

  // PDF Generation
  pdf: {
    estimationTool: 'Estimation Tool',
    projectEstimationReport: 'Project Estimation Report',
    basicAnalysisRecommendations: 'Basic Analysis & Recommendations',
    rfpDocument: 'RFP Document',
    generated: 'Generated',
    documentType: 'Document Type',
    basicRfpAnalysis: 'Basic RFP Analysis',
    unknownRfp: 'Unknown RFP',
    aiDisclaimer: 'This document contains AI-generated analysis and recommendations based on the uploaded RFP. Please review all details carefully before making business decisions.',
    basicAnalysis: 'Basic Analysis',
    qAiEstimationTool: 'Q - AI Estimation Tool',
    page: 'Page',
    of: 'of',
    tableOfContents: 'Table of Contents',
    executiveSummary: 'Executive Summary'
  },

  // Analysis Results
  analysisResults: {
    immediateReportDelivery: 'Immediate Report Delivery',
    immediateReportDescription: 'Your professional PDF analysis report sent directly to your inbox',
    occasionalCommunications: 'Occasional Value-Added Communications',
    privacyGuarantee: 'Privacy Guarantee',
    aiEstimationTool: 'AI Estimation Tool',
    free: 'FREE',
    comprehensiveBreakdown: 'Comprehensive project breakdown',
    teamPlanning: 'Team Planning',
    optimalAllocation: 'Optimal resource allocation',
    timelineEstimates: 'Timeline Estimates',
    pdfOnly: 'PDF Only',
    whatThisStepWillDo: 'What This Step Will Do',
    processingStatus: 'Processing Status',
    errorDetails: 'Error Details',
    documentParsed: 'Document Parsed',
    contentExtracted: 'Content extracted and structured',
    dataOrganized: 'Data Organized',
    keyInformationIdentified: 'Key information identified',
    aiReady: 'AI Ready',
    preparedForAnalysis: 'Prepared for analysis',
    identifiedTargetPlatforms: 'Identified Target Platforms',
    analysisRationale: 'Analysis Rationale',
    functionalRequirements: 'Functional Requirements',
    nonFunctionalRequirements: 'Non-Functional Requirements',
    requirementsSummary: 'Requirements Summary',
    functional: 'Functional',
    nonFunctional: 'Non-Functional',
    extractedRequirements: 'Extracted Requirements',
    recommendedTechnologyStack: 'Recommended Technology Stack',
    thirdPartyIntegrations: 'Third-Party Integrations',
    technologySelectionRationale: 'Technology Selection Rationale',
    technologyRecommendations: 'Technology Recommendations',
    teamStructureOverview: 'Team Structure Overview',
    totalTeamSize: 'Total Team Size',
    distinctRoles: 'Distinct Roles',
    fullTimeRoles: 'Full-time Roles',
    teamStructureRationale: 'Team Structure Rationale',
    teamCompositionAnalysis: 'Team Composition Analysis',
    projectTimelineEstimates: 'Project Timeline Estimates',
    bestCase: 'Best Case',
    expected: 'Expected',
    worstCase: 'Worst Case',
    sprintTimelineBreakdown: 'Sprint Timeline Breakdown',
    sprintDuration: 'Sprint Duration',
    estimationRationale: 'Estimation Rationale',
    effortEstimationAnalysis: 'Effort Estimation Analysis',
    developmentPlanOverview: 'Development Plan Overview',
    developmentPhases: 'Development Phases',
    totalSprints: 'Total Sprints',
    crossCuttingAreas: 'Cross-cutting Areas',
    sprintTimeline: 'Sprint Timeline',
    crossCuttingConcerns: 'Cross-cutting Concerns',
    developmentRoadmap: 'Development Roadmap',
    detailedEstimation: 'Detailed Estimation',
    detailedEstimationDescription: 'Per-technology estimates, financial analysis, and discovery deliverables',
    integrations: 'Integrations',
    integrationsDescription: 'Google Slides proposals, HubSpot sync, and workflow automation',
    onPremise: 'On-Premise',
    onPremiseDescription: 'Private deployment, open-source AI models, and enhanced security',
    advancedPlanning: 'Advanced Planning',
    advancedPlanningDescription: 'Per-task estimation, technical roadmaps, and discovery steps',
    legalCompliance: 'Legal Compliance',
    aiAnalysisDisclaimer: 'AI Analysis Disclaimer',
    limitationOfLiability: 'Limitation of Liability'
  },

  // Steps
  steps: {
    documentPreparation: {
      title: 'Preparation',
      description: 'Structuring and preparing document for analysis',
      details: 'Your uploaded RFP document is being processed and structured. The system is extracting text content, analyzing document layout, and preparing the data for comprehensive AI analysis.'
    },
    platforms: {
      title: 'Platforms',
      description: 'Identify target platforms and technologies',
      details: 'Analyzing the document to identify which platforms the solution will need to support (web, mobile, backend, admin portal, etc.) based on the project requirements.'
    },
    requirements: {
      title: 'Requirements',
      description: 'Extract functional and non-functional requirements',
      details: 'Analyzing the document to identify and categorize all functional and non-functional requirements specified in the RFP.'
    },
    techstack: {
      title: 'Techstack',
      description: 'Determine optimal technology stack',
      details: 'Analyzing requirements and constraints to recommend the most suitable technology stack for the project implementation.'
    },
    teamComposition: {
      title: 'Team',
      description: 'Determine optimal team structure',
      details: 'Analyzing project requirements and technology stack to recommend the optimal team composition, roles, and resource allocation.'
    },
    effortEstimation: {
      title: 'Estimate',
      description: 'Estimate effort required for each component',
      details: 'Based on the analyzed requirements, technology stack, and team composition, calculating the effort required for project implementation in sprint cycles.'
    },
    developmentPlan: {
      title: 'Roadmap',
      description: 'Create detailed development roadmap',
      details: 'A comprehensive development plan is generated, outlining phases, milestones, and timelines for the project implementation.'
    },
    finalReport: {
      title: 'Final Report',
      description: 'Generate comprehensive estimation report',
      details: 'The final report provides a complete summary of the analysis, including cost estimates, timeline projections, and recommendations for project execution.'
    }
  }
};

export type LocalizationKeys = typeof en;

// Simple localization hook
export const useLocalization = () => {
  return { t: en };
};

// Helper function to get nested translations
export const getTranslation = (key: string, translations: any = en): string => {
  const keys = key.split('.');
  let result = translations;
  
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key; // Return the key if translation not found
    }
  }
  
  return typeof result === 'string' ? result : key;
}; 