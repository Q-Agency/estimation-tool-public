'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { config, validateConfig } from '@/lib/config';

// Add a function to convert markup to HTML
const convertMarkupToHtml = (markup: string): string => {
  if (!markup) return '';
  
  // Replace markdown-style headers
  let html = markup.replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: rgb(31, 41, 55); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</h3>');
  
  // Replace bold and italic text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: rgb(31, 41, 55);">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em style="color: rgb(75, 85, 99);">$1</em>');
  
  // Replace lists
  html = html.replace(/^\s*[-*+]\s+(.*$)/gm, '<li style="margin-left: 1.5rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">$1</li>');
  // Fix the regex to avoid using the 's' flag which requires ES2018
  const listItems = html.match(/<li style="margin-left: 1.5rem;.*?<\/li>/g);
  if (listItems && listItems.length > 0) {
    const listContent = listItems.join('');
    html = html.replace(listContent, `<ul style="list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: rgb(55, 65, 81);">${listContent}</ul>`);
  }
  
  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: rgb(75, 85, 99); text-decoration: underline; font-weight: 500;" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Handle markdown tables
  const tableRegex = /\|(.*?)\|/g;
  const tableRows = html.match(/^\|.*\|$/gm);
  
  if (tableRows && tableRows.length > 0) {
    // Find the table boundaries
    const tableStartIndex = html.indexOf(tableRows[0]);
    const tableEndIndex = html.indexOf(tableRows[tableRows.length - 1]) + tableRows[tableRows.length - 1].length;
    
    // Extract the table content
    let tableContent = html.substring(tableStartIndex, tableEndIndex);
    
    // Process the table
    const rows = tableContent.split('\n').filter(row => row.trim() !== '');
    
    // Skip the separator row (the one with dashes)
    const headerRow = rows[0];
    const dataRows = rows.slice(2);
    
    // Extract headers
    const headers = headerRow.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
    
    // Create table HTML with page-break-before to ensure tables start on a new page
    let tableHtml = '<div style="page-break-before: always; overflow-x: auto; margin: 1.5rem 0; border: 1px solid rgb(229, 231, 235); border-radius: 0.5rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); background-color: rgb(255, 255, 255); font-family: \'Inter\', system-ui, -apple-system, sans-serif;"><table style="min-width: 100%; border-collapse: separate; border-spacing: 0;">';
    
    // Add table header
    tableHtml += '<thead>';
    tableHtml += '<tr style="background-color: rgb(249, 250, 251); border-bottom: 1px solid rgb(229, 231, 235);">';
    headers.forEach(header => {
      tableHtml += `<th style="padding: 0.875rem 1.25rem; text-align: left; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgb(31, 41, 55); border-right: 1px solid rgb(229, 231, 235);">${header}</th>`;
    });
    tableHtml += '</tr>';
    tableHtml += '</thead>';
    
    // Add table body
    tableHtml += '<tbody style="background-color: rgb(255, 255, 255);">';
    dataRows.forEach((row, rowIndex) => {
      const cells = row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
      
      // Check if this is the total row
      const isTotalRow = cells[0].includes('Total') || cells[0].includes('total');
      
      tableHtml += `<tr style="${isTotalRow ? 'background-color: rgb(249, 250, 251);' : rowIndex % 2 === 0 ? 'background-color: rgb(255, 255, 255);' : 'background-color: rgb(249, 250, 251);'} border-bottom: 1px solid rgb(229, 231, 235);">`;
      cells.forEach((cell, cellIndex) => {
        const isLastCell = cellIndex === cells.length - 1;
        tableHtml += `<td style="padding: 0.875rem 1.25rem; white-space: nowrap; font-size: 0.875rem; ${isTotalRow ? 'font-weight: 600; color: rgb(31, 41, 55);' : 'color: rgb(55, 65, 81);'} ${!isLastCell ? 'border-right: 1px solid rgb(229, 231, 235);' : ''}">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
    tableHtml += '</table></div>';
    
    // Replace the original table with the HTML table
    html = html.substring(0, tableStartIndex) + tableHtml + html.substring(tableEndIndex);
  }
  
  // Replace paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 1rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">');
  
  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<p')) {
    html = '<p style="margin-bottom: 1rem; color: rgb(55, 65, 81); font-family: \'Inter\', system-ui, -apple-system, sans-serif;">' + html;
  }
  if (!html.endsWith('</p>')) {
    html = html + '</p>';
  }
  
  return html;
};

interface StepEvent {
  step: string;
  title: string;
  output: string;
  tech_stack?: string;
  delivery_context?: string;
}

interface Step {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  description?: string;
  details?: string;
  tech_stack?: {
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
  };
  delivery_context?: {
    regulatory_requirements: string[];
    localization: string[];
    user_types: string[];
    project_type: string;
    delivery_model: string;
    security_needs: string[];
    timeline_pressure: string;
  };
}

interface DevelopmentPhase {
  name: string;
  sprints: {
    start: number;
    end: number;
  };
  items: string[];
}

interface CrossCuttingConcerns {
  infrastructure: string[];
  security: string[];
  testing: string[];
  documentation: string[];
  deployment: string[];
}

interface DevelopmentPlan {
  phases: DevelopmentPhase[];
  cross_cutting: CrossCuttingConcerns;
}

// Add new interfaces for email functionality
interface EmailFormData {
  email: string;
  isSubmitting: boolean;
}

const INITIAL_STEPS: Step[] = [
  { 
    id: 'project_info', 
    title: 'Project Info', 
    status: 'pending',
    description: 'Upload and process your RFP document',
    details: 'This step involves uploading your RFP document and preparing it for analysis. The system will validate the document format and ensure it can be processed correctly.'
  },
  { 
    id: 'scope_analysis', 
    title: 'Scope Analysis', 
    status: 'pending',
    description: 'Analyze project scope and requirements',
    details: 'The system analyzes the scope of work, identifies key deliverables, and evaluates the complexity of requirements to determine the overall project scope.'
  },
  { 
    id: 'team_composition', 
    title: 'Team Composition', 
    status: 'pending',
    description: 'Determine optimal team structure',
    details: 'The system recommends the optimal team composition based on the project requirements, including roles, skills, and experience levels needed.'
  },
  { 
    id: 'effort_estimation', 
    title: 'Effort Estimation', 
    status: 'pending',
    description: 'Estimate effort required for each component',
    details: 'Based on the analyzed requirements and team composition, the AI calculates the effort required for each component of the project, providing detailed estimates in person-hours or days.'
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

const DevelopmentPlanDisplay = ({ plan }: { plan: DevelopmentPlan }) => {
  return (
    <div className="space-y-6">
      {/* Phases Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Development Phases</h3>
        <div className="space-y-6">
          {plan.phases.map((phase, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-800">{phase.name}</h4>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Sprints {phase.sprints.start}-{phase.sprints.end}
                </span>
              </div>
              <ul className="space-y-2">
                {phase.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-cutting Concerns Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Cross-cutting Concerns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(plan.cross_cutting).map(([category, items]: [string, string[]]) => (
            <div key={category} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h4 className="text-lg font-medium text-gray-800 capitalize mb-3">{category}</h4>
              <ul className="space-y-2">
                {items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [emailFormData, setEmailFormData] = useState<EmailFormData>({ email: '', isSubmitting: false });
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const scopeItemsRef = useRef<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const stepsRef2 = useRef<Step[]>(INITIAL_STEPS);

  // Validate configuration on mount
  useEffect(() => {
    validateConfig();
  }, []);

  useEffect(() => {
    // Only set up the EventSource if we have a session ID
    if (sessionId) {
      // Store the current session ID in the ref
      currentSessionIdRef.current = sessionId;
      
              // Create a new EventSource connection with the session ID
        const eventSource = new EventSource(`${config.sseBaseUrl}/events?sessionId=${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('step', (event) => {
        try {
          const data: StepEvent = JSON.parse(event.data);
          
          // Only process events for the current session
          if (currentSessionIdRef.current !== sessionId) {
            console.log('Ignoring event for different session');
            return;
          }
          
          // Log the received data
          console.log('Received SSE data:', data);
          
          // If this is the project info step, parse the tech stack
          if (data.step === 'project_info') {
            try {
              // Parse tech stack if it exists
              if (data.tech_stack) {
                const parsedTechStack = JSON.parse(data.tech_stack);
                console.log('Parsed Tech Stack:', parsedTechStack);
                
                // Parse delivery context if it exists
                let parsedDeliveryContext = null;
                if (data.delivery_context) {
                  try {
                    parsedDeliveryContext = JSON.parse(data.delivery_context);
                    console.log('Parsed Delivery Context:', parsedDeliveryContext);
                  } catch (e) {
                    console.error('Error parsing delivery context:', e);
                  }
                }
                
                // Update step status based on the received event
                setSteps((prevSteps) => {
                  const newSteps = [...prevSteps];
                  const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
                  
                  if (currentStepIndex !== -1) {
                    // Mark current step as done
                    newSteps[currentStepIndex].status = 'done';
                    
                    // Update step details with the output
                    if (data.output) {
                      newSteps[currentStepIndex].details = data.output;
                    }
                    
                    // Add the tech stack data
                    newSteps[currentStepIndex].tech_stack = parsedTechStack;
                    
                    // Add the delivery context data if it exists
                    if (parsedDeliveryContext) {
                      newSteps[currentStepIndex].delivery_context = parsedDeliveryContext;
                    }
                    
                    // Set next step to in_progress if it exists
                    if (currentStepIndex + 1 < newSteps.length) {
                      newSteps[currentStepIndex + 1].status = 'in_progress';
                      
                      // Select the new active step
                      setSelectedStep(newSteps[currentStepIndex + 1]);
                      setIsDetailsOpen(true);
                    } else {
                      // All steps are complete
                      setIsProcessing(false);
                    }
                  }
                  
                  return newSteps;
                });
              }
            } catch (e) {
              console.error('Error parsing tech stack:', e);
            }
          } else {
            // Update step status based on the received event
            setSteps((prevSteps) => {
              const newSteps = [...prevSteps];
              const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
              
              if (currentStepIndex !== -1) {
                // Mark current step as done
                newSteps[currentStepIndex].status = 'done';
                
                // Update step details with the output
                if (data.output) {
                  newSteps[currentStepIndex].details = data.output;
                }
                
                // Set next step to in_progress if it exists
                if (currentStepIndex + 1 < newSteps.length) {
                  newSteps[currentStepIndex + 1].status = 'in_progress';
                  
                  // Select the new active step
                  setSelectedStep(newSteps[currentStepIndex + 1]);
                  setIsDetailsOpen(true);
                } else {
                  // All steps are complete
                  setIsProcessing(false);
                }
              }
              
              return newSteps;
            });
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        setIsProcessing(false);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [sessionId]);

  // Scroll to active step when it changes
  useEffect(() => {
    if (stepsRef.current) {
      const activeStepElement = stepsRef.current.children[activeStepIndex] as HTMLElement;
      if (activeStepElement) {
        activeStepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeStepIndex]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    // Generate a new session ID for this upload
    const newSessionId = Math.random().toString(36).substring(2, 15);
    setSessionId(newSessionId);
    currentSessionIdRef.current = newSessionId;

    // Reset steps to initial state
    setSteps(JSON.parse(JSON.stringify(INITIAL_STEPS)));
    stepsRef2.current = JSON.parse(JSON.stringify(INITIAL_STEPS));

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', newSessionId);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Remove success toast for file upload
          // toast.success('File uploaded successfully!');
          
          // Update project info step to in_progress after successful upload
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const projectInfoIndex = newSteps.findIndex(step => step.id === 'project_info');
            
            if (projectInfoIndex !== -1) {
              newSteps[projectInfoIndex].status = 'in_progress';
              setActiveStepIndex(projectInfoIndex);
              
              // Select the project info step
              setSelectedStep(newSteps[projectInfoIndex]);
              setIsDetailsOpen(true);
            }
            
            return newSteps;
          });
          
          // Set processing state to true
          setIsProcessing(true);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          toast.error(`Upload failed: ${xhr.statusText}`);
        }
        setIsUploading(false);
      });

      xhr.addEventListener('error', () => {
        toast.error('Upload failed. Please try again.');
        setIsUploading(false);
      });

              xhr.open('POST', `${config.apiBaseUrl}/rfp-upload`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovered(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovered(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovered(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      uploadFile(file);
    }
  };

  const handleStepClick = (step: Step) => {
    setSelectedStep(step);
    setIsDetailsOpen(true);
  };

  const toggleDetails = () => {
    setIsDetailsOpen(!isDetailsOpen);
  };

  const resetUpload = () => {
    // Close the existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Reset all state variables
    setUploadedFileName(null);
    setSteps(JSON.parse(JSON.stringify(INITIAL_STEPS)));
    stepsRef2.current = JSON.parse(JSON.stringify(INITIAL_STEPS));
    setSelectedStep(null);
    setIsDetailsOpen(false);
    setIsProcessing(false);
    setUploadProgress(0);
    setIsUploading(false);
    setSessionId(null);
    currentSessionIdRef.current = null;
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailFormData({ ...emailFormData, email: e.target.value });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailFormData.email || !emailFormData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setEmailFormData({ ...emailFormData, isSubmitting: true });
    
    try {
      // Get the final report content
      const finalReportStep = steps.find(step => step.title === 'Final Report');
      if (!finalReportStep?.details) {
        toast.error('Final report not available');
        setEmailFormData({ ...emailFormData, isSubmitting: false });
        return;
      }

      // Use the uploadedFileName state variable that was set during file upload
      const originalFilename = uploadedFileName || 'development-plan.pdf';
      
      // Create a temporary div to hold the content with proper styling
      const tempDiv = document.createElement('div');
      tempDiv.style.padding = '40px';
      tempDiv.style.maxWidth = '800px';
      tempDiv.style.margin = '0 auto';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.color = 'rgb(26, 26, 26)';
      tempDiv.style.lineHeight = '1.6';
      
      // Add header with logo and title
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 16px;">
            <img src="/Q.png" alt="Q Badge" style="height: 64px; display: inline-block;" />
            <img src="/ai_powered.png" alt="AI Powered" style="height: 128px; display: inline-block;" />
          </div>
          <h1 style="font-size: 32px; font-weight: 600; margin: 0; color: rgb(31, 41, 55); font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            RFP Analysis
          </h1>
          <p style="font-size: 16px; color: rgb(75, 85, 99); margin-top: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            ${originalFilename}
          </p>
        </div>
        <div style="background: rgb(255, 255, 255); border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${convertMarkupToHtml(finalReportStep.details)}
        </div>
        <div style="text-align: center; margin-top: 40px; color: rgb(75, 85, 99); font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <img src="/Q.png" alt="Q Badge" style="height: 24px; width: auto;" />
          Generated by AI RFP Analysis Tool
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Configure PDF options
      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: originalFilename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as 'portrait' | 'landscape',
          compress: true
        }
      };

      // Generate PDF as a blob
      const pdfBlob = await html2pdf().from(tempDiv).set(options).output('blob');
      
      // Clean up the temporary div
      document.body.removeChild(tempDiv);
      
      // Create FormData to send the PDF
      const formData = new FormData();
      formData.append('file', pdfBlob, originalFilename);
      formData.append('email', emailFormData.email);
      formData.append('sessionId', sessionId || '');
      formData.append('originalFilename', originalFilename);
      
      // Send the PDF to the server
              const response = await fetch(`${config.apiBaseUrl}/sendToEmail`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      toast.success('Report sent to your email!');
      setShowEmailForm(false);
      setEmailFormData({ email: '', isSubmitting: false });
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
      setEmailFormData({ ...emailFormData, isSubmitting: false });
    }
  };

  const handleExportPDF = async () => {
    const finalReportStep = steps.find(step => step.title === 'Final Report');
    if (!finalReportStep?.details) {
      toast.error('Final report not available');
      return;
    }

    toast.loading('Generating PDF...');

    try {
      // Dynamically import html2pdf only on the client side
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary div to hold the content with proper styling
      const tempDiv = document.createElement('div');
      tempDiv.style.padding = '40px';
      tempDiv.style.maxWidth = '800px';
      tempDiv.style.margin = '0 auto';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.color = 'rgb(26, 26, 26)'; // Using RGB instead of hex
      tempDiv.style.lineHeight = '1.6';
      
      // Add header with logo and title
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 16px;">
            <img src="/Q.png" alt="Q Badge" style="height: 64px; display: inline-block;" />
            <img src="/ai_powered.png" alt="AI Powered" style="height: 128px; display: inline-block;" />
          </div>
          <h1 style="font-size: 32px; font-weight: 600; margin: 0; color: rgb(31, 41, 55); font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            RFP Analysis
          </h1>
          <p style="font-size: 16px; color: rgb(75, 85, 99); margin-top: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            ${uploadedFileName || 'development-plan.pdf'}
          </p>
        </div>
        <div style="background: rgb(255, 255, 255); border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${convertMarkupToHtml(finalReportStep.details)}
        </div>
        <div style="text-align: center; margin-top: 40px; color: rgb(75, 85, 99); font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <img src="/Q.png" alt="Q Badge" style="height: 24px; width: auto;" />
          Generated by AI RFP Analysis Tool
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      // Configure PDF options with better quality settings
      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: 'development-plan.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as 'portrait' | 'landscape',
          compress: true
        }
      };

      // Generate and save PDF
      await html2pdf().from(tempDiv).set(options).save();
      
      // Clean up
      document.body.removeChild(tempDiv);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const isFinalReportComplete = () => {
    const finalReportStep = steps.find(step => step.id === 'final_report');
    return finalReportStep?.status === 'done';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-blue-50">
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-block mb-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              AI-POWERED
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
            RFP Analysis Tool
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload your RFP document and our advanced AI will analyze it to provide detailed insights, 
            effort estimation, and team composition recommendations.
          </p>
        </div>
        
        <div className="flex gap-6 mb-8">
          {/* Upload section - Left side */}
          <div className="w-1/3 p-4 bg-white rounded-lg shadow border border-blue-100">
            <h2 className="text-base font-medium mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Upload RFP Document
            </h2>
            
            {isProcessing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">Processing: {uploadedFileName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetUpload}
                      className="px-2 py-1 bg-red-50 border border-red-300 rounded text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Stop
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className={`border-2 border-dashed rounded p-3 text-center transition-all duration-300 ${
                  isHovered 
                    ? 'border-blue-400 bg-blue-50 shadow-inner' 
                    : 'border-blue-200 bg-blue-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isUploading || isProcessing}
                />
                
                {isUploading ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-600 text-xs">Uploading... {uploadProgress}%</p>
                    {uploadedFileName && (
                      <p className="text-gray-500 text-xs truncate max-w-full">
                        <span className="font-medium">File:</span> {uploadedFileName}
                      </p>
                    )}
                  </div>
                ) : (
                  <div 
                    className="cursor-pointer transform transition-all duration-300 hover:scale-105"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full p-2 inline-block mb-2">
                      <svg 
                        className="h-6 w-6 text-blue-500" 
                        stroke="currentColor" 
                        fill="none" 
                        viewBox="0 0 48 48" 
                        aria-hidden="true"
                      >
                        <path 
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                          strokeWidth={2} 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                      </svg>
                    </div>
                    <p className="text-gray-700 text-xs mb-1">
                      <span className="text-blue-600 hover:text-blue-500">
                        Click to upload
                      </span> or drag and drop
                    </p>
                    <p className="text-gray-500 text-xs">PDF files only</p>
                  </div>
                )}
              </div>
            )}
            
            {isProcessing && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={resetUpload}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Try Another Upload
                </button>
              </div>
            )}
          </div>

          {/* Progress section - Right side */}
          {isProcessing && (
            <div className="w-2/3 p-4 bg-white rounded-lg shadow border border-blue-100">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-medium inline-block py-0.5 px-2 rounded-full text-blue-600 bg-blue-200">
                      Analysis Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium inline-block text-blue-600">
                      {Math.round((steps.filter(step => step.status === 'done').length / steps.length) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-gray-100 border border-gray-200">
                  <div
                    style={{ width: `${(steps.filter(step => step.status === 'done').length / steps.length) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-size-200 animate-gradient transition-all duration-500 ease-out rounded-full"
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Steps sidebar */}
          <div className="md:w-1/3 lg:w-1/4">
            <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100 h-full">
              <h2 className="text-lg font-bold mb-5 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Analysis Steps
              </h2>
              
              <div className="relative">
                {/* Progress line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-indigo-200"></div>
                
                <div ref={stepsRef} className="space-y-2">
                  {steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className={`relative pl-10 transition-all duration-300 ${
                        step.status === 'in_progress' ? 'scale-105' : ''
                      }`}
                    >
                      {/* Step content */}
                      <div 
                        className={`p-2 rounded-lg shadow-sm transition-all duration-300 cursor-pointer ${
                          selectedStep?.id === step.id
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 transform -translate-x-1'
                            : step.status === 'done' 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md' 
                              : step.status === 'in_progress'
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-md'
                              : 'bg-gray-50 border border-gray-200 hover:shadow-md'
                        }`}
                        onClick={() => handleStepClick(step)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            step.status === 'done' 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600' 
                              : step.status === 'in_progress'
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {step.status === 'done' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : step.status === 'in_progress' ? (
                              <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <span className="text-xs font-medium">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 flex-shrink-0">
                              {step.id === 'project_info' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {step.id === 'scope_analysis' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              )}
                              {step.id === 'effort_estimation' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              {step.id === 'team_composition' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              )}
                              {step.id === 'development_plan' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                              )}
                              {step.id === 'final_report' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                            <h3 className={`font-medium text-xs ${
                              step.status === 'done' 
                                ? 'text-green-800' 
                                : step.status === 'in_progress'
                                ? 'text-blue-800'
                                : 'text-gray-700'
                            }`}>{step.title}</h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Details panel */}
          <div className={`md:w-2/3 lg:w-3/4 transition-all duration-300 ${isDetailsOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
            <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100 h-full">
              {selectedStep ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {selectedStep.title}
                    </h2>
                    <div className="flex items-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedStep.status === 'done' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedStep.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedStep.status === 'done' 
                          ? 'Completed' 
                          : selectedStep.status === 'in_progress'
                          ? 'In Progress'
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-1">Description</h3>
                    <p className="text-gray-700 text-sm">{selectedStep.description}</p>
                  </div>
                  
                  {selectedStep.status === 'done' && selectedStep.details ? (
                    <div>
                      <h3 className="text-base font-semibold mb-1">Details</h3>
                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                        {selectedStep.id === 'project_info' ? (
                          <div className="space-y-4">
                            <div 
                              className="text-gray-700 text-sm prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: convertMarkupToHtml(selectedStep.details) }}
                            />
                            {selectedStep.tech_stack && Object.keys(selectedStep.tech_stack).length > 0 && (
                              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                                <h3 className="text-base font-semibold text-blue-800 mb-3">Technology Stack Analysis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* AI Needed Indicator */}
                                  {selectedStep.tech_stack.ai_needed !== undefined && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm col-span-2">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">AI Integration</h4>
                                      <div className="flex items-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          selectedStep.tech_stack.ai_needed 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {selectedStep.tech_stack.ai_needed ? 'AI Integration Required' : 'No AI Integration Required'}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Platforms */}
                                  {selectedStep.tech_stack.platforms && selectedStep.tech_stack.platforms.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Platforms</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.platforms.map((platform, index) => (
                                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                            {platform}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Integrations */}
                                  {selectedStep.tech_stack.integrations && selectedStep.tech_stack.integrations.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Integrations</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.integrations.map((integration, index) => (
                                          <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                            {integration}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Mobile Stack */}
                                  {selectedStep.tech_stack.mobile_stack && selectedStep.tech_stack.mobile_stack.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Mobile Stack</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.mobile_stack.map((tech, index) => (
                                          <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Web Stack */}
                                  {selectedStep.tech_stack.web_stack && selectedStep.tech_stack.web_stack.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Web Stack</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.web_stack.map((tech, index) => (
                                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Backend Stack */}
                                  {selectedStep.tech_stack.backend_stack && selectedStep.tech_stack.backend_stack.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Backend Stack</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.backend_stack.map((tech, index) => (
                                          <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Design Stack */}
                                  {selectedStep.tech_stack.design && selectedStep.tech_stack.design.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Design Stack</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.tech_stack.design.map((tech, index) => (
                                          <span key={index} className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Stack Model */}
                                  {selectedStep.tech_stack.stack_model && selectedStep.tech_stack.stack_model !== "Not specified" && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Stack Model</h4>
                                      <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                                          {selectedStep.tech_stack.stack_model}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Database & Deployment */}
                                  {(selectedStep.tech_stack.database && selectedStep.tech_stack.database !== "Not specified") || 
                                   (selectedStep.tech_stack.deployment && selectedStep.tech_stack.deployment !== "Not specified") ? (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Infrastructure</h4>
                                      <div className="space-y-2">
                                        {selectedStep.tech_stack.database && selectedStep.tech_stack.database !== "Not specified" && (
                                          <div>
                                            <span className="text-xs text-gray-500">Database:</span>
                                            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                              {selectedStep.tech_stack.database}
                                            </span>
                                          </div>
                                        )}
                                        {selectedStep.tech_stack.deployment && selectedStep.tech_stack.deployment !== "Not specified" && (
                                          <div>
                                            <span className="text-xs text-gray-500">Deployment:</span>
                                            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                              {selectedStep.tech_stack.deployment}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Rationale */}
                                  {selectedStep.tech_stack.rationale && selectedStep.tech_stack.rationale !== "No rationale provided" && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm col-span-2">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Rationale</h4>
                                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <p className="text-gray-700 text-sm whitespace-pre-line">
                                          {selectedStep.tech_stack.rationale}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Delivery Context Section - Now separate from tech stack */}
                            {selectedStep.delivery_context && Object.keys(selectedStep.delivery_context).length > 0 && (
                              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                                <h3 className="text-base font-semibold text-green-800 mb-3">Delivery Context</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Project Type & Delivery Model */}
                                  {(selectedStep.delivery_context.project_type || 
                                    selectedStep.delivery_context.delivery_model || 
                                    selectedStep.delivery_context.timeline_pressure) && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Project Details</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.delivery_context.project_type && (
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                            {selectedStep.delivery_context.project_type.charAt(0).toUpperCase() + selectedStep.delivery_context.project_type.slice(1)}
                                          </span>
                                        )}
                                        {selectedStep.delivery_context.delivery_model && (
                                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                            {selectedStep.delivery_context.delivery_model.toUpperCase()}
                                          </span>
                                        )}
                                        {selectedStep.delivery_context.timeline_pressure && (
                                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            selectedStep.delivery_context.timeline_pressure === 'high' 
                                              ? 'bg-red-100 text-red-700' 
                                              : selectedStep.delivery_context.timeline_pressure === 'normal'
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : 'bg-green-100 text-green-700'
                                          }`}>
                                            {selectedStep.delivery_context.timeline_pressure.charAt(0).toUpperCase() + selectedStep.delivery_context.timeline_pressure.slice(1)} Timeline
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Localization */}
                                  {selectedStep.delivery_context.localization && selectedStep.delivery_context.localization.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Localization</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.delivery_context.localization.map((lang, index) => (
                                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                            {lang.toUpperCase()}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* User Types */}
                                  {selectedStep.delivery_context.user_types && selectedStep.delivery_context.user_types.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">User Types</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.delivery_context.user_types.map((type, index) => (
                                          <span key={index} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Security Needs */}
                                  {selectedStep.delivery_context.security_needs && selectedStep.delivery_context.security_needs.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Security Needs</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.delivery_context.security_needs.map((need, index) => (
                                          <span key={index} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                            {need}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Regulatory Requirements */}
                                  {selectedStep.delivery_context.regulatory_requirements && selectedStep.delivery_context.regulatory_requirements.length > 0 && (
                                    <div className="bg-white rounded-lg p-3 shadow-sm">
                                      <h4 className="text-sm font-medium text-gray-700 mb-2">Regulatory Requirements</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedStep.delivery_context.regulatory_requirements.map((req, index) => (
                                          <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                            {req}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : selectedStep.id === 'scope_analysis' ? (
                          <div className="text-gray-700 text-sm">
                            {(() => {
                              try {
                                // Check if details is already an object
                                let scopeItems;
                                if (typeof selectedStep.details === 'string') {
                                  // Try to parse the details as JSON if it's a string
                                  scopeItems = JSON.parse(selectedStep.details);
                                } else if (typeof selectedStep.details === 'object') {
                                  // If it's already an object, use it directly
                                  scopeItems = selectedStep.details;
                                }
                                
                                if (Array.isArray(scopeItems)) {
                                  // Store the original scope items in the ref
                                  scopeItemsRef.current = scopeItems;
                                  
                                  // Update filtered items directly instead of using useEffect
                                  if (filteredItems.length === 0 || JSON.stringify(filteredItems) !== JSON.stringify(scopeItems)) {
                                    setFilteredItems(scopeItems);
                                  }
                                  
                                  // Filter items based on selected category
                                  const handleFilterChange = (category: string | null) => {
                                    setSelectedCategory(category);
                                    if (category === null) {
                                      setFilteredItems(scopeItemsRef.current);
                                    } else {
                                      // Only show items that exactly match the selected category
                                      const filtered = scopeItemsRef.current.filter(item => item.category === category);
                                      setFilteredItems(filtered);
                                    }
                                  };
                                  
                                  // Sort items by category
                                  const handleSort = () => {
                                    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortOrder(newOrder);
                                    
                                    const sorted = [...filteredItems].sort((a, b) => {
                                      if (newOrder === 'asc') {
                                        return a.category.localeCompare(b.category);
                                      } else {
                                        return b.category.localeCompare(a.category);
                                      }
                                    });
                                    
                                    setFilteredItems(sorted);
                                  };
                                  
                                  // Get unique categories
                                  const categories = Array.from(new Set(scopeItems.map(item => item.category)));
                                  
                                  // Define all possible categories with their full names
                                  const allCategories = [
                                    { id: 'FR', name: 'Functional Requirement' },
                                    { id: 'NFR', name: 'Non-functional Requirement' },
                                    { id: 'TC', name: 'Technical Constraint' },
                                    { id: 'BC', name: 'Business Constraint' }
                                  ];
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex flex-wrap gap-2 mb-4">
                                        <button
                                          onClick={() => handleFilterChange(null)}
                                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            selectedCategory === null 
                                              ? 'bg-blue-600 text-white' 
                                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          }`}
                                        >
                                          All
                                        </button>
                                        {allCategories.map(category => (
                                          <button
                                            key={category.id}
                                            onClick={() => handleFilterChange(category.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                              selectedCategory === category.id 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                          >
                                            {category.name}
                                          </button>
                                        ))}
                                        <button
                                          onClick={handleSort}
                                          className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
                                        >
                                          Sort {sortOrder === 'asc' ? '↑' : '↓'}
                                        </button>
                                      </div>
                                      
                                      <h4 className="font-medium text-gray-800">Identified Requirements:</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {filteredItems.length > 0 ? (
                                          filteredItems.map((item, index) => (
                                            <div key={index} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                                              <div className="flex items-start">
                                                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-3">
                                                  {item.category}
                                                </div>
                                                <p className="text-gray-700">{item.description}</p>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-center">
                                            <p className="text-gray-500 text-sm">
                                              {selectedCategory 
                                                ? `No ${allCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory} items found.` 
                                                : 'No items found.'}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // If parsing fails, display as regular text
                                console.error('Error parsing scope analysis data:', e);
                              }
                              // Default display if parsing fails or data is not an array
                              return <p className="whitespace-pre-line">{selectedStep.details}</p>;
                            })()}
                          </div>
                        ) : selectedStep.id === 'effort_estimation' ? (
                          <div className="text-gray-700 text-sm">
                            {(() => {
                              try {
                                // Check if details is already an object
                                let effortData;
                                if (typeof selectedStep.details === 'string') {
                                  // Try to parse the details as JSON if it's a string
                                  effortData = JSON.parse(selectedStep.details);
                                } else if (typeof selectedStep.details === 'object') {
                                  // If it's already an object, use it directly
                                  effortData = selectedStep.details;
                                }
                                
                                if (effortData && typeof effortData === 'object') {
                                  return (
                                    <div className="space-y-6">
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                                        <h3 className="text-lg font-semibold text-blue-800 mb-4">Estimated Project Duration</h3>
                                        
                                        <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-4">
                                          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex-1 text-center">
                                            <div className="text-3xl font-bold text-blue-600 mb-1">{effortData.min_sprints}</div>
                                            <div className="text-sm text-gray-600">Minimum Sprints</div>
                                          </div>
                                          
                                          <div className="text-2xl font-bold text-gray-400">-</div>
                                          
                                          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex-1 text-center">
                                            <div className="text-3xl font-bold text-blue-600 mb-1">{effortData.max_sprints}</div>
                                            <div className="text-sm text-gray-600">Maximum Sprints</div>
                                          </div>
                                        </div>
                                        
                                        <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                          <h4 className="font-medium text-gray-800 mb-2">Additional Notes</h4>
                                          <p className="text-gray-700">{effortData.note}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // If parsing fails, display as regular text
                                console.error('Error parsing effort estimation data:', e);
                              }
                              // Default display if parsing fails or data is not an object
                              return <p className="whitespace-pre-line">{selectedStep.details}</p>;
                            })()}
                          </div>
                        ) : selectedStep.id === 'team_composition' ? (
                          <div className="text-gray-700 text-sm">
                            {(() => {
                              try {
                                // Check if details is already an object
                                let teamData;
                                if (typeof selectedStep.details === 'string') {
                                  // Try to parse the details as JSON if it's a string
                                  teamData = JSON.parse(selectedStep.details);
                                } else if (typeof selectedStep.details === 'object') {
                                  // If it's already an object, use it directly
                                  teamData = selectedStep.details;
                                }
                                
                                if (Array.isArray(teamData)) {
                                  // Calculate total team size
                                  const totalTeamSize = teamData.reduce((sum, member) => sum + member.count, 0);
                                  
                                  return (
                                    <div className="space-y-6">
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                          <h3 className="text-lg font-semibold text-blue-800">Recommended Team Composition</h3>
                                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                            Total: {totalTeamSize} {totalTeamSize === 1 ? 'member' : 'members'}
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                          {teamData.map((member, index) => (
                                            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                                <div className="flex-shrink-0">
                                                  <div className="bg-blue-100 text-blue-800 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                                                    {member.count}
                                                  </div>
                                                </div>
                                                <div className="flex-grow">
                                                  <h4 className="font-medium text-gray-800 text-base">{member.role}</h4>
                                                  <p className="text-gray-600 text-sm mt-1">{member.justification}</p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // If parsing fails, display as regular text
                                console.error('Error parsing team composition data:', e);
                              }
                              // Default display if parsing fails or data is not an array
                              return <p className="whitespace-pre-line">{selectedStep.details}</p>;
                            })()}
                          </div>
                        ) : selectedStep.id === 'development_plan' ? (
                          <div className="mt-4">
                            {(() => {
                              try {
                                // Check if details is already an object
                                let planData;
                                if (typeof selectedStep.details === 'string') {
                                  // Try to parse the details as JSON if it's a string
                                  planData = JSON.parse(selectedStep.details);
                                } else if (typeof selectedStep.details === 'object') {
                                  // If it's already an object, use it directly
                                  planData = selectedStep.details;
                                }
                                
                                if (planData && typeof planData === 'object') {
                                  return <DevelopmentPlanDisplay plan={planData} />;
                                }
                              } catch (e) {
                                // If parsing fails, display as regular text
                                console.error('Error parsing development plan data:', e);
                              }
                              // Default display if parsing fails or data is not an object
                              return <p className="text-gray-700 text-sm whitespace-pre-line">{selectedStep.details}</p>;
                            })()}
                          </div>
                        ) : selectedStep.id === 'final_report' ? (
                          <div className="mt-4">
                            <div 
                              className="text-gray-700 text-sm prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: convertMarkupToHtml(selectedStep.details || '') }}
                            />
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm whitespace-pre-line">{selectedStep.details}</p>
                        )}
                      </div>
                    </div>
                  ) : selectedStep.status === 'in_progress' ? (
                    <div className="bg-blue-50 rounded-md p-4 border border-blue-200 text-center">
                      <div className="flex justify-center mb-3">
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <h3 className="text-base font-medium text-blue-800 mb-3">Processing in Progress</h3>
                      
                      <div className="bg-white rounded-md p-3 border border-blue-200 text-left">
                        <h4 className="font-medium text-blue-700 text-sm mb-1">Current Activity:</h4>
                        {selectedStep.id === 'project_info' && (
                          <p className="text-gray-700 text-sm">Our AI is analyzing your uploaded document, validating its format, and preparing it for further processing. This may take a few moments depending on the document size.</p>
                        )}
                        {selectedStep.id === 'scope_analysis' && (
                          <p className="text-gray-700 text-sm">Our AI is analyzing the scope of work, identifying key deliverables, and evaluating the complexity of requirements to determine the overall project scope.</p>
                        )}
                        {selectedStep.id === 'effort_estimation' && (
                          <p className="text-gray-700 text-sm">Our AI is calculating the effort required for each component of the project, providing detailed estimates in person-hours or days based on the analyzed requirements.</p>
                        )}
                        {selectedStep.id === 'team_composition' && (
                          <p className="text-gray-700 text-sm">Our AI is determining the optimal team composition based on the project requirements, including roles, skills, and experience levels needed for successful implementation.</p>
                        )}
                        {selectedStep.id === 'development_plan' && (
                          <p className="text-gray-700 text-sm">Our AI is generating a comprehensive development plan, outlining phases, milestones, and timelines for the project implementation.</p>
                        )}
                        {selectedStep.id === 'final_report' && (
                          <p className="text-gray-700 text-sm">Our AI is compiling all the analysis results into a comprehensive final report, including cost estimates, timeline projections, and recommendations for project execution.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-md p-4 border border-gray-200 text-center">
                      <svg className="h-8 w-8 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-base font-medium text-gray-700 mb-1">Waiting to Start</h3>
                      <p className="text-gray-500 text-sm">This step is pending and will begin after previous steps are completed.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-1">No Step Selected</h3>
                  <p className="text-gray-500 text-sm">Select a step from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Export buttons at the bottom when Final Report is complete */}
        {isFinalReportComplete() && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-5 border border-blue-100">
            <h2 className="text-lg font-bold mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Your Report
            </h2>
            <p className="text-gray-600 text-sm mb-4">Your analysis is complete! Choose how you'd like to export your report.</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to PDF
              </button>
              
              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send via Email
                </button>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
                  <input
                    type="email"
                    value={emailFormData.email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={emailFormData.isSubmitting}
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium whitespace-nowrap"
                    disabled={emailFormData.isSubmitting}
                  >
                    {emailFormData.isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                    disabled={emailFormData.isSubmitting}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        
        <footer className="mt-12 text-center text-gray-500 text-xs">
          <p>© 2023 AI RFP Analysis Tool. All rights reserved.</p>
      </footer>
    </div>
    </main>
  );
}
