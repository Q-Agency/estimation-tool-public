import { useEffect, useRef } from 'react';
import { config } from '@/lib/config';
import { StepEvent, Step } from '@/types';

interface UseSSEProps {
  sessionId: string | null;
  onStepUpdate: (stepData: StepEvent) => void;
  onError?: () => void;
}

export const useSSE = ({ sessionId, onStepUpdate, onError }: UseSSEProps) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

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
          
          // Call the callback with the step data
          onStepUpdate(data);
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      });

      // Add error event listener for step-specific errors
      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const data: StepEvent = JSON.parse(event.data);
          
          // Only process events for the current session
          if (currentSessionIdRef.current !== sessionId) {
            console.log('Ignoring error event for different session');
            return;
          }
          
          // Log the error data
          console.error('Received SSE error event:', data);
          
          // Call the callback with the error data
          onStepUpdate(data);
        } catch (error) {
          console.error('Error parsing SSE error data:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        if (onError) {
          onError();
        }
      };

      return () => {
        eventSource.close();
      };
    }
  }, [sessionId, onStepUpdate, onError]);

  const closeConnection = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  return { closeConnection };
}; 