'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { config, validateConfig } from '@/lib/config';
import { convertMarkupToHtml } from '@/utils/markupConverter';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { useSSE } from '@/hooks/useSSE';
import { useEstimationSteps } from '@/hooks/useEstimationSteps';
import { EmailFormData, UploadResponse } from '@/types';
import { sendToEmail } from '@/services/api';

export default function Home() {
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFileValidated, setIsFileValidated] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [uploadResponseData, setUploadResponseData] = useState<UploadResponse | null>(null);
  
  // UI state
  const [isHovered, setIsHovered] = useState(false);
  const [emailFormData, setEmailFormData] = useState<EmailFormData>({ email: '', isSubmitting: false });
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  } | null>(null);
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [modalEmailFormData, setModalEmailFormData] = useState({
    email: '',
    isSubmitting: false
  });

  // Export state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  
  // Filtering and sorting state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scopeItemsRef = useRef<any[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);

  // Custom hooks
  const {
    steps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeStepIndex,
    selectedStep,
    isDetailsOpen,
    isProcessing,
    resetSteps,
    updateStepFromSSEData,
    startFilePreparation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startProcessing,
    handleStepClick,
    toggleDetails,
    isFinalReportComplete,
    setIsProcessing
  } = useEstimationSteps();

  // Handle general error from SSE
  const handleGeneralError = useCallback((errorData: { title?: string; output?: string }) => {
    // Show modern custom error toast
    toast.custom((t) => (
      <div className={`relative overflow-hidden bg-gradient-to-br from-white via-red-50/30 to-red-100/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-200/50 p-6 max-w-lg mx-auto transform transition-all duration-300 ${t.visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'}`}>
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/40 to-transparent rounded-full blur-2xl -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-red-50/60 to-transparent rounded-full blur-xl translate-y-4 -translate-x-4"></div>
        
        <div className="relative flex items-start space-x-4">
          {/* Modern error icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                {errorData.title || 'Something went wrong'}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {errorData.output || 'We encountered an issue processing your file. Please try uploading again and if the problem persists, contact support.'}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  // Reset all state after toast is dismissed
                  setSessionId(null);
                  setIsProcessing(false);
                  setAnalysisStarted(false);
                  setIsFileValidated(false);
                  setUploadedFileName(null);
                  setUploadedFileSize(null);
                  setUploadResponseData(null);
                  
                  // Reset steps
                  resetSteps();
                  
                  // Clear file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="group inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                <span>Got it</span>
                <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity, // Don't auto-dismiss
      position: 'top-center',
    });
  }, [resetSteps, setIsProcessing]);

  // SSE connection
  const { connectionState, lastHeartbeat, closeConnection } = useSSE({
    sessionId,
    onStepUpdate: updateStepFromSSEData,
    onError: () => setIsProcessing(false),
    onConnected: () => console.log('SSE connection established and confirmed by server'),
    onGeneralError: handleGeneralError
  });

  // Validate configuration on mount
  useEffect(() => {
    validateConfig();
  }, []);

  // Show completion modal when analysis is complete
  useEffect(() => {
    const isComplete = isFinalReportComplete();
    if (isComplete && !showCompletionModal && !modalDismissed) {
      setShowCompletionModal(true);
    }
  }, [isFinalReportComplete, showCompletionModal, modalDismissed]);

  // Auto-disconnect SSE when final report is complete
  useEffect(() => {
    const isComplete = isFinalReportComplete();
    if (isComplete && connectionState === 'connected') {
      console.log('🏁 Final report complete, closing SSE connection');
      closeConnection();
    }
  }, [isFinalReportComplete, connectionState, closeConnection]);

  // Scroll to active step when it changes - removed since sidebar was removed

  // Handle page refresh/navigation confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation if there's active progress that would be lost
      if (isUploading || isFileValidated || analysisStarted) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? You will lose your current progress and need to start over.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading, isFileValidated, analysisStarted]);

  // Utility function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // File validation
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type (both MIME type and extension)
    const isPdfMimeType = file.type === 'application/pdf';
    const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    
    if (!isPdfMimeType || !isPdfExtension) {
      return {
        isValid: false,
        error: 'Please select a PDF file. Other file formats are not supported.'
      };
    }

    // Check file size (20MB limit)
    const maxSize = 5 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      const fileSize = formatFileSize(file.size);
      return {
        isValid: false,
        error: `File is too large (${fileSize}). Maximum file size is 5MB.`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'The selected file is empty. Please select a valid PDF file.'
      };
    }

    // Check file name for problematic characters
    const problematicChars = /[<>:"/\\|?*]/;
    if (problematicChars.test(file.name)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters. Please rename your file and try again.'
      };
    }

    return { isValid: true };
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.isValid) {
        setUploadedFileName(file.name);
        setUploadedFileSize(file.size);
        uploadFile(file);
      } else {
        toast.error(validation.error!);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const uploadFile = async (file: File) => {
    // File validation is now done before calling this function

    // Generate a new session ID for this upload
    const newSessionId = Math.random().toString(36).substring(2, 15);
    setSessionId(newSessionId);
    currentSessionIdRef.current = newSessionId;

    // Reset steps to initial state
    resetSteps();

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

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Parse the response to check if upload was actually successful
            const responseText = xhr.responseText;
            console.log('Raw response text:', responseText);
            let response: any = {};
            
            try {
              response = JSON.parse(responseText);
              console.log('Parsed response:', response);
              console.log('Response type:', typeof response);
              console.log('Is array:', Array.isArray(response));
              if (Array.isArray(response)) {
                console.log('Array length:', response.length);
                if (response.length > 0) {
                  console.log('First element:', response[0]);
                  console.log('First element has md5:', !!response[0]?.md5);
                }
              }
            } catch (e) {
              console.error('JSON parsing error:', e);
              // If response is not JSON, treat as text response
              response = { message: responseText };
            }
            
            // Check if response is the expected format (array with upload data or single object)
            let uploadData: UploadResponse | null = null;
            
            if (Array.isArray(response) && response.length > 0 && response[0].md5) {
              // Response is an array with upload data
              uploadData = response[0] as UploadResponse;
            } else if (!Array.isArray(response) && response.md5) {
              // Response is a single object with upload data
              uploadData = response as UploadResponse;
            }
            
            if (uploadData) {
              
              // Save the upload response data for later use
              setUploadResponseData(uploadData);
              
              // Update session ID from server response
              setSessionId(uploadData.sessionId);
              currentSessionIdRef.current = uploadData.sessionId;
              
              // Update file name from server response (in case it was processed/renamed)
              setUploadedFileName(uploadData.fileName);
              
              // Show success feedback
              toast.success('File uploaded and validated successfully!');
              
              // Mark file as validated but don't start analysis yet
              setIsFileValidated(true);
              
              // Reset file input
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            } else {
              // Server response doesn't match expected format
              let errorMessage = response.error || response.message || 'Upload failed - unexpected server response format';
              
              // Add more specific error information
              if (Array.isArray(response)) {
                if (response.length === 0) {
                  errorMessage += ' (Empty response array)';
                } else if (!response[0]?.md5) {
                  errorMessage += ' (Missing md5 field in array response)';
                }
              } else if (typeof response === 'object') {
                if (!response.md5) {
                  errorMessage += ' (Missing md5 field in object response)';
                } else {
                  errorMessage += ' (Object has md5 but validation failed)';
                }
              } else {
                errorMessage += ` (Expected object or array, got ${typeof response})`;
              }
              
              console.error('Upload response validation failed:', {
                response,
                isArray: Array.isArray(response),
                length: Array.isArray(response) ? response.length : 'N/A',
                firstElement: Array.isArray(response) && response.length > 0 ? response[0] : 'N/A'
              });
              
              toast.error(errorMessage);
              
              // Reset upload state to show upload section again
              setUploadedFileName(null);
              setSessionId(null);
              setUploadedFileSize(null);
              setIsFileValidated(false);
              setAnalysisStarted(false);
              setUploadResponseData(null);
            }
          } catch (error) {
            console.error('Error parsing upload response:', error);
            toast.error('Upload completed but response was invalid. Please try again.');
            
            // Reset upload state to show upload section again
            setUploadedFileName(null);
            setSessionId(null);
            setUploadedFileSize(null);
            setIsFileValidated(false);
            setAnalysisStarted(false);
            setUploadResponseData(null);
          }
        } else {
          toast.error(`Upload failed: ${xhr.statusText}`);
          
          // Reset upload state to show upload section again
          setUploadedFileName(null);
          setSessionId(null);
          setUploadedFileSize(null);
          setIsFileValidated(false);
          setAnalysisStarted(false);
          setUploadResponseData(null);
        }
        setIsUploading(false);
      });

      xhr.addEventListener('error', () => {
        toast.error('Upload failed. Please try again.');
        setIsUploading(false);
        
        // Reset upload state to show upload section again
        setUploadedFileName(null);
        setSessionId(null);
        setUploadedFileSize(null);
        setIsFileValidated(false);
        setAnalysisStarted(false);
        setUploadResponseData(null);
      });

      // Set a timeout for the upload request
      xhr.timeout = 120000; // 2 minutes timeout
      
              xhr.addEventListener('timeout', () => {
          toast.error('Upload timed out. Please check your connection and try again.');
          setIsUploading(false);
          setUploadedFileName(null);
          setSessionId(null);
          setUploadedFileSize(null);
          setIsFileValidated(false);
          setAnalysisStarted(false);
          setUploadResponseData(null);
        });

      xhr.open('POST', `${config.apiBaseUrl}/rfp-upload`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
      setIsUploading(false);
      
      // Reset upload state to show upload section again
      setUploadedFileName(null);
      setSessionId(null);
      setUploadedFileSize(null);
      setIsFileValidated(false);
      setAnalysisStarted(false);
      setUploadResponseData(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovered(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovered(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Validate multiple files
      if (files.length > 1) {
        toast.error('Please drop only one file at a time.');
        return;
      }
      
      const validation = validateFile(file);
      if (validation.isValid) {
        setUploadedFileName(file.name);
        setUploadedFileSize(file.size);
        uploadFile(file);
      } else {
        toast.error(validation.error!);
      }
    }
  };

  const resetUpload = () => {
    setUploadedFileName(null);
    setSessionId(null);
    setUploadedFileSize(null);
    setIsFileValidated(false);
    setAnalysisStarted(false);
    setUploadResponseData(null);
    resetSteps();
    setEmailFormData({ email: '', isSubmitting: false });
    setShowEmailForm(false);
    setFilteredItems([]);
    setSelectedCategory(null);
    scopeItemsRef.current = [];
    // Reset modal state
    setShowCompletionModal(false);
    setModalDismissed(false);
    setModalEmailFormData({ email: '', isSubmitting: false });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showCustomConfirmation = (config: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }) => {
    setConfirmationConfig(config);
    setShowConfirmation(true);
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    setConfirmationConfig(null);
  };

  const handleConfirmationConfirm = () => {
    if (confirmationConfig?.onConfirm) {
      confirmationConfig.onConfirm();
    }
    handleConfirmationClose();
  };

  const handleUploadDifferentRFP = () => {
    showCustomConfirmation({
      title: 'Upload Different RFP',
      message: 'Are you sure you want to upload a different RFP? This will start a completely new analysis and you will lose the current progress.',
      confirmText: 'Yes',
      cancelText: 'Cancel',
      onConfirm: resetUpload,
      isDangerous: true
    });
  };

  const handleRestartAnalysis = async () => {
    const restartAnalysisAction = async () => {
      if (!uploadResponseData || !sessionId) {
        toast.error('Upload data not available. Please upload a file first.');
        return;
      }

      // Reset analysis state but keep file data
      setAnalysisStarted(false);
      resetSteps();
      setEmailFormData({ email: '', isSubmitting: false });
      setShowEmailForm(false);
      setFilteredItems([]);
      setSelectedCategory(null);
      scopeItemsRef.current = [];
      // Reset modal state
      setShowCompletionModal(false);
      setModalDismissed(false);
      setModalEmailFormData({ email: '', isSubmitting: false });

      // Start analysis again with same session ID and file data
      try {
        setAnalysisStarted(true);
        startFilePreparation();

        const response = await fetch(`${config.apiBaseUrl}/rfp-analyse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId, // Same session ID for same file
            md5: uploadResponseData.md5,
            fileName: uploadResponseData.fileName,
            date: uploadResponseData.date,
            link: uploadResponseData.link,
            indexName: uploadResponseData.indexName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Analysis request failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Analysis restarted successfully:', result);
        
      } catch (error) {
        console.error('Error restarting analysis:', error);
        toast.error('Failed to restart analysis. Please try again.');
        
        setAnalysisStarted(false);
        setIsProcessing(false);
      }
    };

    showCustomConfirmation({
      title: 'Restart Analysis',
      message: 'Are you sure you want to restart the analysis? This will rerun the analysis on the current file from the beginning.',
      confirmText: 'Restart Analysis',
      cancelText: 'Cancel',
      onConfirm: restartAnalysisAction,
      isDangerous: false
    });
  };

  const startAnalysis = async () => {
    if (!uploadResponseData || !sessionId) {
      toast.error('Upload data not available. Please upload a file first.');
      return;
    }

    try {
      setAnalysisStarted(true);
      startFilePreparation();

      // Send POST request to start analysis with upload data
      const response = await fetch(`${config.apiBaseUrl}/rfp-analyse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId, // Use the sessionId from backend response
          md5: uploadResponseData.md5,
          fileName: uploadResponseData.fileName,
          date: uploadResponseData.date,
          link: uploadResponseData.link,
          indexName: uploadResponseData.indexName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Analysis started successfully:', result);
      
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast.error('Failed to start analysis. Please try again.');
      
      // Reset analysis state on error
      setAnalysisStarted(false);
      setIsProcessing(false);
    }
  };

  // Email handling
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailFormData({ ...emailFormData, email: e.target.value });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailFormData.email) {
      toast.error('Please enter an email address');
      return;
    }

    setEmailFormData({ ...emailFormData, isSubmitting: true });

    try {
      // Generate PDF from the final report
      const finalReportStep = steps.find(step => step.id === 'final_report');
      if (!finalReportStep?.details) {
        toast.error('No report available to send');
        setEmailFormData({ ...emailFormData, isSubmitting: false });
        return;
      }

      toast.loading('Generating and sending professional PDF...');

      // Create filename from uploaded RFP name (remove .pdf extension and add timestamp)
      const rfpFilename = uploadedFileName 
        ? uploadedFileName.replace(/\.pdf$/i, '') 
        : 'estimation-report';
      const pdfFilename = `${rfpFilename}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;

      // Generate PDF first
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalReportStep.details,
          options: {
            title: 'Project Estimation Report',
            filename: pdfFilename,
            rfpFileName: uploadedFileName || 'Unknown RFP',
            includeBackground: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Send PDF to email using the sendToEmail API
      const success = await sendToEmail(emailFormData.email, pdfBlob, 'Project Estimation Report', uploadedFileName || undefined);

      if (success) {
        toast.dismiss();
        toast.success('Professional report sent successfully!');
        setEmailFormData({ email: '', isSubmitting: false });
        setShowEmailForm(false);
      } else {
        toast.dismiss();
        toast.error('Failed to send report. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.dismiss();
      toast.error('Failed to send report. Please try again.');
    } finally {
      setEmailFormData({ ...emailFormData, isSubmitting: false });
    }
  };

  // Modal email handling
  const handleModalEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalEmailFormData({ ...modalEmailFormData, email: e.target.value });
  };

  const handleModalEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modalEmailFormData.email) {
      toast.error('Please enter an email address');
      return;
    }

    setModalEmailFormData({ ...modalEmailFormData, isSubmitting: true });

    try {
      // Generate PDF from the final report
      const finalReportStep = steps.find(step => step.id === 'final_report');
      if (!finalReportStep?.details) {
        toast.error('No report available to send');
        setModalEmailFormData({ ...modalEmailFormData, isSubmitting: false });
        return;
      }

      toast.loading('Generating and sending professional PDF...');

      // Create filename from uploaded RFP name (remove .pdf extension and add timestamp)
      const rfpFilename = uploadedFileName 
        ? uploadedFileName.replace(/\.pdf$/i, '') 
        : 'estimation-report';
      const pdfFilename = `${rfpFilename}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;

      // Generate PDF first
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalReportStep.details,
          options: {
            title: 'Project Estimation Report',
            filename: pdfFilename,
            rfpFileName: uploadedFileName || 'Unknown RFP',
            includeBackground: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Send PDF to email using the sendToEmail API
      const success = await sendToEmail(modalEmailFormData.email, pdfBlob, 'Project Estimation Report', uploadedFileName || undefined);

      if (success) {
        toast.dismiss();
        toast.success('Professional report sent successfully!');
        setModalEmailFormData({ email: '', isSubmitting: false });
        setShowCompletionModal(false);
      } else {
        toast.dismiss();
        toast.error('Failed to send report. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.dismiss();
      toast.error('Failed to send report. Please try again.');
    } finally {
      setModalEmailFormData({ ...modalEmailFormData, isSubmitting: false });
    }
  };

  const handleModalExportPDF = async () => {
    try {
      const finalReportStep = steps.find(step => step.id === 'final_report');
      if (!finalReportStep?.details) {
        toast.error('No report available to export');
        return;
      }

      toast.loading('Generating professional PDF...');

      // Create filename from uploaded RFP name (remove .pdf extension and add timestamp)
      const rfpFilename = uploadedFileName 
        ? uploadedFileName.replace(/\.pdf$/i, '') 
        : 'estimation-report';
      const pdfFilename = `${rfpFilename}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;

      // Send request to server-side PDF generation
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalReportStep.details,
          options: {
            title: 'Project Estimation Report',
            filename: pdfFilename,
            rfpFileName: uploadedFileName || 'Unknown RFP',
            includeBackground: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Professional PDF exported successfully!');
      setShowCompletionModal(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.dismiss();
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  // PDF export functionality
  const handleExportPDF = async () => {
    try {
      const finalReportStep = steps.find(step => step.id === 'final_report');
      if (!finalReportStep?.details) {
        toast.error('No report available to export');
        return;
      }

      setIsExportLoading(true);
      toast.loading('Generating professional PDF...');

      // Create filename from uploaded RFP name (remove .pdf extension and add timestamp)
      const rfpFilename = uploadedFileName 
        ? uploadedFileName.replace(/\.pdf$/i, '') 
        : 'estimation-report';
      const pdfFilename = `${rfpFilename}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;

      // Send request to server-side PDF generation
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalReportStep.details,
          options: {
            title: 'Project Estimation Report',
            filename: pdfFilename,
            rfpFileName: uploadedFileName || 'Unknown RFP',
            includeBackground: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Professional PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.dismiss();
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExportLoading(false);
    }
  };

  // Filtering and sorting functionality
  const handleFilterChange = (category: string | null) => {
    setSelectedCategory(category);
    
    if (!category) {
      setFilteredItems(scopeItemsRef.current);
    } else {
      const filtered = scopeItemsRef.current.filter(item => 
        item.category?.toLowerCase() === category.toLowerCase()
      );
      setFilteredItems(filtered);
    }
  };

  const handleSort = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    
    const sorted = [...filteredItems].sort((a, b) => {
      const aValue = a.name || a.title || '';
      const bValue = b.name || b.title || '';
      
      if (newSortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    setFilteredItems(sorted);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Connection Status Indicator */}
      {sessionId && (
        <div className="fixed top-4 left-4 z-40">
                    <ConnectionIndicator
            connectionState={connectionState}
            lastHeartbeat={lastHeartbeat}
            isAnalysisComplete={isFinalReportComplete()}
            sessionId={sessionId}
          />
        </div>
      )}
      
      {/* Custom Confirmation Modal */}
      {showConfirmation && confirmationConfig && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmationConfig.isDangerous ? 'bg-blue-50' : 'bg-blue-100'
                }`}>
                  {confirmationConfig.isDangerous ? (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {confirmationConfig.title}
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  {confirmationConfig.message}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end">
                <button
                  onClick={handleConfirmationClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  {confirmationConfig.cancelText}
                </button>
                <button
                  onClick={handleConfirmationConfirm}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    confirmationConfig.isDangerous
                      ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                      : 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                  }`}
                >
                  {confirmationConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto relative">
            {/* X Close Button */}
            <button
              onClick={() => {
                setShowCompletionModal(false);
                setModalDismissed(true);
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
      {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Analysis Complete! 🎉
                </h3>
                <p className="text-gray-600">
                  Your comprehensive project estimation is ready for export
                </p>
              </div>

              {/* Email Form */}
              <form onSubmit={handleModalEmailSubmit} className="space-y-4 mb-6">
                <div>
                  <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-email"
                    type="email"
                    value={modalEmailFormData.email}
                    onChange={handleModalEmailChange}
                    placeholder="Enter your email address"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                      modalEmailFormData.email && !isValidEmail(modalEmailFormData.email)
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                    disabled={modalEmailFormData.isSubmitting}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required to send or download your professional PDF report
                  </p>
                  {modalEmailFormData.email && !isValidEmail(modalEmailFormData.email) && (
                    <p className="mt-1 text-xs text-red-500">
                      • Please enter a valid email address
                    </p>
                  )}
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleModalEmailSubmit}
                  disabled={!modalEmailFormData.email || !isValidEmail(modalEmailFormData.email) || modalEmailFormData.isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {modalEmailFormData.isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send via Email
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleModalExportPDF}
                  disabled={!modalEmailFormData.email || !isValidEmail(modalEmailFormData.email) || modalEmailFormData.isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>

              {/* Disclaimer */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowDisclaimerModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline decoration-1 underline-offset-2 hover:decoration-2 transition-all"
                  >
                    Privacy & Email Usage Disclaimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Disclaimer Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.414-5.414l-.707.707M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Privacy & Email Usage
                </h3>
              </div>

              {/* Content */}
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">📧 Email Delivery & Communication</h4>
                  <p className="mb-3">
                    Your email address is required to deliver your personalized project estimation report. By providing your email, you consent to receive:
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Immediate Report Delivery</p>
                      <p className="text-xs text-gray-600">Your professional PDF analysis report sent directly to your inbox</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Occasional Value-Added Communications</p>
                      <p className="text-xs text-gray-600">Insights on estimation best practices, tool updates, and industry trends (max 1-2 per month)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Privacy Guarantee</h4>
                      <ul className="text-xs text-green-800 space-y-1">
                        <li>✓ Your email is never shared with third parties</li>
                        <li>✓ Easy one-click unsubscribe from all communications</li>
                        <li>✓ Documents and analysis results are not stored permanently</li>
                        <li>✓ We comply with GDPR and data protection regulations</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    Questions about our email practices? Contact us at <span className="font-medium text-blue-600">privacy@q.agency</span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDisclaimerModal(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <a 
                  href="https://q.agency/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                <img 
                  src="/Q.png" 
                  alt="Q Logo" 
                  className="h-8 w-auto mr-3"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                </a>
                <div>
                  <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900">AI Estimation Tool</h1>
                    <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full border border-green-200">FREE</span>
                  </div>
                  {uploadedFileName && (
                    <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                      {uploadedFileName}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
                            {/* Temporary Test Button - Remove in production */}
                  <button
                onClick={() => setShowCompletionModal(true)}
                className="hidden px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                🧪 Test Completion Modal
                  </button>

              {/* Actions Menu - When Analysis Started */}
              {analysisStarted && !isUploading && (
                <div className="relative inline-block text-left">
                  <div className="flex items-center space-x-2">
                  <button
                    onClick={handleUploadDifferentRFP}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Upload Different RFP
                  </button>
                  </div>
                </div>
              )}
              
              {/* Full Version Link - Always Visible */}
              <a 
                href="https://q.agency/products/q-estimation-tool/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-4 hover:decoration-blue-800 transition-colors"
              >
                <span className="mr-1">Explore Full Version</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {!uploadedFileName && !isFileValidated && (
          <div className="max-w-4xl mx-auto">
            {/* Professional Header */}
            <div className="text-center mb-6">
              <div className="mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    AI-Powered Project Estimation
              </h2>
                </div>
                <p className="text-base text-gray-600 max-w-2xl mx-auto">
                  Upload your RFP document and receive comprehensive AI analysis with detailed project estimation, team recommendations, and development roadmaps.
              </p>
            </div>

              {/* Feature Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">8-Step Analysis</h3>
                  <p className="text-xs text-gray-600 mt-1">Comprehensive project breakdown</p>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Team Planning</h3>
                  <p className="text-xs text-gray-600 mt-1">Optimal resource allocation</p>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Timeline Estimates</h3>
                  <p className="text-xs text-gray-600 mt-1">Sprint & milestone planning</p>
                </div>
              </div>
            </div>

            {/* Professional Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 shadow-md ${
                isHovered
                  ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-blue-50 backdrop-blur-sm scale-[1.01]'
                  : 'border-gray-300 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 hover:scale-[1.005]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-6">
                {/* Upload Icon */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  {isHovered && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Upload Content */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Upload Your RFP Document
                  </h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Drag and drop your PDF file here, or click to browse your files
                  </p>
                  
                  {/* Requirements */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 mb-6 border border-gray-200 max-w-sm mx-auto">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">PDF Only</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                        <span className="text-sm font-medium text-gray-700">Max 5MB</span>
                  </div>
                    </div>
                  </div>
                  
                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose Your RFP File
                  </button>
                  
                  {/* Legal Disclaimer Button */}
                  <div className="max-w-lg mx-auto mt-4">
                    <button
                      onClick={() => setShowDisclaimerModal(true)}
                      className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Legal Disclaimer
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Validated - Ready to Start Analysis */}
        {isFileValidated && !analysisStarted && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center">
                {/* Success Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Ready to Analyze Your RFP
                </h2>
                  <p className="text-base text-gray-600">
                    Click "Start AI Analysis" below to begin your comprehensive project estimation
                  </p>
                </div>
                
                {/* File Information Card */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-lg">{uploadedFileName}</p>
                      <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <span className="inline-flex items-center space-x-1">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Validated & Ready</span>
                        </span>
                         {uploadedFileSize && (
                           <>
                             <span className="text-gray-400">•</span>
                             <span>{formatFileSize(uploadedFileSize)}</span>
                           </>
                         )}
                       </div>
                     </div>
                  </div>
                </div>
                
                {/* Analysis Preview */}
                <div className="space-y-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-xl p-4 border border-blue-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-blue-900 mb-2">What Happens Next</h4>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          Our advanced AI will analyze your document through <strong>8 comprehensive steps</strong> including platform identification, requirements extraction, technology stack recommendations, team composition planning, effort estimation, and detailed development roadmap creation.
                        </p>
                      </div>
                  </div>
                </div>

                  {/* Process Steps Preview */}
                  <div className="flex items-center justify-center space-x-1 overflow-x-auto pb-1">
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zM3 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm6-11a1 1 0 011-1h1a1 1 0 011 1v2H9V4zm0 4h3v2H9V8zm0 4h3v2H9v-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Preparation</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Platforms</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Requirements</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Techstack</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Team</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Estimate</div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200 text-center flex-shrink-0 w-24">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium text-gray-700">Roadmap</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={startAnalysis}
                    className="inline-flex items-center px-10 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start AI Analysis
                  </button>
                  
                  <button
                    onClick={resetUpload}
                    className="inline-flex items-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-xl text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Different File
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
              {/* Professional loading header */}
              <div className="text-center mb-6">
                {/* Simple Loading Spinner */}
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Uploading Your Document
                </h3>
                <p className="text-gray-600 text-sm">
                  Please wait while we securely process your RFP file...
                    </p>
                  </div>
              
              {/* File Info */}
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{uploadedFileName}</p>
                      <p className="text-sm text-gray-600">Processing PDF document...</p>
              </div>
              </div>
                              </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Progress Dashboard */}
        {analysisStarted && (
          <div className="mb-8">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-gray-200 shadow-sm">
              {/* Header with Export Button */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1"></div>
                
                {/* Export Button - Top Right */}
                {isFinalReportComplete() && (
                  <button
                    onClick={() => setShowCompletionModal(true)}
                    className="inline-flex items-center px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H4a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Report
                  </button>
                )}
              </div>
              
              {/* Centered Progress Display */}
              <div className="text-center mb-6">
                {isFinalReportComplete() ? (
                  <div className="space-y-4">
                    {/* Completion Celebration */}
                    <div className="relative w-20 h-20 mx-auto">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                        <defs>
                          <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        <circle 
                          cx="40" cy="40" r="35" 
                          stroke="#d1fae5" 
                          strokeWidth="6" 
                          fill="none"
                        />
                        <circle 
                          cx="40" cy="40" r="35" 
                          stroke="url(#completionGradient)" 
                          strokeWidth="6" 
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 35}`}
                          strokeDashoffset="0"
                          className="animate-pulse"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Analysis Complete!</h3>
                      <p className="text-lg text-green-700 font-medium">All {steps.length} steps completed successfully</p>
                      <p className="text-sm text-gray-600 mt-1">Your comprehensive project estimation is ready</p>
                </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Progress Display */}
                    <div className="relative w-16 h-16 mx-auto">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke="#e5e7eb" 
                          strokeWidth="4" 
                          fill="none"
                        />
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke="url(#progressGradient)" 
                          strokeWidth="4" 
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - (steps.filter(step => step.status === 'done').length / steps.length))}`}
                          className="transition-all duration-500 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                    {Math.round((steps.filter(step => step.status === 'done').length / steps.length) * 100)}%
                        </span>
                  </div>
                  </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Analysis Progress</h3>
                      <p className="text-sm text-gray-600">
                        {isProcessing ? 'AI is analyzing your RFP document...' : 'Analysis in progress...'}
                      </p>
                      <div className="text-lg font-bold text-blue-600 mt-2">
                        {steps.filter(step => step.status === 'done').length}/{steps.length} Complete
                </div>
                    </div>
                  </div>
                )}
              </div>
              
                             {/* Connected Timeline */}
               <div className="relative">
                 {/* Background connecting line */}
                 <div className="absolute top-6 left-8 right-8 h-0.5 bg-slate-200 rounded-full"></div>
                 {/* Progress connecting line */}
                 <div 
                   className="absolute top-6 left-8 h-0.5 bg-gradient-to-r from-green-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                     width: `calc(${(steps.filter(step => step.status === 'done').length / steps.length) * 100}% - 2rem)` 
                  }}
                ></div>
                 
                 {/* Step indicators */}
                 <div className="relative flex justify-between">
                   {steps.map((step, index) => {
                     const getStepIcon = () => {
                       const getContextIcon = () => {
                         switch (step.id) {
                           case 'document_preparation':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'platforms':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'requirements':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'techstack':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'team_composition':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                               </svg>
                             );
                           case 'effort_estimation':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'development_plan':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'final_report':
                             return (
                               <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                               </svg>
                             );
                           default:
                             return (
                               <div className="w-3 h-3 bg-white rounded-full"></div>
                             );
                         }
                       };

                       if (step.status === 'done') {
                         return getContextIcon();
                       } else if (step.status === 'in_progress') {
                         return (
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         );
                       } else if (step.status === 'error') {
                         return (
                           <div className="w-2 h-2 bg-white rounded-sm rotate-45"></div>
                         );
                       } else {
                         // Return the contextual icon in gray for pending steps
                         switch (step.id) {
                           case 'document_preparation':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'platforms':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'requirements':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'techstack':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'team_composition':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                               </svg>
                             );
                           case 'effort_estimation':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'development_plan':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                               </svg>
                             );
                           case 'final_report':
                             return (
                               <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                               </svg>
                             );
                           default:
                             return <span className="text-sm font-bold text-slate-600">{index + 1}</span>;
                         }
                       }
                     };

                     const getStepStyles = () => {
                       if (step.status === 'done') {
                         return 'bg-gradient-to-br from-green-400 to-green-500 border-green-300 shadow-lg shadow-green-400/15 hover:shadow-green-400/25';
                       } else if (step.status === 'in_progress') {
                         return 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 shadow-lg shadow-blue-500/20 animate-pulse';
                       } else if (step.status === 'error') {
                         return 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30';
                       } else {
                         return 'bg-white border-slate-300 shadow-md hover:shadow-lg hover:border-slate-400';
                       }
                     };

                     return (
                       <div key={step.id} className="relative z-10 flex flex-col items-center group">
                         {/* Circle container with fixed height to ensure alignment */}
                         <div className="flex items-center justify-center h-12">
                           <div 
                             onClick={() => handleStepClick(step)}
                             className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 
                               group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/30 
                               cursor-pointer transform hover:rotate-2 ${getStepStyles()} ${
                               selectedStep?.id === step.id ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                             }`}
                           >
                             {getStepIcon()}
                    </div>
                  </div>
                         {/* Text content positioned below circle */}
                         <div 
                           onClick={() => handleStepClick(step)}
                           className="mt-3 text-center max-w-20 cursor-pointer group-hover:scale-105 transition-transform duration-200"
                         >
                           <div className={`text-xs font-semibold leading-tight transition-colors duration-200 ${
                             selectedStep?.id === step.id ? 'text-blue-700' : 'text-slate-700 hover:text-slate-900'
                           }`}>
                             {step.title}
              </div>
                           <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium flex items-center justify-center 
                             transition-all duration-200 cursor-pointer hover:scale-105 ${
                             step.status === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                             step.status === 'in_progress' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                             step.status === 'error' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                             'bg-gray-100 text-gray-500 hover:bg-gray-200'
                           } ${selectedStep?.id === step.id ? 'ring-1 ring-blue-300' : ''}`}>
                             {step.status === 'done' ? (
                               <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                               </svg>
                             ) : step.status === 'in_progress' ? 'Processing' :
                               step.status === 'error' ? 'Issue' : 'Pending'}
                  </div>
                </div>
            </div>
                     );
                   })}
          </div>
              </div>
              
              {/* Current Step Indicator */}
                  {isProcessing && (
                <div className="mt-6 bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center">
                       <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mr-3">
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                                             <div>
                         <div className="text-sm text-gray-900">
                           Currently Processing: <span className="font-semibold">{steps.find(step => step.status === 'in_progress')?.title || 'Analysis'}</span>
                      </div>
                         <div className="text-xs text-gray-600 leading-relaxed">
                           {steps.find(step => step.status === 'in_progress')?.details || 'Starting analysis...'}
                    </div>
                </div>
              </div>
            </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {analysisStarted && (
                  <div>
            {/* Main Content Area */}
            <div>
              {selectedStep && isDetailsOpen ? (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm">
                  {/* Step Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedStep.status === 'done' ? (() => {
                            switch (selectedStep.id) {
                              case 'document_preparation':
                                return 'Document Preparation Complete';
                              case 'platforms':
                                return 'Platform Analysis Complete';
                              case 'requirements':
                                return 'Requirements Analysis Complete';
                              case 'techstack':
                                return 'Technology Stack Analysis Complete';
                              case 'team_composition':
                                return 'Team Composition Analysis Complete';
                              case 'effort_estimation':
                                return 'Effort Estimation Complete';
                              case 'development_plan':
                                return 'Development Plan Complete';
                              case 'final_report':
                                return 'Final Report Complete';
                              default:
                                return selectedStep.title;
                            }
                          })() : selectedStep.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedStep.status === 'done' ? (() => {
                            switch (selectedStep.id) {
                              case 'document_preparation':
                                return 'Your RFP has been successfully prepared for analysis';
                              case 'platforms':
                                return 'Target platforms have been identified based on your requirements';
                              case 'requirements':
                                return 'Functional and non-functional requirements have been extracted';
                              case 'techstack':
                                return 'Technology recommendations have been generated';
                              case 'team_composition':
                                return 'Optimal team structure has been determined';
                              case 'effort_estimation':
                                return 'Timeline and effort estimates have been calculated';
                              case 'development_plan':
                                return 'Comprehensive development roadmap has been created';
                              case 'final_report':
                                return 'Complete project estimation report is ready';
                              default:
                                return selectedStep.description;
                            }
                          })() : selectedStep.description}
                        </p>
                      </div>
                      <button
                        onClick={toggleDetails}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="p-6">
                    {selectedStep.status === 'pending' ? (
                      /* Pending State View */
                      <div className="text-center py-16">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                          {selectedStep.title} - Waiting to Start
                        </h3>
                        <div className="max-w-lg mx-auto space-y-4">
                          <p className="text-gray-600 text-lg leading-relaxed">
                            {(() => {
                              const currentStepIndex = steps.findIndex(step => step.id === selectedStep.id);
                              const isFirstStep = currentStepIndex === 0;
                              const hasInProgressSteps = steps.some(step => step.status === 'in_progress');
                              
                              if (isFirstStep && !analysisStarted) {
                                return 'This is the first step of the analysis. It will begin automatically when you start the analysis process.';
                              } else if (isFirstStep && analysisStarted) {
                                return 'Analysis is starting. This step should begin processing shortly.';
                              } else if (hasInProgressSteps) {
                                return 'Waiting for preceding steps to be completed before this step will be started automatically.';
                              } else {
                                return 'This step is ready to begin and will start automatically once the analysis process is initiated.';
                              }
                            })()}
                          </p>
                          
                          {/* Step Preview */}
                          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-3">What This Step Will Do</h4>
                            <p className="text-blue-800 text-sm leading-relaxed">
                              {selectedStep.id === 'document_preparation' && 'Parse and structure your RFP document, extracting key information and preparing it for AI analysis.'}
                              {selectedStep.id === 'platforms' && 'Analyze your requirements to identify target platforms such as web, mobile, desktop, or specialized applications.'}
                              {selectedStep.id === 'requirements' && 'Extract and categorize functional and non-functional requirements from your RFP document.'}
                              {selectedStep.id === 'techstack' && 'Recommend appropriate technology stacks based on your requirements and target platforms.'}
                              {selectedStep.id === 'team_composition' && 'Determine optimal team structure, roles, and resource allocation for your project.'}
                              {selectedStep.id === 'effort_estimation' && 'Calculate development effort, timeline estimates, and sprint planning recommendations.'}
                              {selectedStep.id === 'development_plan' && 'Create a comprehensive development roadmap with phases, milestones, and deliverables.'}
                              {selectedStep.id === 'final_report' && 'Generate a complete project estimation report with all analysis results and recommendations.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : selectedStep.status === 'in_progress' ? (
                      /* Processing State View */
                      <div className="text-center py-16">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                          {selectedStep.title} - Currently Processing
                        </h3>
                        <div className="max-w-lg mx-auto space-y-6">
                                                     <p className="text-gray-600 text-lg leading-relaxed">
                             AI is actively analyzing your RFP for {selectedStep.title.toLowerCase()}. {(() => {
                               switch (selectedStep.id) {
                           case 'document_preparation':
                                   return 'This typically takes 5-10 seconds.';
                           case 'platforms':
                                   return 'This typically takes 7-15 seconds.';
                                 case 'requirements':
                                   return 'This typically takes 1-2 minutes.';
                                 case 'techstack':
                                   return 'This typically takes 10-20 seconds.';
                                 case 'team_composition':
                                   return 'This typically takes 10-20 seconds.';
                                 case 'effort_estimation':
                                   return 'This typically takes 7-15 seconds.';
                                 case 'development_plan':
                                   return 'This typically takes 1-2 minutes.';
                                 default:
                                   return 'This typically takes 10-30 seconds.';
                               }
                             })()}
                           </p>
                           
                           {/* Live Updates */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-900 mb-2">Processing Status</h4>
                                <p className="text-blue-800 text-sm leading-relaxed">
                                  {selectedStep.details || 'AI is analyzing your document. Results will appear here when processing is complete.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : selectedStep.status === 'error' ? (
                      /* Error State View */
                      <div className="text-center py-16">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-inner">
                            <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                          {selectedStep.title} - Step Failed
                        </h3>
                        <div className="max-w-lg mx-auto space-y-6">
                          <p className="text-gray-600 text-lg leading-relaxed">
                            This step encountered an error during processing. Please check the details below or try restarting the analysis to resolve the issue.
                          </p>
                          
                          {selectedStep.details && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                               <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                               </svg>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-red-900 mb-2">Error Details</h4>
                                  <p className="text-red-800 text-sm leading-relaxed">
                                    {selectedStep.details}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedStep.details ? (
                      selectedStep.id === 'document_preparation' ? (
                        /* Professional Document Preparation View */
                        <div className="space-y-6">
                          
                
                          {/* Process Overview */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-gray-200 text-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm">Document Parsed</h4>
                              <p className="text-xs text-gray-600 mt-1">Content extracted and structured</p>
                            </div>
                            
                            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-gray-200 text-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm">Data Organized</h4>
                              <p className="text-xs text-gray-600 mt-1">Key information identified</p>
                            </div>
                            
                            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-gray-200 text-center">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <h4 className="font-semibold text-gray-900 text-sm">AI Ready</h4>
                              <p className="text-xs text-gray-600 mt-1">Prepared for analysis</p>
                            </div>
                          </div>


                        </div>
                      ) : selectedStep.id === 'platforms' ? (
                        /* Professional Platforms View */
                        <div className="space-y-6">


                          {/* Platforms Grid */}
                          {(() => {
                            try {
                              const platformsData = selectedStep.platforms_data;
                              if (platformsData && platformsData.platforms) {
                                const getPlatformIcon = (enumValue: string) => {
                                  switch (enumValue) {
                                    case 'WEB':
                             return (
                                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0015.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.032 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                               </svg>
                             );
                                    case 'MOBILE':
                             return (
                                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM6 4a1 1 0 011-1h6a1 1 0 011 1v3H6V4zm0 5h8v6H6V9zm2 8a1 1 0 100-2 1 1 0 000 2zm4-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                               </svg>
                             );
                                    case 'BACKEND_API':
                             return (
                                        <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                          <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1v1z" />
                               </svg>
                             );
                                    case 'ADMIN_PORTAL':
                             return (
                                        <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                               </svg>
                             );
                                    case 'DESKTOP':
                             return (
                                        <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                               </svg>
                             );
                                    case 'KIOSK':
                             return (
                                        <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 6a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4zm2 0v4h6v-4H7z" clipRule="evenodd" />
                               </svg>
                             );
                           default:
                             return (
                                        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                               </svg>
                             );
                         }
                       };

                             return (
                                  <div className="space-y-6">
                                    {/* Platforms Header */}
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Identified Target Platforms</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {platformsData.platforms.map((platform: any, index: number) => (
                                          <div key={index} className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200 text-center hover:shadow-lg transition-shadow duration-200">
                                            <div className="flex justify-center mb-4">
                                              <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                                {getPlatformIcon(platform.enum)}
                                              </div>
                                            </div>
                                            <h5 className="font-bold text-gray-900 text-lg mb-2">{platform.text}</h5>
                                            <div className="inline-flex px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                                              {platform.enum.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Rationale Section */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                                      <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                               <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                               </svg>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-gray-900 mb-2">Analysis Rationale</h4>
                                          <div 
                                            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                            dangerouslySetInnerHTML={{ 
                                              __html: convertMarkupToHtml(platformsData.rationale) 
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>


                           </div>
                         );
                              } else {
                                // Fallback to parsed content if structured data isn't available
                             return (
                      <div 
                        className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ 
                          __html: convertMarkupToHtml(selectedStep.details) 
                        }}
                      />
                                );
                              }
                            } catch (e) {
                              // Fallback to original content if parsing fails
                         return (
                                <div 
                                  className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                                  dangerouslySetInnerHTML={{ 
                                    __html: convertMarkupToHtml(selectedStep.details) 
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      ) : selectedStep.id === 'requirements' ? (
                        /* Professional Requirements View */
                        <div className="space-y-6">


                          {/* Requirements Content */}
                          {(() => {
                            try {
                              // Try to parse structured requirements data
                              const requirementsData = selectedStep.requirements_data;
                              if (requirementsData) {
                         return (
                                  <div className="space-y-6">
                                    {/* Requirements Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Functional Requirements */}
                                      {requirementsData.functional && requirementsData.functional.length > 0 && (
                                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                          <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900">Functional Requirements</h4>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                              {requirementsData.functional.length}
                                            </span>
                                          </div>
                                          <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {requirementsData.functional.map((req: string, index: number) => (
                                              <div key={index} className="flex items-start space-x-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{req}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Non-Functional Requirements */}
                                      {requirementsData.non_functional && requirementsData.non_functional.length > 0 && (
                                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                          <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                              <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900">Non-Functional Requirements</h4>
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                              {requirementsData.non_functional.length}
                                            </span>
                                          </div>
                                          <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {requirementsData.non_functional.map((req: string, index: number) => (
                                              <div key={index} className="flex items-start space-x-2">
                                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <p className="text-sm text-gray-700 leading-relaxed">{req}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Requirements Summary */}
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                                      <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-emerald-900 mb-2">Requirements Summary</h4>
                                          <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-emerald-700">
                                                {requirementsData.functional?.length || 0}
                                              </div>
                                              <div className="text-xs text-emerald-600">Functional</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-emerald-700">
                                                {requirementsData.non_functional?.length || 0}
                                              </div>
                                              <div className="text-xs text-emerald-600">Non-Functional</div>
                                            </div>
                                          </div>
                                          <p className="text-emerald-800 text-sm leading-relaxed">
                                            All requirements have been systematically extracted and categorized to ensure comprehensive project scope understanding.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                           </div>
                         );
                       } else {
                                // Parse from details content if structured data isn't available
                                const content = selectedStep.details;
                                if (content) {
                         return (
                                    <div className="space-y-6">
                                      {/* General Requirements Display */}
                                      <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                 </svg>
                                          </div>
                                          <h4 className="text-lg font-bold text-gray-900">Extracted Requirements</h4>
                                        </div>
                                        <div 
                                          className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: convertMarkupToHtml(content) 
                                          }}
                                        />
                                      </div>
                           </div>
                         );
                                }
                              }
                            } catch (e) {
                              // Fallback to original content
                         return (
                                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                  <div 
                                    className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ 
                                      __html: convertMarkupToHtml(selectedStep.details) 
                                    }}
                                  />
                           </div>
                         );
                            }
                            
                            return null;
                          })()}


                        </div>
                      ) : selectedStep.id === 'techstack' ? (
                        /* Professional Techstack View */
                        <div className="space-y-6">


                          {/* Tech Stack Content */}
                          {(() => {
                            try {
                              const techStackData = selectedStep.tech_stack;
                              if (techStackData && Object.keys(techStackData).length > 0) {
                                                                 const getTechIcon = (category: string) => {
                                   switch (category.toLowerCase()) {
                                     case 'frontend':
                                     case 'frontend_frameworks':
                                     case 'frontend_libraries':
                               return (
                                         <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                                 </svg>
                               );
                                     case 'backend':
                                     case 'backend_frameworks':
                                     case 'backend_services':
                                     case 'backend_stack':
                                     case 'api':
                               return (
                                         <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                           <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1v1z" />
                                 </svg>
                               );
                                     case 'database':
                                     case 'databases':
                                     case 'data_storage':
                               return (
                                         <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                                           <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                                           <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                                 </svg>
                               );
                                     case 'mobile':
                                     case 'mobile_frameworks':
                                     case 'mobile_development':
                                     case 'mobile_stack':
                               return (
                                         <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM6 4a1 1 0 011-1h6a1 1 0 011 1v3H6V4zm0 5h8v6H6V9zm2 8a1 1 0 100-2 1 1 0 000 2zm4-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                                 </svg>
                               );
                                     case 'cloud':
                                     case 'cloud_services':
                                     case 'hosting':
                                     case 'infrastructure':
                               return (
                                         <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                                 </svg>
                               );
                                     case 'devops':
                                     case 'deployment':
                                     case 'ci_cd':
                               return (
                                         <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                 </svg>
                               );
                                     case 'testing':
                                     case 'testing_frameworks':
                                     case 'qa':
                               return (
                                         <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                 </svg>
                               );
                                     case 'authentication':
                                     case 'auth':
                                     case 'security':
                               return (
                                         <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                         </svg>
                                       );
                                     case 'monitoring':
                                     case 'analytics':
                                     case 'logging':
                                       return (
                                         <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                   <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                               </svg>
                             );
                                     case 'ai_needed':
                                       return (
                                         <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                         </svg>
                                       );
                                     case 'design':
                                     case 'ui_design':
                                     case 'design_system':
                                       return (
                                         <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                         </svg>
                                       );
                                     case 'stack_model':
                                     case 'architecture':
                                     case 'model':
                                       return (
                                         <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                 </svg>
                               );
                             default:
                             return (
                                         <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                         </svg>
                             );
                         }
                       };

                                                                 const getCategoryColor = (category: string) => {
                                   switch (category.toLowerCase()) {
                                     case 'frontend':
                                     case 'frontend_frameworks':
                                     case 'frontend_libraries':
                                       return 'blue';
                                     case 'backend':
                                     case 'backend_frameworks':
                                     case 'backend_services':
                                     case 'backend_stack':
                                     case 'api':
                                       return 'green';
                                     case 'database':
                                     case 'databases':
                                     case 'data_storage':
                                       return 'orange';
                                     case 'mobile':
                                     case 'mobile_frameworks':
                                     case 'mobile_development':
                                     case 'mobile_stack':
                                       return 'pink';
                                     case 'cloud':
                                     case 'cloud_services':
                                     case 'hosting':
                                     case 'infrastructure':
                                       return 'indigo';
                                     case 'devops':
                                     case 'deployment':
                                     case 'ci_cd':
                                       return 'red';
                                     case 'testing':
                                     case 'testing_frameworks':
                                     case 'qa':
                                       return 'yellow';
                                     case 'authentication':
                                     case 'auth':
                                     case 'security':
                                       return 'red';
                                     case 'monitoring':
                                     case 'analytics':
                                     case 'logging':
                                       return 'emerald';
                                     case 'design':
                                     case 'ui_design':
                                     case 'design_system':
                                       return 'indigo';
                                     case 'stack_model':
                                     case 'architecture':
                                     case 'model':
                                       return 'slate';
                                     default:
                                       return 'gray';
                                   }
                                 };

                         return (
                                  <div className="space-y-6">
                                                                         {/* Tech Stack Grid - Filter out integrations and rationale */}
                                     <div>
                                       <h4 className="text-lg font-bold text-gray-900 mb-4">Recommended Technology Stack</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                         {Object.entries(techStackData).map(([category, technologies]: [string, any]) => {
                                           // Skip integrations, rationale, and ai_needed - they will be handled separately
                                           if (category.toLowerCase() === 'integrations' || category.toLowerCase() === 'rationale' || category.toLowerCase() === 'ai_needed') {
                                             return null;
                                           }

                                           // Only render if we have technologies (array or string)
                                           if (!technologies || (Array.isArray(technologies) && technologies.length === 0)) {
                                             return null;
                                           }

                                           const color = getCategoryColor(category);
                                           const techList = Array.isArray(technologies) ? technologies : [technologies];

                                           return (
                                             <div key={category} className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                                               <div className="flex items-center space-x-3 mb-4">
                                                 <div className={`w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center`}>
                                                   {getTechIcon(category)}
                                                 </div>
                                                 <div>
                                                   <h5 className="font-bold text-gray-900 text-sm capitalize">
                                                     {category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                   </h5>
                                                   <div className={`inline-flex px-2 py-1 bg-${color}-100 rounded-full text-xs font-medium text-${color}-800`}>
                                                     {techList.length} {techList.length === 1 ? 'Technology' : 'Technologies'}
                                                   </div>
                                                 </div>
                                               </div>
                                               <div className="space-y-2">
                                                 {techList.map((tech: string, index: number) => (
                                                   <div key={index} className="flex items-center space-x-2">
                                                     <div className={`w-1.5 h-1.5 bg-${color}-500 rounded-full flex-shrink-0`}></div>
                                                     <span className="text-sm text-gray-700 font-medium">{tech}</span>
                                                   </div>
                                                 ))}
                                               </div>
                           </div>
                         );
                                         })}
                                       </div>
                                     </div>

                                     {/* Integrations Section */}
                                     {techStackData.integrations && (
                                       <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
                                         <div className="flex items-start space-x-3">
                                           <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                             <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                               <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                             </svg>
                                           </div>
                                           <div className="flex-1">
                                             <h4 className="font-semibold text-teal-900 mb-3">Third-Party Integrations</h4>
                                             <div className="space-y-2">
                                               {(Array.isArray(techStackData.integrations) ? techStackData.integrations : [techStackData.integrations]).map((integration: string, index: number) => (
                                                 <div key={index} className="flex items-center space-x-2">
                                                   <div className="w-1.5 h-1.5 bg-teal-500 rounded-full flex-shrink-0"></div>
                                                   <span className="text-sm text-teal-800 font-medium">{integration}</span>
                                                 </div>
                                               ))}
                                             </div>
                                           </div>
                                         </div>
                                       </div>
                                     )}

                                     {/* AI Needed Section */}
                                     {(techStackData.ai_needed === true || techStackData.ai_needed === false) && (
                                       <div className={`bg-gradient-to-r ${techStackData.ai_needed ? 'from-purple-50 to-violet-50 border-purple-200' : 'from-gray-50 to-slate-50 border-gray-200'} rounded-xl p-6 border`}>
                                         <div className="flex items-start space-x-3">
                                           <div className={`w-6 h-6 ${techStackData.ai_needed ? 'bg-purple-500' : 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                             {techStackData.ai_needed ? (
                                               <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                 <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                               </svg>
                                             ) : (
                                               <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                               </svg>
                                             )}
                        </div>
                                           <div className="flex-1">
                                             <h4 className={`font-semibold ${techStackData.ai_needed ? 'text-purple-900' : 'text-gray-900'} mb-3`}>
                                               {techStackData.ai_needed ? 'AI & Machine Learning Required' : 'AI & Machine Learning Not Required'}
                                             </h4>
                                             <p className={`text-sm ${techStackData.ai_needed ? 'text-purple-800' : 'text-gray-700'}`}>
                                               {techStackData.ai_needed 
                                                 ? 'This project requires AI/ML capabilities and integration. Specialized AI technologies and frameworks will be needed to meet the project requirements.'
                                                 : 'This project can be completed with traditional technologies and does not require specialized AI or machine learning capabilities.'
                                               }
                                             </p>
                                           </div>
                                         </div>
                      </div>
                    )}

                                     {/* Rationale Section */}
                                     {techStackData.rationale && (
                                       <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start space-x-3">
                                           <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                             <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                 </svg>
                                        </div>
                                          <div>
                                            <h4 className="font-semibold text-gray-900 mb-2">Technology Selection Rationale</h4>
                                            <div 
                                              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                              dangerouslySetInnerHTML={{ 
                                                __html: convertMarkupToHtml(typeof techStackData.rationale === 'string' ? techStackData.rationale : 'Technology stack has been carefully selected to align with your project requirements.') 
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                               )}
                            </div>
                                );
                              } else {
                                // Fallback to parsing from details content
                                const content = selectedStep.details;
                                if (content) {
                    return (
                                    <div className="space-y-6">
                                      <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <h4 className="text-lg font-bold text-gray-900">Technology Recommendations</h4>
                                        </div>
                                        <div 
                                          className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: convertMarkupToHtml(content) 
                                          }}
                                        />
                                      </div>
                           </div>
                         );
                                }
                              }
                            } catch (e) {
                              // Fallback to original content
                         return (
                                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                  <div 
                                    className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ 
                                      __html: convertMarkupToHtml(selectedStep.details) 
                                    }}
                                  />
                           </div>
                         );
                            }
                            
                            return null;
                          })()}


                        </div>
                      ) : selectedStep.id === 'team_composition' ? (
                        /* Professional Team Composition View */
                        <div className="space-y-6">


                          {/* Team Analysis */}
                        {(() => {
                          try {
                               // Parse team data from the correct field
                               let teamData;
                               
                               // Try to get data from team_composition_data first
                               if (selectedStep.team_composition_data) {
                                 teamData = selectedStep.team_composition_data;
                               } 
                               // Then try parsing from details field
                               else if (selectedStep.details) {
                                 const parsed = JSON.parse(selectedStep.details);
                                 teamData = parsed.team_plan || parsed;
                               }
                               // Finally try parsing from output field (SSE format)
                               else if ((selectedStep as any).output) {
                                 const parsed = JSON.parse((selectedStep as any).output);
                                 teamData = parsed.team_plan || parsed;
                               }
                               
                               if (teamData && teamData.roles && Array.isArray(teamData.roles)) {
                               return (
                                  <div className="space-y-6">
                                    {/* Team Overview */}
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Team Structure Overview</h4>
                                      
                                                                             {/* Team Statistics */}
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                         <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 text-center">
                                           <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                             <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                               <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                             </svg>
                                           </div>
                                           <div className="text-2xl font-bold text-blue-900">
                                             {teamData.roles.reduce((total: number, role: any) => total + role.fte, 0).toFixed(1)} FTE
                                           </div>
                                           <div className="text-sm text-blue-700">Total Team Size</div>
                                         </div>
                                         
                                         <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
                                           <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                             <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                             </svg>
                                           </div>
                                           <div className="text-2xl font-bold text-green-900">{teamData.roles.length}</div>
                                           <div className="text-sm text-green-700">Distinct Roles</div>
                                         </div>
                                         
                                         <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 text-center">
                                           <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                             <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                             </svg>
                                           </div>
                                           <div className="text-2xl font-bold text-orange-900">
                                             {teamData.roles.filter((role: any) => role.fte >= 1).length}/{teamData.roles.length}
                                           </div>
                                           <div className="text-sm text-orange-700">Full-time Roles</div>
                                         </div>
                                       </div>
                                    </div>

                                                                         {/* Team Roles */}
                                     <div>
                                       <h4 className="text-lg font-bold text-gray-900 mb-4">Team Roles & Responsibilities</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {teamData.roles.map((roleData: any, index: number) => {
                                           const getRoleIcon = (roleName: string) => {
                                             const role = roleName.toLowerCase();
                                             // Check specific roles first before general patterns
                                             if (role.includes('devops')) {
                                               return (
                                                 <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                   <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                 </svg>
                               );
                                             } else if (role.includes('qa') || role.includes('tester')) {
                               return (
                                                 <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                   </svg>
                               );
                                             } else if (role.includes('manager') || role.includes('lead') || role.includes('architect')) {
                               return (
                                                 <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                                   <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.723V12a1 1 0 11-2 0v-1.277l-1.246-.855a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.277l1.246.855a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.277V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                                 </svg>
                               );
                                             } else if (role.includes('designer')) {
                               return (
                                                 <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                   <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                 </svg>
                               );
                                             } else if (role.includes('developer') || role.includes('engineer')) {
                               return (
                                                 <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                   <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                 </svg>
                               );
                                             } else {
                               return (
                                                 <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                   <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                 </svg>
                               );
                                             }
                                           };

                                           const getFteColor = (fte: number) => {
                                             if (fte >= 1) return 'bg-green-100 text-green-800';
                                             if (fte >= 0.5) return 'bg-yellow-100 text-yellow-800';
                                             return 'bg-gray-100 text-gray-800';
                                           };

                               return (
                                             <div key={index} className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                                               <div className="flex items-start space-x-4">
                                                 <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                   {getRoleIcon(roleData.role)}
                                                 </div>
                                                 <div className="flex-1">
                                                   <div className="flex items-start justify-between mb-3">
                                                     <h5 className="font-bold text-gray-900 text-sm leading-tight">{roleData.role}</h5>
                                                     <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getFteColor(roleData.fte)}`}>
                                                       {roleData.fte} FTE
                        </span>
                      </div>
                                                   <div className="text-xs text-gray-600 leading-relaxed">
                                                     {roleData.rationale}
                    </div>
                </div>
                                               </div>
                      </div>
                    );
                  })}
              </div>
            </div>

                                    {/* Rationale Section */}
                                    {teamData.rationale && (
                                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-start space-x-3">
                                          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                 </svg>
            </div>
                      <div>
                                            <h4 className="font-semibold text-gray-900 mb-2">Team Structure Rationale</h4>
                                            <div 
                                              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                              dangerouslySetInnerHTML={{ 
                                                __html: convertMarkupToHtml(teamData.rationale) 
                                              }}
                                            />
                      </div>
                    </div>
                  </div>
                                    )}


                                  </div>
                                );
                              } else {
                                // Fallback to parsing from details content
                                const content = selectedStep.details;
                                if (content) {
                               return (
                                    <div className="space-y-6">
                                      <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                    </div>
                                          <h4 className="text-lg font-bold text-gray-900">Team Composition Analysis</h4>
                  </div>
                                        <div 
                                          className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: convertMarkupToHtml(content) 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                              }
                          } catch (e) {
                              // Fallback to original content
                         return (
                                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                      <div 
                        className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ 
                          __html: convertMarkupToHtml(selectedStep.details) 
                        }}
                      />
                        </div>
                         );
                       }
                            
                            return null;
                          })()}
                      </div>
                      ) : selectedStep.id === 'effort_estimation' ? (
                        /* Professional Effort Estimation View */
                        <div className="space-y-6">
                          {/* Estimation Analysis */}
                        {(() => {
                          try {
                              // Parse estimation data
                              let estimationData;
                              
                              // Try to get data from effort_estimation_data first
                              if (selectedStep.effort_estimation_data) {
                                estimationData = selectedStep.effort_estimation_data;
                              } 
                              // Then try parsing from details field
                              else if (selectedStep.details) {
                                try {
                                  const parsed = JSON.parse(selectedStep.details);
                                  estimationData = parsed;
                                } catch {
                                  // Not JSON, skip
                                }
                              }
                              // Finally try parsing from output field (SSE format)
                              else if ((selectedStep as any).output) {
                                const parsed = JSON.parse((selectedStep as any).output);
                                estimationData = parsed;
                              }
                              
                              if (estimationData && 
                                  typeof estimationData.min_sprints === 'number' && 
                                  typeof estimationData.max_sprints === 'number') {
                                
                                // Calculate derived values
                                const minWeeks = estimationData.min_sprints * 2;
                                const maxWeeks = estimationData.max_sprints * 2;
                                const avgSprints = Math.round((estimationData.min_sprints + estimationData.max_sprints) / 2);
                                const avgWeeks = avgSprints * 2;
                                const minMonths = Math.round(minWeeks / 4.33);
                                const maxMonths = Math.round(maxWeeks / 4.33);
                                const avgMonths = Math.round(avgWeeks / 4.33);

                    return (
                                  <div className="space-y-6">
                                    {/* Timeline Overview */}
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Project Timeline Estimates</h4>
                                      
                                      {/* Sprint Estimates */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
                                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-green-900">{estimationData.min_sprints}</div>
                                          <div className="text-sm text-green-700 mb-1">Best Case</div>
                                          <div className="text-xs text-green-600">{minWeeks} weeks • {minMonths} months</div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 text-center">
                                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-blue-900">{avgSprints}</div>
                                          <div className="text-sm text-blue-700 mb-1">Expected</div>
                                          <div className="text-xs text-blue-600">{avgWeeks} weeks • {avgMonths} months</div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 text-center">
                                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-orange-900">{estimationData.max_sprints}</div>
                                          <div className="text-sm text-orange-700 mb-1">Worst Case</div>
                                          <div className="text-xs text-orange-600">{maxWeeks} weeks • {maxMonths} months</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Timeline Visualization */}
                                    <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Sprint Timeline Breakdown</h4>
                                      
                                      {/* Visual Timeline */}
                                      <div className="space-y-4">
                                        {/* Min Timeline */}
                                        <div className="flex items-center space-x-4">
                                          <div className="w-20 text-sm font-medium text-green-700">Best Case</div>
                                          <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                            <div 
                                              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                                              style={{ width: `${(estimationData.min_sprints / estimationData.max_sprints) * 100}%` }}
                                            />
                                          </div>
                                          <div className="w-20 text-sm text-gray-600 text-right">{estimationData.min_sprints} sprints</div>
                                        </div>
                                        
                                        {/* Expected Timeline */}
                                        <div className="flex items-center space-x-4">
                                          <div className="w-20 text-sm font-medium text-blue-700">Expected</div>
                                          <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                            <div 
                                              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                                              style={{ width: `${(avgSprints / estimationData.max_sprints) * 100}%` }}
                                            />
                                          </div>
                                          <div className="w-20 text-sm text-gray-600 text-right">{avgSprints} sprints</div>
                                        </div>
                                        
                                        {/* Max Timeline */}
                                        <div className="flex items-center space-x-4">
                                          <div className="w-20 text-sm font-medium text-orange-700">Worst Case</div>
                                          <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full w-full" />
                                          </div>
                                          <div className="w-20 text-sm text-gray-600 text-right">{estimationData.max_sprints} sprints</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
                                        <div className="flex items-center space-x-3 mb-3">
                                          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <h5 className="font-bold text-teal-900">Sprint Duration</h5>
                                        </div>
                                        <div className="text-2xl font-bold text-teal-900 mb-1">2 weeks</div>
                                        <div className="text-sm text-teal-700">
                                          Standard sprint duration assumed
                                        </div>
                                      </div>
                                    </div>

                                    {/* Rationale Section */}
                                    {estimationData.rationale && (
                                      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start space-x-3">
                                          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-gray-900 mb-2">Estimation Rationale</h4>
                                            <div 
                                              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                              dangerouslySetInnerHTML={{ 
                                                __html: convertMarkupToHtml(estimationData.rationale) 
                                              }}
                                            />
                                          </div>
                                        </div>
                      </div>
                    )}


                                  </div>
                                );
                              } else {
                                // Fallback to parsing from details content
                                const content = selectedStep.details;
                                if (content) {
                                  return (
                                    <div className="space-y-6">
                                      <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <h4 className="text-lg font-bold text-gray-900">Effort Estimation Analysis</h4>
                                        </div>
                                        <div 
                                          className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: convertMarkupToHtml(content) 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                              }
                          } catch (e) {
                              // Fallback to original content
                              return (
                                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                  <div 
                                    className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ 
                                      __html: convertMarkupToHtml(selectedStep.details) 
                                    }}
                                  />
                                </div>
                              );
                            }
                            
                            return null;
                        })()}
                        </div>
                      ) : selectedStep.id === 'development_plan' ? (
                        /* Professional Development Plan/Roadmap View */
                        <div className="space-y-6">
                          {/* Development Plan Analysis */}
                          {(() => {
                            try {
                              // Parse development plan data
                              let planData;
                              
                              // Try to get data from development_plan_data first
                              if (selectedStep.development_plan_data) {
                                planData = selectedStep.development_plan_data;
                              } 
                              // Then try parsing from details field
                              else if (selectedStep.details) {
                                try {
                                  const parsed = JSON.parse(selectedStep.details);
                                  planData = parsed;
                                } catch {
                                  // Not JSON, skip
                                }
                              }
                              // Finally try parsing from output field (SSE format)
                              else if ((selectedStep as any).output) {
                                const parsed = JSON.parse((selectedStep as any).output);
                                planData = parsed;
                              }
                              
                              if (planData && planData.phases && Array.isArray(planData.phases)) {
                                
                                // Calculate overview statistics
                                const totalPhases = planData.phases.length;
                                const totalSprints = Math.max(...planData.phases.map((p: any) => p.sprints.end));
                                const crossCuttingCategories = planData.cross_cutting ? Object.keys(planData.cross_cutting).length : 0;

                                return (
                                  <div className="space-y-6">
                                    {/* Plan Overview */}
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Development Plan Overview</h4>
                                      
                                      {/* Plan Statistics */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 text-center">
                                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-blue-900">{totalPhases}</div>
                                          <div className="text-sm text-blue-700">Development Phases</div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
                                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-green-900">{totalSprints}</div>
                                          <div className="text-sm text-green-700">Total Sprints</div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 text-center">
                                          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <div className="text-2xl font-bold text-purple-900">{crossCuttingCategories}</div>
                                          <div className="text-sm text-purple-700">Cross-cutting Areas</div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Development Phases */}
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Development Phases</h4>
                                      <div className="space-y-4">
                                        {planData.phases.map((phase: any, index: number) => {
                                          const duration = phase.sprints.end - phase.sprints.start + 1;
                                          const phaseColors = [
                                            'from-blue-50 to-indigo-50 border-blue-200',
                                            'from-green-50 to-emerald-50 border-green-200', 
                                            'from-purple-50 to-violet-50 border-purple-200',
                                            'from-orange-50 to-amber-50 border-orange-200',
                                            'from-teal-50 to-cyan-50 border-teal-200',
                                            'from-pink-50 to-rose-50 border-pink-200'
                                          ];
                                          const colorClass = phaseColors[index % phaseColors.length];
                                          
                                          return (
                                            <div key={index} className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 border`}>
                                              <div className="flex items-start justify-between mb-4">
                                                <div>
                                                  <h5 className="text-lg font-bold text-gray-900 mb-1">
                                                    Phase {index + 1}: {phase.name}
                                                  </h5>
                                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <span className="inline-flex items-center space-x-1">
                                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                      </svg>
                                                      <span>Sprints {phase.sprints.start}-{phase.sprints.end}</span>
                                                    </span>
                                                    <span className="inline-flex items-center space-x-1">
                                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                      </svg>
                                                      <span>{duration} sprint{duration > 1 ? 's' : ''} ({duration * 2} weeks)</span>
                        </span>
                      </div>
                    </div>
                                                <div className="text-right">
                                                  <div className="inline-flex px-3 py-1 bg-white/60 rounded-full text-xs font-medium text-gray-700">
                                                    {phase.items?.length || 0} deliverables
                                                  </div>
                                                </div>
                </div>
                        
                                              {/* Phase Items */}
                                              {phase.items && phase.items.length > 0 && (
                                                <div className="space-y-2">
                                                  <h6 className="text-sm font-semibold text-gray-900 mb-2">Key Deliverables:</h6>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {phase.items.map((item: string, itemIndex: number) => (
                                                      <div key={itemIndex} className="flex items-start space-x-2 text-sm text-gray-700">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span>{item}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                      </div>
                    )}
                      </div>
                    );
                  })}
                </div>
              </div>

                                    {/* Timeline Visualization */}
                                    <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                      <h4 className="text-lg font-bold text-gray-900 mb-4">Sprint Timeline</h4>
                                      <div className="relative">
                                        <div className="flex items-center space-x-1 mb-2">
                                          {Array.from({ length: totalSprints }, (_, i) => (
                                            <div key={i} className="flex-1 text-center">
                                              <div className="text-xs text-gray-500 mb-1">S{i + 1}</div>
                                              <div className="h-2 bg-gray-200 rounded-sm"></div>
                                            </div>
                                          ))}
            </div>

                                        {/* Phase Overlays */}
                                        <div 
                                          className="relative mt-4 mb-2"
                                          style={{ height: `${Math.max(planData.phases.length * 24, 32)}px` }}
                                        >
                                          {planData.phases.map((phase: any, index: number) => {
                                            const startPercent = ((phase.sprints.start - 1) / totalSprints) * 100;
                                            const widthPercent = ((phase.sprints.end - phase.sprints.start + 1) / totalSprints) * 100;
                                            const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-teal-400', 'bg-pink-400'];
                                            
                              return (
                                              <div 
                                                key={index}
                                                className={`absolute h-5 ${colors[index % colors.length]} rounded-sm opacity-80 flex items-center`}
                                                style={{ 
                                                  left: `${startPercent}%`, 
                                                  width: `${widthPercent}%`,
                                                  top: `${index * 24}px`
                                                }}
                                              >
                                                <div className="text-xs text-white font-medium px-2 truncate">
                                                  {phase.name}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Cross-cutting Concerns */}
                                    {planData.cross_cutting && Object.keys(planData.cross_cutting).length > 0 && (
                      <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4">Cross-cutting Concerns</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {Object.entries(planData.cross_cutting).map(([category, items]: [string, any], index: number) => {
                                            const categoryColors = [
                                              'from-indigo-50 to-blue-50 border-indigo-200',
                                              'from-emerald-50 to-green-50 border-emerald-200',
                                              'from-amber-50 to-orange-50 border-amber-200',
                                              'from-violet-50 to-purple-50 border-violet-200',
                                              'from-cyan-50 to-teal-50 border-cyan-200',
                                              'from-rose-50 to-pink-50 border-rose-200'
                                            ];
                                            const colorClass = categoryColors[index % categoryColors.length];
                                            
                                            return (
                                              <div key={category} className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 border`}>
                                                <div className="flex items-center space-x-3 mb-4">
                                                  <div className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                                    </svg>
                      </div>
                                                  <h5 className="font-bold text-gray-900 capitalize">
                                                    {category.replace(/_/g, ' ')}
                                                  </h5>
                                                  <div className="inline-flex px-2 py-1 bg-white/60 rounded-full text-xs font-medium text-gray-600">
                                                    {Array.isArray(items) ? items.length : 0} items
                                                  </div>
                                                </div>
                                                
                                                {Array.isArray(items) && (
                                                  <div className="space-y-2">
                                                    {items.map((item: string, itemIndex: number) => (
                                                      <div key={itemIndex} className="flex items-start space-x-2 text-sm text-gray-700">
                                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                                        <span>{item}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                </div>
                              );
                                          })}
                                        </div>
                                      </div>
                                    )}


                                  </div>
                                );
                              } else {
                                // Fallback to parsing from details content
                                const content = selectedStep.details;
                                if (content) {
                              return (
                                    <div className="space-y-6">
                                      <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                          <h4 className="text-lg font-bold text-gray-900">Development Roadmap</h4>
                                        </div>
                                        <div 
                                          className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700"
                                          dangerouslySetInnerHTML={{ 
                                            __html: convertMarkupToHtml(content) 
                                          }}
                                        />
                                      </div>
                                </div>
                              );
                            }
                              }
                            } catch (e) {
                              // Fallback to original content
                              return (
                                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                                  <div 
                                    className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ 
                                      __html: convertMarkupToHtml(selectedStep.details) 
                                    }}
                                  />
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                        </div>
                      ) : (
                        /* Default step content for other steps */
                      <div 
                        className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ 
                          __html: convertMarkupToHtml(selectedStep.details) 
                        }}
                      />
                      )
                    ) : (
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            {selectedStep.status === 'pending' ? (
                              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : selectedStep.status === 'in_progress' ? (
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : selectedStep.status === 'error' ? (
                              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                        </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {selectedStep.status === 'pending' ? 'Waiting to Start' :
                           selectedStep.status === 'in_progress' ? 'Currently Processing' : 
                           selectedStep.status === 'error' ? 'Step Failed' : 'Analysis Complete'}
                        </h3>
                        <p className="text-gray-600 max-w-lg mx-auto">
                          {selectedStep.status === 'pending' ? 
                            (() => {
                              const currentStepIndex = steps.findIndex(step => step.id === selectedStep.id);
                              const isFirstStep = currentStepIndex === 0;
                              const hasInProgressSteps = steps.some(step => step.status === 'in_progress');
                              
                              if (isFirstStep && !analysisStarted) {
                                return 'This is the first step of the analysis. It will begin automatically when you start the analysis process.';
                              } else if (isFirstStep && analysisStarted) {
                                return 'Analysis is starting. This step should begin processing shortly.';
                              } else if (hasInProgressSteps) {
                                return 'Waiting for preceding steps to be completed before this step will be started automatically.';
                              } else {
                                return 'This step is ready to begin and will start automatically once the analysis process is initiated.';
                              }
                            })() :
                           selectedStep.status === 'in_progress' ? 
                            `AI is actively analyzing your RFP for ${selectedStep.title.toLowerCase()}. ${(() => {
                              switch (selectedStep.id) {
                                case 'document_preparation':
                                  return 'This typically takes 5-10 seconds.';
                                case 'platforms':
                                  return 'This typically takes 7-15 seconds.';
                                case 'requirements':
                                  return 'This typically takes 1-2 minutes.';
                                case 'techstack':
                                  return 'This typically takes 10-20 seconds.';
                                case 'team_composition':
                                  return 'This typically takes 10-20 seconds.';
                                case 'effort_estimation':
                                  return 'This typically takes 7-15 seconds.';
                                case 'development_plan':
                                  return 'This typically takes 1-2 minutes.';
                                default:
                                  return 'This typically takes 10-30 seconds.';
                              }
                            })()} Results will appear here when complete.` :
                           selectedStep.status === 'error' ? 
                            'This step encountered an error during processing. Please check the details below or try restarting the analysis to resolve the issue.' :
                           'This analysis step has been completed successfully! Review the detailed results and insights below.'}
                        </p>
                      </div>
                    )}




                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm">
                  {/* Professional Header */}
                  <div className="px-8 py-6 border-b border-gray-200 bg-white/50 backdrop-blur-sm rounded-t-xl">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        {isProcessing && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900">
                          {isProcessing ? 'Analysis in Progress' : 'Ready for Analysis'}
                  </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {isProcessing ? 'AI is processing your RFP document' : 'Select a step to view detailed results'}
                  </p>
                </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="p-8">
                    <div className="text-center space-y-6">
                      {/* Status Icon */}
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                            {isProcessing ? (
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Professional Message */}
                      <div className="max-w-lg mx-auto space-y-4">
                        <p className="text-gray-700 text-lg leading-relaxed">
                          {isProcessing 
                            ? 'Your RFP document is being analyzed with advanced AI technology. Results will appear as each step completes.'
                            : 'Navigate through the analysis steps using the progress bar above. Click on any completed step to view detailed insights and recommendations.'
                          }
                        </p>
                        
                        {/* Progress Stats */}
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-6">
                          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-blue-600">
                              {steps.filter(step => step.status === 'done').length}
                            </div>
                            <div className="text-sm text-gray-600">Completed</div>
                          </div>
                          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-gray-600">
                              {steps.length}
                            </div>
                            <div className="text-sm text-gray-600">Total Steps</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Version Features Showcase */}
        {isFinalReportComplete() && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                ✨ Want More Advanced Features?
              </h3>
              <p className="text-blue-700 text-sm">
                Upgrade to the full Q Estimation Tool for comprehensive project planning
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">Detailed Estimation</h4>
                </div>
                <p className="text-xs text-blue-700">Per-technology estimates, financial analysis, and discovery deliverables</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">Risk Analysis</h4>
                    </div>
                <p className="text-xs text-blue-700">Risk identification, mitigation strategies, and regulatory compliance</p>
                  </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">Manual Control</h4>
              </div>
                <p className="text-xs text-blue-700">Human oversight, manual steering, and approval workflows</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">Integrations</h4>
                </div>
                <p className="text-xs text-blue-700">Google Slides proposals, HubSpot sync, and workflow automation</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">On-Premise</h4>
                </div>
                <p className="text-xs text-blue-700">Private deployment, open-source AI models, and enhanced security</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-blue-900 text-sm">Advanced Planning</h4>
                </div>
                <p className="text-xs text-blue-700">Per-task estimation, technical roadmaps, and discovery steps</p>
              </div>
            </div>
            
            <div className="text-center">
              <a 
                href="https://q.agency/products/q-estimation-tool/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                Learn About Full Version
              </a>
            </div>
          </div>
        )}


        {/* Disclaimer Modal */}
        {showDisclaimerModal && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Legal Disclaimer</h3>
                  <button
                    onClick={() => setShowDisclaimerModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Document Upload & Usage</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    By uploading documents to this platform, you confirm that you have the necessary rights and permissions to share this information. You agree that uploaded documents may be stored and processed by our platform for analysis purposes.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Confidentiality & Data Handling</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Documents uploaded to this platform are considered public domain with no confidentiality guarantee. We recommend not uploading sensitive, proprietary, or confidential information. The platform is designed for public RFP documents and general project specifications.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Legal Compliance</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    You are responsible for ensuring that your uploads do not violate any applicable laws, regulations, or third-party rights. This includes but is not limited to copyright, trademark, privacy, and data protection laws.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">AI Analysis Disclaimer</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The analysis provided by this platform is generated using artificial intelligence and should be used as a reference tool only. Results are estimates and recommendations based on the information provided. We do not guarantee the accuracy, completeness, or suitability of the analysis for any specific purpose.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Limitation of Liability</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    This platform is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from the use of this platform or reliance on the analysis results.
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                      <button
                  onClick={() => setShowDisclaimerModal(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  I Understand
                      </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
} 