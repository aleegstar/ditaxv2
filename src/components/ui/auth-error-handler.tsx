
import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthErrorHandlerProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
}

export const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  error,
  onRetry,
  isRetrying = false,
  retryCount = 0
}) => {
  const isTimeoutError = error.includes('timeout') || error.includes('504') || error.includes('deadline exceeded');
  const isNetworkError = error.includes('network') || error.includes('fetch');
  
  const getErrorMessage = () => {
    if (isTimeoutError) {
      return {
        title: 'Verbindungsproblem',
        description: 'Der Authentifizierungsservice ist momentan überlastet. Bitte versuchen Sie es in wenigen Sekunden erneut.',
        icon: <WifiOff className="w-5 h-5" />
      };
    }
    
    if (isNetworkError) {
      return {
        title: 'Netzwerkfehler',
        description: 'Überprüfe deine Internetverbindung und versuche es erneut.',
        icon: <Wifi className="w-5 h-5" />
      };
    }
    
    return {
      title: 'Anmeldefehler',
      description: error,
      icon: <AlertCircle className="w-5 h-5" />
    };
  };

  const errorInfo = getErrorMessage();
  const canRetry = retryCount < 3 && (isTimeoutError || isNetworkError);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-800 text-sm">
          {errorInfo.icon}
          {errorInfo.title}
        </CardTitle>
        <CardDescription className="text-red-600 text-xs">
          {errorInfo.description}
        </CardDescription>
      </CardHeader>
      {canRetry && (
        <CardContent className="pt-0">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="w-full text-red-700 border-red-200 hover:bg-red-100"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Wird wiederholt...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Erneut versuchen ({retryCount + 1}/3)
              </>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
