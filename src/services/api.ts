import { config } from '@/lib/config';
import { toast } from 'react-hot-toast';
import { en } from '@/lib/localization';

/**
 * Get ngrok-specific headers if the API URL is an ngrok URL
 */
export const getNgrokHeaders = (apiBaseUrl?: string): Record<string, string> => {
  const apiUrl = apiBaseUrl || config.apiBaseUrl;
  if (apiUrl.includes('ngrok-free.app') || apiUrl.includes('ngrok.io')) {
    return {
      'ngrok-skip-browser-warning': 'true'
    };
  }
  return {};
};

/**
 * Upload a file to the server
 */
export const uploadFile = async (
  file: File,
  sessionId: string,
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  if (file.type !== 'application/pdf') {
    toast.error(en.errors.pleaseUploadPdf);
    return false;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', sessionId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        toast.error(en.errors.uploadFailedWithStatus.replace('{status}', xhr.statusText));
        resolve(false);
      }
    });

    xhr.addEventListener('error', () => {
      toast.error(en.errors.uploadFailedTryAgain);
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `${config.apiBaseUrl}/rfp-upload`);
    
    // Add ngrok header if needed
    const ngrokHeaders = getNgrokHeaders();
    Object.keys(ngrokHeaders).forEach(key => {
      xhr.setRequestHeader(key, ngrokHeaders[key]);
    });
    
    xhr.send(formData);
  });
};

/**
 * Send PDF report to email
 */
export const sendToEmail = async (
  email: string,
  pdfBlob: Blob,
  reportTitle: string = en.pdf.projectEstimationReport,
  fileName?: string
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('pdf', pdfBlob, `${reportTitle}.pdf`);
    if (fileName) {
      formData.append('fileName', fileName);
    }

    const ngrokHeaders = getNgrokHeaders();
    const response = await fetch(`${config.apiBaseUrl}/sendToEmail`, {
      method: 'POST',
      headers: {
        ...ngrokHeaders
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.text();
      toast.success(en.success.reportSentSuccess);
      return true;
    } else {
      toast.error(en.errors.failedToSendReport);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error(en.errors.failedToSendReport);
    return false;
  }
};

/**
 * Send a progress update to a specific session via SSE
 * This uses the new backend session-based messaging system
 */
export const sendProgressUpdate = async (
  message: string,
  sessionId?: string,
  data?: any
): Promise<boolean> => {
  try {
    const payload: any = {
      message,
      ...(data && { data })
    };

    // If sessionId is provided, send targeted message
    // If not provided, it will broadcast to all sessions
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    const response = await fetch(`${config.sseBaseUrl}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('📤 Progress update sent successfully:', payload);
      return true;
    } else {
      console.error('❌ Failed to send progress update:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending progress update:', error);
    return false;
  }
};

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2, 15);
}; 