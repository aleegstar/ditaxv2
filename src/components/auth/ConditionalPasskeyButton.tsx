
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';

interface ConditionalPasskeyButtonProps {
  onSuccess?: () => void;
  className?: string;
  email?: string;
}

export const ConditionalPasskeyButton: React.FC<ConditionalPasskeyButtonProps> = ({
  onSuccess,
  className,
  email,
}) => {
  const { isSupported, isLoading, authenticateWithPasskey, checkPasskeysForEmail } = useEnhancedWebAuthn();
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [checkingPasskeys, setCheckingPasskeys] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const checkForPasskeys = async () => {
    debug.log('🔍 ConditionalPasskeyButton: Starting passkey check...');
    
    if (!isSupported) {
      debug.log('❌ ConditionalPasskeyButton: WebAuthn not supported');
      setCheckingPasskeys(false);
      setDebugInfo('WebAuthn not supported');
      return;
    }

    setCheckingPasskeys(true);
    
    try {
      if (email) {
        // Check passkeys for specific email
        const passkeyCheck = await checkPasskeysForEmail(email);
        debug.log('🔑 ConditionalPasskeyButton: Found passkeys for email:', passkeyCheck);
        
        setHasPasskeys(passkeyCheck.has_passkeys);
        setDebugInfo(`Email: ${email.slice(0, 8)}..., Passkeys: ${passkeyCheck.passkey_count}`);
      } else {
        // Check passkeys for current user (authenticated)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          debug.log('❌ ConditionalPasskeyButton: No user found', userError);
          setDebugInfo(`No user: ${userError?.message || 'Not authenticated'}`);
          setHasPasskeys(false);
          return;
        }

        debug.log('👤 ConditionalPasskeyButton: Current user ID:', user.id);

        // Check passkeys directly in database for authenticated user
        const { data: dbPasskeys, error: dbError } = await supabase
          .from('user_passkeys')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        debug.log('🗄️ ConditionalPasskeyButton: DB passkeys check:', dbPasskeys?.length || 0, dbError);
        
        setHasPasskeys((dbPasskeys?.length || 0) > 0);
        setDebugInfo(`User: ${user.id.slice(0, 8)}..., Passkeys: ${dbPasskeys?.length || 0}`);
      }
      
    } catch (error) {
      debug.error('❌ ConditionalPasskeyButton: Error checking passkeys:', error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHasPasskeys(false);
    } finally {
      setCheckingPasskeys(false);
    }
  };

  useEffect(() => {
    checkForPasskeys();
  }, [isSupported, email, checkPasskeysForEmail]);

  const handlePasskeyAuth = async () => {
    if (!email) {
      debug.error('❌ ConditionalPasskeyButton: No email provided for authentication');
      return;
    }

    try {
      debug.log('🚀 ConditionalPasskeyButton: Starting authentication for:', email);
      await authenticateWithPasskey(email);
      onSuccess?.();
    } catch (error) {
      debug.error('❌ ConditionalPasskeyButton: Authentication error:', error);
    }
  };

  const handleRefreshPasskeys = () => {
    debug.log('🔄 ConditionalPasskeyButton: Manual refresh triggered');
    checkForPasskeys();
  };

  if (!isSupported || checkingPasskeys) {
    return (
      <div className="w-full text-center text-sm text-muted-foreground">
        {!isSupported && (
          <div>
            <AlertCircle className="inline h-4 w-4 mr-2" />
            WebAuthn nicht unterstützt
          </div>
        )}
        {checkingPasskeys && (
          <div>
            <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
            Prüfe Fingerprint-Verfügbarkeit...
          </div>
        )}
      </div>
    );
  }

  if (!hasPasskeys) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled
          className={`${className} opacity-50`}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Kein Fingerprint eingerichtet
        </Button>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Debug: {debugInfo}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefreshPasskeys}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handlePasskeyAuth}
        disabled={isLoading || !email}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Authentifizierung...' : 'Mit Fingerprint anmelden'}
      </Button>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Debug: {debugInfo}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefreshPasskeys}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
