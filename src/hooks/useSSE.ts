import { useEffect, useRef, useState, useCallback } from 'react';
import { config } from '@/lib/config';
import { StepEvent } from '@/types';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseSSEProps {
  sessionId: string | null;
  onStepUpdate: (stepData: StepEvent) => void;
  onError?: () => void;
  onConnected?: () => void;
  onGeneralError?: (errorData: StepEvent) => void;
}

export const useSSE = ({ sessionId, onStepUpdate, onError, onConnected, onGeneralError }: UseSSEProps) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const connectionEstablishedRef = useRef<boolean>(false);
  const errorCountRef = useRef<number>(0);

  // Use refs for callback functions to prevent useEffect re-runs
  const onStepUpdateRef = useRef(onStepUpdate);
  const onErrorRef = useRef(onError);
  const onConnectedRef = useRef(onConnected);
  const onGeneralErrorRef = useRef(onGeneralError);

  // Update refs when callbacks change
  useEffect(() => {
    onStepUpdateRef.current = onStepUpdate;
  }, [onStepUpdate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    onGeneralErrorRef.current = onGeneralError;
  }, [onGeneralError]);

  useEffect(() => {
    // Only set up the EventSource if we have a session ID
    if (sessionId) {
      // Store the current session ID in the ref
      currentSessionIdRef.current = sessionId;
      connectionEstablishedRef.current = false;
      errorCountRef.current = 0;
      setConnectionState('connecting');
      
      const sseUrl = `${config.sseBaseUrl}/events?sessionId=${sessionId}`;
      console.log('🔌 Creating SSE connection to:', sseUrl);
      
      // Create a new EventSource connection with the session ID
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      // Handle connection established
      eventSource.onopen = () => {
        console.log('✅ SSE connection established (onopen)');
        console.log('📊 EventSource readyState:', eventSource.readyState);
        connectionEstablishedRef.current = true;
        errorCountRef.current = 0;
        setConnectionState('connected');
      };

      // Handle 'connected' event from server
      eventSource.addEventListener('connected', (event) => {
        console.log('🎉 Server confirmed connection (connected event)');
        console.log('📦 Connected event data:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📋 Parsed connected data:', data);
          console.log('🔐 Session isolation active for sessionId:', data.sessionId);
          
          // Validate that the connected sessionId matches our request
          if (data.sessionId && data.sessionId !== currentSessionIdRef.current) {
            console.warn('⚠️ Connected event sessionId mismatch!', {
              expected: currentSessionIdRef.current,
              received: data.sessionId
            });
          }
        } catch (e) {
          console.log('⚠️ Could not parse connected event data');
        }
        connectionEstablishedRef.current = true;
        errorCountRef.current = 0;
        setConnectionState('connected');
        onConnectedRef.current?.();
      });

      // Handle heartbeat events
      eventSource.addEventListener('heartbeat', (event) => {
        const timestamp = new Date().toISOString();
        console.log('💓 Heartbeat received at:', timestamp);
        console.log('📦 Heartbeat data:', event.data);
        
        try {
          // Parse heartbeat data to validate sessionId if provided
          const heartbeatData = JSON.parse(event.data);
          console.log('💗 Parsed heartbeat data:', heartbeatData);
          
          // Validate sessionId if present in heartbeat
          if (heartbeatData.sessionId && heartbeatData.sessionId !== currentSessionIdRef.current) {
            console.log('⚠️ Heartbeat sessionId mismatch, ignoring');
            return;
          }
        } catch (e) {
          // Heartbeat might not have JSON data, that's okay
          console.log('💓 Heartbeat without JSON data (legacy format)');
        }
        
        setLastHeartbeat(new Date());
        // Ensure we're still marked as connected
        if (connectionEstablishedRef.current) {
          setConnectionState('connected');
        }
      });

      eventSource.addEventListener('step', (event) => {
        try {
          const data: StepEvent = JSON.parse(event.data);
          
          // Only process events for the current session
          if (currentSessionIdRef.current !== sessionId) {
            console.log('⚠️ Ignoring event for different session');
            return;
          }
          
          // Log the received data
          console.log('📨 Received SSE step data:', data);
          
          // Handle general_error specifically
          if (data.step === 'general_error') {
            // Call the general error callback if provided
            onGeneralErrorRef.current?.(data);
            
            // Close the connection immediately
            eventSource.close();
            setConnectionState('disconnected');
            connectionEstablishedRef.current = false;
            return;
          }
          
          // Call the callback with the step data for regular steps
          onStepUpdateRef.current(data);
        } catch (error) {
          console.error('❌ Error parsing SSE step data:', error);
        }
      });

      // Comprehensive error handling
      eventSource.onerror = (error) => {
        errorCountRef.current += 1;
        console.error('🚨 SSE connection error #' + errorCountRef.current + ':', error);
        console.log('📊 EventSource readyState:', eventSource.readyState);
        console.log('🔗 Connection was established:', connectionEstablishedRef.current);
        console.log('🌐 SSE URL:', sseUrl);
        
        // Log readyState meanings
        const readyStateNames: Record<number, string> = {
          [EventSource.CONNECTING]: 'CONNECTING',
          [EventSource.OPEN]: 'OPEN', 
          [EventSource.CLOSED]: 'CLOSED'
        };
        console.log('📡 ReadyState meaning:', readyStateNames[eventSource.readyState] || 'UNKNOWN');
        
        // Handle different error scenarios
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔒 SSE connection was permanently closed');
          setConnectionState('disconnected');
          connectionEstablishedRef.current = false;
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('🔄 SSE attempting to reconnect...');
          // Only set connecting if we've had a successful connection before
          // or if this is the first few attempts
          if (connectionEstablishedRef.current || errorCountRef.current <= 3) {
            setConnectionState('connecting');
          } else {
            console.log('🚫 Too many failed attempts, marking as disconnected');
            setConnectionState('disconnected');
            connectionEstablishedRef.current = false;
          }
        } else {
          console.log('❓ Unknown SSE error state');
          setConnectionState('disconnected');
          connectionEstablishedRef.current = false;
        }
        
        onErrorRef.current?.();
      };

      return () => {
        console.log('🧹 Cleaning up SSE connection');
        connectionEstablishedRef.current = false;
        errorCountRef.current = 0;
        setConnectionState('disconnected');
        eventSource.close();
      };
    } else {
      console.log('🚫 No sessionId provided, SSE disconnected');
      setConnectionState('disconnected');
      connectionEstablishedRef.current = false;
      errorCountRef.current = 0;
    }
  }, [sessionId]); // Only depend on sessionId

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('👋 Manually closing SSE connection');
      connectionEstablishedRef.current = false;
      errorCountRef.current = 0;
      eventSourceRef.current.close();
      setConnectionState('disconnected');
    }
  }, []);

  return { 
    closeConnection, 
    connectionState, 
    lastHeartbeat 
  };
}; 