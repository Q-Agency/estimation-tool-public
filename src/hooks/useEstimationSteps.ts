import { useState, useRef, useCallback } from 'react';
import { Step, StepEvent } from '@/types';
import { INITIAL_STEPS } from '@/constants/steps';

export const useEstimationSteps = () => {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const stepsRef = useRef<Step[]>(INITIAL_STEPS);

  const resetSteps = useCallback(() => {
    const resetSteps = JSON.parse(JSON.stringify(INITIAL_STEPS));
    setSteps(resetSteps);
    stepsRef.current = resetSteps;
    setActiveStepIndex(0);
    setSelectedStep(null);
    setIsDetailsOpen(false);
    setIsProcessing(false);
  }, []);

  const updateStepFromSSEData = useCallback((data: StepEvent) => {
    // Debug logging for troubleshooting
    console.log('🔍 SSE Event received:', {
      step: data.step,
      title: data.title,
      hasOutput: !!data.output,
      outputLength: data.output?.length || 0,
      sessionId: data.sessionId
    });
    
    // Handle general_error step specifically
    if (data.step === 'general_error') {
      console.error('🚨 General error received from SSE:', data);
      // Stop processing immediately
      setIsProcessing(false);
      // The toast and connection cleanup will be handled by the parent component
      return;
    }
    
    // Helper function to get platform icon based on enum
    const getPlatformIcon = (enumValue: string): string => {
      switch (enumValue) {
        case 'WEB':
          return '🌐';
        case 'MOBILE':
          return '📱';
        case 'BACKEND_API':
          return '⚙️';
        case 'ADMIN_PORTAL':
          return '👤';
        case 'DESKTOP':
          return '🖥️';
        case 'KIOSK':
          return '🏪';
        default:
          return '🔧'; // Default icon for unknown platforms
      }
    };

    // First check if this is an error event (other than general_error)
    if (data.step && data.step.includes('error')) {
      console.error('SSE Error Event:', data.error);
      
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
        
        if (currentStepIndex !== -1 && data.error) {
          // Mark current step as error
          newSteps[currentStepIndex].status = 'error';
          
          // Create error details
          const errorDetails = `❌ **Step Failed: ${data.title}**\n\n**Error:** ${data.error.message}\n\n**Details:** ${data.error.details || 'No additional details available'}\n\n${data.error.retryable ? '🔄 **This step can be retried.**' : '⚠️ **This step cannot be retried.**'}\n\n${data.error.suggestedAction ? `**Suggested Action:** ${data.error.suggestedAction}` : ''}`;
          
          newSteps[currentStepIndex].details = errorDetails;
          
          // Stop processing
          setIsProcessing(false);
        }
        
        return newSteps;
      });
      
      return; // Don't process further
    }
    
    // Helper function for regular step processing
    const processRegularStep = (stepData: StepEvent) => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        const currentStepIndex = newSteps.findIndex(step => step.id === stepData.step);
        
        if (currentStepIndex !== -1) {
          // Mark current step as done
          newSteps[currentStepIndex].status = 'done';
          
          // Update step details with the output
          if (stepData.output) {
            newSteps[currentStepIndex].details = stepData.output;
          }
          
          // Set next step to in_progress if it exists
          if (currentStepIndex + 1 < newSteps.length) {
            newSteps[currentStepIndex + 1].status = 'in_progress';
            
            // Don't automatically switch to the next step - let user stay on current step
            // setSelectedStep(newSteps[currentStepIndex + 1]);
            // setIsDetailsOpen(true);
          } else {
            // All steps are complete
            setIsProcessing(false);
          }
        }
        
        return newSteps;
      });
    };
    
    // If this is the document preparation step, parse the structured data
    if (data.step === 'document_preparation') {
      // Update step status based on the received event
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
        
        if (currentStepIndex !== -1) {
          // Mark current step as done
          newSteps[currentStepIndex].status = 'done';
          
          // Create simplified details string for display
          const formattedDetails = `✅ **Document Successfully Processed**\n\nYour RFP document has been prepared and is ready for analysis. The system has:\n- Extracted and structured the document content\n- Identified key project information\n- Prepared the data for comprehensive analysis\n\n**Next Step:** Project information extraction will begin automatically.`;
          
          newSteps[currentStepIndex].details = formattedDetails;
          
          // Set next step to in_progress if it exists
          if (currentStepIndex + 1 < newSteps.length) {
            newSteps[currentStepIndex + 1].status = 'in_progress';
            
            // Don't automatically switch to the next step - let user stay on current step
            // setSelectedStep(newSteps[currentStepIndex + 1]);
            // setIsDetailsOpen(true);
          } else {
            // All steps are complete
            setIsProcessing(false);
          }
        }
        
        return newSteps;
      });
    }
    // If this is the platforms step, parse the platform data
    else if (data.step === 'platforms') {
      console.log('🎯 PLATFORMS STEP DETECTED!');
      
      try {
        let platformsDataToProcess = null;
        
        // Try to get platforms data from output field first (standard structure)
        if (data.output) {
          console.log('📤 Processing from output field');
          const parsedData = JSON.parse(data.output);
          platformsDataToProcess = Array.isArray(parsedData) ? parsedData[0] : parsedData;
          
          // Handle nested output field if present (double-encoded JSON)
          if (platformsDataToProcess && typeof platformsDataToProcess.output === 'string') {
            console.log('📤 Processing nested output field');
            const nestedParsed = JSON.parse(platformsDataToProcess.output);
            platformsDataToProcess = Array.isArray(nestedParsed) ? nestedParsed[0] : nestedParsed;
          }
        }
        // If there's a direct platforms property (alternative structure)
        else if ((data as any).platforms) {
          console.log('📤 Processing from direct platforms field');
          let parsedData = JSON.parse((data as any).platforms);
          
          // Handle nested output field if present (double-encoded JSON)
          if (parsedData && typeof parsedData.output === 'string') {
            console.log('📤 Processing nested output field from platforms');
            const nestedParsed = JSON.parse(parsedData.output);
            parsedData = Array.isArray(nestedParsed) ? nestedParsed[0] : nestedParsed;
          } else {
            // If not nested, handle array structure
            parsedData = Array.isArray(parsedData) ? parsedData[0] : parsedData;
          }
          
          platformsDataToProcess = parsedData;
        }
        
        if (platformsDataToProcess && platformsDataToProcess.platforms) {
          console.log('✅ Platforms data found:', platformsDataToProcess);
          
          // Handle traceability data - it might be nested in traceability object or at root level as highlight_data
          let traceabilityData = null;
          
          if (platformsDataToProcess.traceability) {
            // Standard structure: traceability object exists
            traceabilityData = platformsDataToProcess.traceability;
          } else if ((platformsDataToProcess as any).highlight_data) {
            // Alternative structure: highlight_data at root level
            const highlightData = (platformsDataToProcess as any).highlight_data;
            if (Array.isArray(highlightData) && highlightData.length > 0) {
              // Extract cited_references from highlight_data
              const citedReferences = Array.from(new Set(highlightData.map((h: any) => h.ref_number).filter((n: any) => n != null))).sort((a: any, b: any) => a - b);
              const pagesAffected = Array.from(new Set(highlightData.map((h: any) => h.page).filter((p: any) => p != null))).sort((a: any, b: any) => a - b);
              
              // Construct traceability object
              traceabilityData = {
                cited_references: citedReferences,
                highlight_data: highlightData,
                total_highlights: highlightData.length,
                pages_affected: pagesAffected
              };
              
              // Add traceability to platformsDataToProcess for consistency
              platformsDataToProcess.traceability = traceabilityData;
              
              console.log('📊 Traceability data constructed from highlight_data:', {
                cited_references: traceabilityData.cited_references,
                total_highlights: traceabilityData.total_highlights,
                pages_affected: traceabilityData.pages_affected,
                highlight_count: traceabilityData.highlight_data.length
              });
            }
          }
          
          // Extract and log traceability data if present
          if (traceabilityData) {
            console.log('📊 Traceability data found:', {
              cited_references: traceabilityData.cited_references,
              total_highlights: traceabilityData.total_highlights,
              pages_affected: traceabilityData.pages_affected,
              highlight_count: traceabilityData.highlight_data?.length || 0
            });
            
            // Log detailed highlight data with text and text_preview
            if (traceabilityData.highlight_data && traceabilityData.highlight_data.length > 0) {
              console.log('📝 Highlight data details:');
              traceabilityData.highlight_data.forEach((highlight: any, index: number) => {
                console.log(`  Highlight ${index + 1}:`, {
                  ref_number: highlight.ref_number,
                  chunk_id: highlight.chunk_id,
                  page: highlight.page,
                  text_preview: highlight.text_preview || 'N/A',
                  text_length: highlight.text ? highlight.text.length : 0,
                  has_full_text: !!highlight.text
                });
              });
            }
          } else {
            console.log('ℹ️ No traceability data found in platforms response (backward compatible)');
          }
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Store the structured data (traceability will be included if present)
              newSteps[currentStepIndex].platforms_data = platformsDataToProcess;
              
              // Create formatted details for display
              const platformsList = platformsDataToProcess.platforms.map((platform: any) => `${getPlatformIcon(platform.enum)} **${platform.text}** (${platform.enum})`).join('\n- ');
              const formattedDetails = `✅ **Platform Analysis Complete**\n\n**Identified Platforms:**\n- ${platformsList}\n\n**Rationale:**\n${platformsDataToProcess.rationale}\n\n**Next Step:** Scope analysis will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
              
              // Set next step to in_progress if it exists
              if (currentStepIndex + 1 < newSteps.length) {
                newSteps[currentStepIndex + 1].status = 'in_progress';
                
                // Don't automatically switch to the next step - let user stay on current step
                // setSelectedStep(newSteps[currentStepIndex + 1]);
                // setIsDetailsOpen(true);
              } else {
                // All steps are complete
                setIsProcessing(false);
              }
            }
            
            return newSteps;
          });
        } else {
          // No platform data found, log and use regular processing
          console.log('❌ No valid platforms data found in event');
          processRegularStep(data);
        }
            } catch (e) {
        console.error('❌ Error parsing platforms data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the requirements step, parse the requirements data
    else if (data.step === 'requirements') {
      console.log('📋 REQUIREMENTS STEP DETECTED!');
      
      try {
        let requirementsDataToProcess = null;
        
        // Try to get requirements data from output field
        if (data.output) {
          console.log('📤 Processing requirements from output field');
          const parsedData = JSON.parse(data.output);
          requirementsDataToProcess = Array.isArray(parsedData) ? parsedData[0] : parsedData;
        }
        
        if (requirementsDataToProcess && 
            requirementsDataToProcess.functional && 
            requirementsDataToProcess.non_functional) {
          console.log('✅ Requirements data found:', requirementsDataToProcess);
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Store the structured data
              newSteps[currentStepIndex].requirements_data = requirementsDataToProcess;
              
              // Create formatted details for display
              const functionalList = requirementsDataToProcess.functional
                .map((req: string, index: number) => `${index + 1}. ${req}`)
                .join('\n');
              
              const nonFunctionalList = requirementsDataToProcess.non_functional
                .map((req: string, index: number) => `${index + 1}. ${req}`)
                .join('\n');
              
              const formattedDetails = `✅ **Requirements Analysis Complete**\n\n` +
                `**📋 Functional Requirements** (${requirementsDataToProcess.functional.length} items):\n${functionalList}\n\n` +
                `**⚙️ Non-Functional Requirements** (${requirementsDataToProcess.non_functional.length} items):\n${nonFunctionalList}\n\n` +
                `**Next Step:** Team composition analysis will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
              
              // Set next step to in_progress if it exists
              if (currentStepIndex + 1 < newSteps.length) {
                newSteps[currentStepIndex + 1].status = 'in_progress';
                
                // Don't automatically switch to the next step - let user stay on current step
                // setSelectedStep(newSteps[currentStepIndex + 1]);
                // setIsDetailsOpen(true);
              } else {
                // All steps are complete
                setIsProcessing(false);
              }
            }
            
            return newSteps;
          });
        } else {
          // No valid requirements data found
          console.log('❌ No valid requirements data found in event');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error parsing requirements data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the techstack step, parse the tech stack data
    else if (data.step === 'techstack') {
      console.log('🔧 TECHSTACK STEP DETECTED!');
      
      try {
        let techStackDataToProcess = null;
        
        // Try to get tech stack data from output field
        if (data.output) {
          console.log('📤 Processing techstack from output field');
          const parsedData = JSON.parse(data.output);
          techStackDataToProcess = parsedData.tech_stack || parsedData;
        }
        
        if (techStackDataToProcess && techStackDataToProcess.stack_model) {
          console.log('✅ Tech stack data found:', techStackDataToProcess);
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Store the structured data
              newSteps[currentStepIndex].tech_stack = techStackDataToProcess;
              
              // Create formatted details for display
              const stackSections = [
                `**🏗️ Stack Model:** ${techStackDataToProcess.stack_model}`,
                `**💾 Database:** ${techStackDataToProcess.database}`,
                `**☁️ Deployment:** ${techStackDataToProcess.deployment}`,
                `**🤖 AI/ML Required:** ${techStackDataToProcess.ai_needed ? 'Yes' : 'No'}`
              ];
              
              if (techStackDataToProcess.backend_stack?.length > 0) {
                stackSections.push(`**⚙️ Backend Stack:** ${techStackDataToProcess.backend_stack.join(', ')}`);
              }
              
              if (techStackDataToProcess.web_stack?.length > 0) {
                stackSections.push(`**🌐 Web Stack:** ${techStackDataToProcess.web_stack.join(', ')}`);
              }
              
              if (techStackDataToProcess.mobile_stack?.length > 0) {
                stackSections.push(`**📱 Mobile Stack:** ${techStackDataToProcess.mobile_stack.join(', ')}`);
              }
              
              if (techStackDataToProcess.design?.length > 0) {
                stackSections.push(`**🎨 Design System:** ${techStackDataToProcess.design.join(', ')}`);
              }
              
              if (techStackDataToProcess.integrations?.length > 0) {
                stackSections.push(`**🔗 Integrations:** ${techStackDataToProcess.integrations.join(', ')}`);
              }
              
              const formattedDetails = `✅ **Technology Stack Analysis Complete**\n\n` +
                `${stackSections.join('\n\n')}\n\n` +
                `**📝 Rationale:**\n${techStackDataToProcess.rationale}\n\n` +
                `**Next Step:** Effort estimation will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
              
              // Set next step to in_progress if it exists
              if (currentStepIndex + 1 < newSteps.length) {
                newSteps[currentStepIndex + 1].status = 'in_progress';
                
                // Don't automatically switch to the next step - let user stay on current step
                // setSelectedStep(newSteps[currentStepIndex + 1]);
                // setIsDetailsOpen(true);
              } else {
                // All steps are complete
                setIsProcessing(false);
              }
            }
            
            return newSteps;
          });
        } else {
          // No valid tech stack data found
          console.log('❌ No valid tech stack data found in event');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error parsing tech stack data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the team composition step, parse the team composition data
    else if (data.step === 'team_composition') {
      console.log('👥 TEAM COMPOSITION STEP DETECTED!');
      
      try {
        let teamCompositionDataToProcess = null;
        
        // Try to get team composition data from output field
        if (data.output) {
          console.log('📤 Processing team composition from output field');
          const parsedData = JSON.parse(data.output);
          teamCompositionDataToProcess = parsedData.team_plan || parsedData;
        }
        
        if (teamCompositionDataToProcess && teamCompositionDataToProcess.roles) {
          console.log('✅ Team composition data found:', teamCompositionDataToProcess);
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Store the structured data
              newSteps[currentStepIndex].team_composition_data = teamCompositionDataToProcess;
              
              // Calculate total FTE
              const totalFTE = teamCompositionDataToProcess.roles.reduce((sum: number, role: any) => sum + role.fte, 0);
              
              // Create formatted details for display
              const rolesDetails = teamCompositionDataToProcess.roles.map((role: any, index: number) => {
                const ftePercentage = Math.round(role.fte * 100);
                return `**${index + 1}. ${role.role}** (${role.fte} FTE / ${ftePercentage}%)\n${role.rationale}`;
              }).join('\n\n');
              
              const formattedDetails = `✅ **Team Composition Analysis Complete**\n\n` +
                `**👥 Team Overview:**\n` +
                `- **Total Team Size:** ${teamCompositionDataToProcess.roles.length} roles\n` +
                `- **Total FTE:** ${totalFTE.toFixed(1)} full-time equivalents\n\n` +
                `**🎯 Team Roles & Allocation:**\n\n${rolesDetails}\n\n` +
                `**📝 Overall Team Rationale:**\n${teamCompositionDataToProcess.rationale}\n\n` +
                `**Next Step:** Effort estimation will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
              
              // Set next step to in_progress if it exists
              if (currentStepIndex + 1 < newSteps.length) {
                newSteps[currentStepIndex + 1].status = 'in_progress';
                
                // Don't automatically switch to the next step - let user stay on current step
                // setSelectedStep(newSteps[currentStepIndex + 1]);
                // setIsDetailsOpen(true);
              } else {
                // All steps are complete
                setIsProcessing(false);
              }
            }
            
            return newSteps;
          });
    } else {
          // No valid team composition data found
          console.log('❌ No valid team composition data found in event');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error parsing team composition data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the effort estimation step, parse the effort estimation data
    else if (data.step === 'effort_estimation') {
      console.log('📊 EFFORT ESTIMATION STEP DETECTED!');
      
      try {
        let effortEstimationDataToProcess = null;
        
        // Try to get effort estimation data from output field
        if (data.output) {
          console.log('📤 Processing effort estimation from output field');
          const parsedData = JSON.parse(data.output);
          effortEstimationDataToProcess = parsedData;
        }
        
        if (effortEstimationDataToProcess && 
            typeof effortEstimationDataToProcess.min_sprints === 'number' && 
            typeof effortEstimationDataToProcess.max_sprints === 'number') {
          console.log('✅ Effort estimation data found:', effortEstimationDataToProcess);
          
      // Update step status based on the received event
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
        
        if (currentStepIndex !== -1) {
          // Mark current step as done
          newSteps[currentStepIndex].status = 'done';
          
              // Store the structured data
              newSteps[currentStepIndex].effort_estimation_data = effortEstimationDataToProcess;
              
              // Calculate sprint details
              const minWeeks = effortEstimationDataToProcess.min_sprints * 2; // assuming 2-week sprints
              const maxWeeks = effortEstimationDataToProcess.max_sprints * 2;
              const avgSprints = Math.round((effortEstimationDataToProcess.min_sprints + effortEstimationDataToProcess.max_sprints) / 2);
              const avgWeeks = avgSprints * 2;
              
              // Format timeline estimates
              const formattedDetails = `✅ **Effort Estimation Analysis Complete**\n\n` +
                `**📊 Sprint Estimates:**\n` +
                `- **Minimum:** ${effortEstimationDataToProcess.min_sprints} sprints (${minWeeks} weeks)\n` +
                `- **Maximum:** ${effortEstimationDataToProcess.max_sprints} sprints (${maxWeeks} weeks)\n` +
                `- **Average:** ${avgSprints} sprints (${avgWeeks} weeks)\n\n` +
                `**⏱️ Timeline Range:**\n` +
                `- **Best Case:** ${Math.round(minWeeks / 4.33)} months\n` +
                `- **Worst Case:** ${Math.round(maxWeeks / 4.33)} months\n` +
                `- **Expected:** ${Math.round(avgWeeks / 4.33)} months\n\n` +
                `**📝 Estimation Rationale:**\n${effortEstimationDataToProcess.rationale}\n\n` +
                `**Next Step:** Development plan creation will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
              
              // Set next step to in_progress if it exists
              if (currentStepIndex + 1 < newSteps.length) {
                newSteps[currentStepIndex + 1].status = 'in_progress';
                
                // Don't automatically switch to the next step - let user stay on current step
                // setSelectedStep(newSteps[currentStepIndex + 1]);
                // setIsDetailsOpen(true);
              } else {
                // All steps are complete
                setIsProcessing(false);
              }
            }
            
            return newSteps;
          });
        } else {
          // No valid effort estimation data found
          console.log('❌ No valid effort estimation data found in event');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error parsing effort estimation data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the development plan step, parse the development plan data
    else if (data.step === 'development_plan') {
      console.log('🗓️ DEVELOPMENT PLAN STEP DETECTED!');
      
      try {
        let developmentPlanDataToProcess = null;
        
        // Try to get development plan data from output field
          if (data.output) {
          console.log('📤 Processing development plan from output field');
          const parsedData = JSON.parse(data.output);
          developmentPlanDataToProcess = parsedData;
        }
        
        if (developmentPlanDataToProcess && 
            developmentPlanDataToProcess.phases && 
            developmentPlanDataToProcess.cross_cutting) {
          console.log('✅ Development plan data found:', developmentPlanDataToProcess);
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Store the structured data
              newSteps[currentStepIndex].development_plan_data = developmentPlanDataToProcess;
              
              // Create formatted details for display
              const phasesDetails = developmentPlanDataToProcess.phases.map((phase: any, index: number) => {
                const sprintRange = `Sprints ${phase.sprints.start}-${phase.sprints.end}`;
                const duration = phase.sprints.end - phase.sprints.start + 1;
                const itemsList = phase.items.map((item: string, i: number) => `  ${i + 1}. ${item}`).join('\n');
                return `**${index + 1}. ${phase.name}** (${sprintRange} - ${duration} sprint${duration > 1 ? 's' : ''})\n${itemsList}`;
              }).join('\n\n');
              
              // Format cross-cutting concerns
              const crossCuttingDetails = Object.entries(developmentPlanDataToProcess.cross_cutting).map(([category, items]: [string, any]) => {
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                const itemsList = items.map((item: string, i: number) => `  ${i + 1}. ${item}`).join('\n');
                return `**${categoryName}:**\n${itemsList}`;
              }).join('\n\n');
              
              const totalPhases = developmentPlanDataToProcess.phases.length;
              const totalSprints = Math.max(...developmentPlanDataToProcess.phases.map((p: any) => p.sprints.end));
              const crossCuttingCategories = Object.keys(developmentPlanDataToProcess.cross_cutting).length;
              
              const formattedDetails = `✅ **Development Plan Complete**\n\n` +
                `**📊 Plan Overview:**\n` +
                `- **Total Phases:** ${totalPhases}\n` +
                `- **Total Sprints:** ${totalSprints}\n` +
                `- **Cross-cutting Areas:** ${crossCuttingCategories}\n\n` +
                `**🗓️ Development Phases:**\n\n${phasesDetails}\n\n` +
                `**⚙️ Cross-cutting Concerns:**\n\n${crossCuttingDetails}\n\n` +
                `**Next Step:** Final report generation will begin automatically.`;
              
              newSteps[currentStepIndex].details = formattedDetails;
          
          // Set next step to in_progress if it exists
          if (currentStepIndex + 1 < newSteps.length) {
            newSteps[currentStepIndex + 1].status = 'in_progress';
            
            // Don't automatically switch to the next step - let user stay on current step
            // setSelectedStep(newSteps[currentStepIndex + 1]);
            // setIsDetailsOpen(true);
          } else {
            // All steps are complete
            setIsProcessing(false);
          }
        }
        
        return newSteps;
      });
        } else {
          // No valid development plan data found
          console.log('❌ No valid development plan data found in event');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error parsing development plan data:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // If this is the final report step, process the final report data
    else if (data.step === 'final_report') {
      console.log('📋 FINAL REPORT STEP DETECTED!');
      
      try {
        // For final report, the output is typically markdown text, not JSON
        if (data.output) {
          console.log('📤 Processing final report from output field');
          
          // Update step status based on the received event
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            const currentStepIndex = newSteps.findIndex(step => step.id === data.step);
            
            if (currentStepIndex !== -1) {
              // Mark current step as done
              newSteps[currentStepIndex].status = 'done';
              
              // Use the output directly as it's already formatted, no need for additional prefix
              // Remove any existing "Final Report Generated" prefix if it exists
              let cleanedOutput = data.output;
              if (cleanedOutput.startsWith('✅ **Final Report Generated**')) {
                cleanedOutput = cleanedOutput.replace(/^✅ \*\*Final Report Generated\*\*\n\n/, '');
              }
              
              // Just use the cleaned content directly - the actual report content
              newSteps[currentStepIndex].details = cleanedOutput;
              
              console.log('✅ Final report processing complete');
            }
            
            return newSteps;
          });
          
          // Final step completed - set processing to false
          setIsProcessing(false);
          console.log('🏁 All estimation steps completed successfully!');
          
        } else {
          // No output data, use regular processing
          console.log('❌ No output data found for final report');
          processRegularStep(data);
        }
      } catch (e) {
        console.error('❌ Error processing final report:', e);
        console.log('📄 Raw event data:', data);
        // Fallback to regular processing
        processRegularStep(data);
      }
    }
    // Regular step processing for all other steps
    else {
      console.log('Using regular step processing for:', data.step);
      console.log('This step did not match any special cases');
      processRegularStep(data);
    }
  }, []);

  const startFilePreparation = useCallback(() => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];
      const docPrepIndex = newSteps.findIndex(step => step.id === 'document_preparation');
      
      if (docPrepIndex !== -1) {
        newSteps[docPrepIndex].status = 'in_progress';
        newSteps[docPrepIndex].details = 'Upload successful! Processing and structuring your document for analysis.';
        setActiveStepIndex(docPrepIndex);
        
        // Select the document preparation step
        setSelectedStep(newSteps[docPrepIndex]);
        setIsDetailsOpen(true);
      }
      
      return newSteps;
    });
    
    // Set processing state to true
    setIsProcessing(true);
  }, []);

  const startProcessing = useCallback(() => {
    // This function is now just used to set processing state
    // The actual step progression is handled by SSE events
    setIsProcessing(true);
  }, []);

  const handleStepClick = useCallback((step: Step) => {
    setSelectedStep(step);
    setIsDetailsOpen(true);
  }, []);

  const toggleDetails = useCallback(() => {
    setIsDetailsOpen(!isDetailsOpen);
  }, [isDetailsOpen]);

  const isFinalReportComplete = useCallback(() => {
    const finalReportStep = steps.find(step => step.id === 'final_report');
    return finalReportStep?.status === 'done';
  }, [steps]);

  const retryFailedStep = useCallback((stepId: string) => {
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];
      const stepIndex = newSteps.findIndex(step => step.id === stepId);
      
      if (stepIndex !== -1) {
        // Reset the failed step to in_progress
        newSteps[stepIndex].status = 'in_progress';
        newSteps[stepIndex].details = '🔄 Retrying step... Please wait.';
        
        // Set processing state back to true
        setIsProcessing(true);
      }
      
      return newSteps;
    });
  }, []);

  return {
    steps,
    activeStepIndex,
    selectedStep,
    isDetailsOpen,
    isProcessing,
    resetSteps,
    updateStepFromSSEData,
    startFilePreparation,
    startProcessing,
    handleStepClick,
    toggleDetails,
    isFinalReportComplete,
    retryFailedStep,
    setIsProcessing
  };
}; 