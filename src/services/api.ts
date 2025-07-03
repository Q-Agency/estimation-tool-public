import { config } from '@/lib/config';
import { toast } from 'react-hot-toast';

/**
 * Upload a file to the server
 */
export const uploadFile = async (
  file: File,
  sessionId: string,
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  if (file.type !== 'application/pdf') {
    toast.error('Please upload a PDF file');
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
        toast.error(`Upload failed: ${xhr.statusText}`);
        resolve(false);
      }
    });

    xhr.addEventListener('error', () => {
      toast.error('Upload failed. Please try again.');
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `${config.apiBaseUrl}/rfp-upload`);
    xhr.send(formData);
  });
};

/**
 * Send PDF report to email
 */
export const sendToEmail = async (
  email: string,
  pdfBlob: Blob,
  reportTitle: string = 'Estimation Report',
  fileName?: string
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('pdf', pdfBlob, `${reportTitle}.pdf`);
    if (fileName) {
      formData.append('fileName', fileName);
    }

    const response = await fetch(`${config.apiBaseUrl}/sendToEmail`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.text();
      toast.success('Report sent successfully!');
      return true;
    } else {
      toast.error('Failed to send report. Please try again.');
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error('Failed to send report. Please try again.');
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