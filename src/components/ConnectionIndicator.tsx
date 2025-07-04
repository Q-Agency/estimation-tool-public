import { useLocalization } from '@/lib/localization';

interface ConnectionIndicatorProps {
  connectionState: 'disconnected' | 'connecting' | 'connected';
  lastHeartbeat?: Date | null;
  isAnalysisComplete?: boolean;
  sessionId?: string | null;
}

export const ConnectionIndicator = ({ connectionState, lastHeartbeat, isAnalysisComplete, sessionId }: ConnectionIndicatorProps) => {
  const { t } = useLocalization();
  const getStatusConfig = () => {
    // Show completed state if analysis is done, regardless of connection state
    if (isAnalysisComplete) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        text: t.connection.analysisComplete,
        pulse: false
      };
    }

    switch (connectionState) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          text: t.connection.connected,
          pulse: false
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          text: t.connection.connecting,
          pulse: true
        };
      case 'disconnected':
      default:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          text: t.connection.disconnected,
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const formatLastHeartbeat = () => {
    if (!lastHeartbeat) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastHeartbeat.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      return `${diffMinutes}m ago`;
    }
  };

  const formatSessionId = (id: string) => {
    // Show first 6 characters for readability
    return id.length > 6 ? `${id.substring(0, 6)}...` : id;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${config.color} ${config.bgColor} ${config.borderColor} ${config.pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-1.5">
        {config.icon}
        <span>{config.text}</span>
        {sessionId && (
          <span className="text-xs opacity-75 font-mono">
            [{formatSessionId(sessionId)}]
          </span>
        )}
      </div>
      {connectionState === 'connected' && lastHeartbeat && !isAnalysisComplete && (
        <span className="text-xs opacity-75">
          • {formatLastHeartbeat()}
        </span>
      )}
    </div>
  );
}; 