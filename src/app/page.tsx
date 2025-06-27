'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { config, validateConfig } from '@/lib/config';
import { convertMarkupToHtml } from '@/utils/markupConverter';
import { DevelopmentPlanDisplay } from '@/components/DevelopmentPlanDisplay';
import { useSSE } from '@/hooks/useSSE';
import { useEstimationSteps } from '@/hooks/useEstimationSteps';
import { EmailFormData, DevelopmentPlan, UploadResponse } from '@/types';

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
  
  // Filtering and sorting state
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const scopeItemsRef = useRef<any[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);

  // Custom hooks
  const {
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
    setIsProcessing
  } = useEstimationSteps();

  // SSE connection
  useSSE({
    sessionId,
    onStepUpdate: updateStepFromSSEData,
    onError: () => setIsProcessing(false)
  });

  // Validate configuration on mount
  useEffect(() => {
    validateConfig();
  }, []);

  // Scroll to active step when it changes
  useEffect(() => {
    if (stepsRef.current) {
      const activeStepElement = stepsRef.current.children[activeStepIndex] as HTMLElement;
      if (activeStepElement) {
        activeStepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeStepIndex]);

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
      confirmText: 'Upload Different RFP',
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

      // Send request to server-side PDF generation and email
      const response = await fetch('/api/generate-pdf', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: finalReportStep.details,
          email: emailFormData.email,
          options: {
            title: 'Project Estimation Report',
            filename: pdfFilename,
            rfpFileName: uploadedFileName || 'Unknown RFP',
            includeBackground: true
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Email sent successfully:', result);
        toast.dismiss();
        toast.success('Professional report sent successfully!');
        setEmailFormData({ email: '', isSubmitting: false });
        setShowEmailForm(false);
      } else {
        const errorData = await response.json();
        console.error('Email sending failed:', errorData);
        toast.dismiss();
        toast.error(`Failed to send report: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.dismiss();
      toast.error('Failed to send report. Please try again.');
    } finally {
      setEmailFormData({ ...emailFormData, isSubmitting: false });
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
      
      {/* Custom Confirmation Modal */}
      {showConfirmation && confirmationConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmationConfig.isDangerous ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {confirmationConfig.isDangerous ? (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                      ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
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
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img 
                  src="/Q.png" 
                  alt="Q Logo" 
                  className="h-8 w-auto mr-3"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-bold text-gray-900">AI Estimation Tool</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {analysisStarted && !isUploading && (
                <>
                  <button
                    onClick={handleRestartAnalysis}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    New Analysis
                  </button>
                  <button
                    onClick={handleUploadDifferentRFP}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Upload Different RFP
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {!uploadedFileName && !isFileValidated && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Get Instant Project Estimates
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your RFP document and receive comprehensive AI-powered project estimation with detailed analysis, team recommendations, and development timelines.
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                isHovered
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-6">
                <div className="text-6xl">📄</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Upload Your RFP Document
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <div className="text-sm text-gray-500 mb-6">
                    <div className="flex items-center justify-center space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        PDF files only
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Max 5MB
                      </span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose File
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Validated - Ready to Start Analysis */}
        {isFileValidated && !analysisStarted && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  File Uploaded Successfully!
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center space-x-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                                         <div>
                       <p className="font-medium text-gray-900">{uploadedFileName}</p>
                       <div className="flex items-center space-x-2 text-sm text-gray-600">
                         <span>PDF validated and ready for analysis</span>
                         {/* Show file size if available */}
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
                
                <div className="space-y-4 mb-8">
                  <p className="text-lg text-gray-600">
                    Your RFP document has been successfully uploaded and validated.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>What happens next:</strong> Our AI will analyze your document through 7 comprehensive steps including scope analysis, team composition, effort estimation, and detailed project planning.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={startAnalysis}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-lg"
                  >
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start RFP Analysis
                  </button>
                  
                  <button
                    onClick={resetUpload}
                    className="inline-flex items-center px-6 py-4 border border-gray-300 text-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {/* Professional loading spinner and status */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="loading-spinner-lg"></div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900">
                      Uploading Your Document
                    </p>
                    <p className="text-sm text-gray-600">
                      Please wait...
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Uploading {uploadedFileName}...
                </span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300 animate-pulse-glow"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Progress Bar */}
        {analysisStarted && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Analysis Progress</h3>
                  <p className="text-sm text-gray-600">
                    {isProcessing ? 'Analyzing your RFP document...' : 'Analysis complete!'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">
                    {Math.round((steps.filter(step => step.status === 'done').length / steps.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {steps.filter(step => step.status === 'done').length} of {steps.length} steps
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(steps.filter(step => step.status === 'done').length / steps.length) * 100}%` 
                  }}
                ></div>
              </div>
              
              {/* Step Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`text-center p-2 rounded-lg transition-all duration-300 ${
                      step.status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : step.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : step.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="text-lg mb-1">
                      {step.status === 'done' ? '✅' : 
                       step.status === 'in_progress' ? '🔄' : 
                       step.status === 'error' ? '❌' : '⏳'}
                    </div>
                    <div className="text-xs font-medium">{step.title}</div>
                  </div>
                ))}
              </div>
              
              {/* Current Step Indicator */}
              {isProcessing && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm font-medium text-blue-800">
                      Currently processing: {steps.find(step => step.status === 'in_progress')?.title || 'Starting analysis...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {analysisStarted && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Steps Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
                  {isProcessing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  )}
                </div>
                
                <div ref={stepsRef} className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      onClick={() => handleStepClick(step)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedStep?.id === step.id
                          ? 'border-indigo-300 bg-indigo-50'
                          : step.status === 'done'
                          ? 'bg-green-50 border-green-200 hover:border-green-300'
                          : step.status === 'in_progress'
                          ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                          : step.status === 'error'
                          ? 'bg-red-50 border-red-200 hover:border-red-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 text-sm">{step.title}</span>
                        <span className="text-xs">
                          {step.status === 'done' ? '✅' : 
                           step.status === 'in_progress' ? '🔄' : 
                           step.status === 'error' ? '❌' : '⏳'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedStep && isDetailsOpen ? (
                <div className="bg-white rounded-lg shadow-sm border">
                  {/* Step Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedStep.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{selectedStep.description}</p>
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
                    {selectedStep.details ? (
                      <div 
                        className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ 
                          __html: convertMarkupToHtml(selectedStep.details) 
                        }}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-4">
                          {selectedStep.status === 'pending' ? '⏳' :
                           selectedStep.status === 'in_progress' ? '🔄' : 
                           selectedStep.status === 'error' ? '❌' : '✅'}
                        </div>
                        <p className="text-gray-600">
                          {selectedStep.status === 'pending' ? 'Waiting to start...' :
                           selectedStep.status === 'in_progress' ? 'Analysis in progress...' :
                           selectedStep.status === 'error' ? 'Step failed - check details below' :
                           'Analysis complete!'}
                        </p>
                      </div>
                    )}

                    {/* Development Plan Display */}
                    {selectedStep.id === 'development_plan' && selectedStep.details && (
                      <div className="mt-8 border-t pt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Plan Breakdown</h3>
                        {(() => {
                          try {
                            const planData = JSON.parse(selectedStep.details);
                            return <DevelopmentPlanDisplay plan={planData} />;
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    )}

                    {/* Tech Stack Display */}
                    {selectedStep.tech_stack && (
                      <div className="mt-8 border-t pt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Tech Stack</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(selectedStep.tech_stack).map(([key, value]) => {
                            if (Array.isArray(value) && value.length > 0) {
                              return (
                                <div key={key} className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 capitalize mb-2">
                                    {key.replace('_', ' ')}
                                  </h4>
                                  <ul className="space-y-1">
                                    {value.map((item, index) => (
                                      <li key={index} className="text-sm text-gray-600 flex items-center">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2"></span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            } else if (typeof value === 'string' && value) {
                              return (
                                <div key={key} className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="font-medium text-gray-900 capitalize mb-2">
                                    {key.replace('_', ' ')}
                                  </h4>
                                  <p className="text-sm text-gray-600">{value}</p>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Analysis in Progress
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Your RFP document is being analyzed. Click on any step in the sidebar to view detailed results as they become available.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isFinalReportComplete() && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Analysis Complete! 🎉
              </h3>
              <p className="text-gray-600 mb-6">
                Your project estimation is ready. Export the report or send it via email.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
                
                {!showEmailForm ? (
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Report
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="email"
                      value={emailFormData.email}
                      onChange={handleEmailChange}
                      placeholder="Enter your email address"
                      className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleEmailSubmit}
                        disabled={emailFormData.isSubmitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {emailFormData.isSubmitting ? 'Sending...' : 'Send'}
                      </button>
                      <button
                        onClick={() => setShowEmailForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 