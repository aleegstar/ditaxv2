
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';

interface WebAuthnDebugProps {
  className?: string;
}

export const WebAuthnDebug: React.FC<WebAuthnDebugProps> = ({ className }) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [passkeysInfo, setPasskeysInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const checkWebAuthnSupport = () => {
    const checks = [
      {
        name: 'PublicKeyCredential verfügbar',
        status: typeof window !== 'undefined' && window.PublicKeyCredential !== undefined,
        description: 'Browser unterstützt WebAuthn API'
      },
      {
        name: 'navigator.credentials verfügbar',
        status: typeof navigator !== 'undefined' && typeof navigator.credentials !== 'undefined',
        description: 'Credential Management API ist verfügbar'
      },
      {
        name: 'navigator.credentials.create verfügbar',
        status: typeof navigator !== 'undefined' && 
                 typeof navigator.credentials !== 'undefined' && 
                 typeof navigator.credentials.create === 'function',
        description: 'Kann neue Credentials erstellen'
      },
      {
        name: 'HTTPS Connection',
        status: typeof window !== 'undefined' && 
                (window.location.protocol === 'https:' || window.location.hostname === 'localhost'),
        description: 'Sichere Verbindung erforderlich für WebAuthn'
      }
    ];

    return checks;
  };

  const loadDebugInfo = async () => {
    setLoading(true);
    debug.log('🔍 WebAuthnDebug: Loading debug info...');
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        debug.log('❌ WebAuthnDebug: No user found');
        setUserInfo(null);
        setPasskeysInfo([]);
        return;
      }

      debug.log('👤 WebAuthnDebug: User found:', user.id);
      setUserInfo(user);

      // Load passkeys from database
      const { data: passkeys, error: passkeysError } = await supabase
        .from('user_passkeys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (passkeysError) {
        debug.error('❌ WebAuthnDebug: Error loading passkeys:', passkeysError);
        setPasskeysInfo([]);
      } else {
        debug.log('🔑 WebAuthnDebug: Loaded passkeys:', passkeys);
        setPasskeysInfo(passkeys || []);
      }
      
    } catch (error) {
      debug.error('❌ WebAuthnDebug: Error in loadDebugInfo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const getBrowserInfo = () => {
    if (typeof navigator === 'undefined') return 'Unbekannt';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Anderer Browser';
  };

  const getDeviceInfo = () => {
    if (typeof navigator === 'undefined') return 'Unbekannt';
    
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Unbekanntes System';
  };

  const checks = checkWebAuthnSupport();
  const allSupported = checks.every(check => check.status);
  const browser = getBrowserInfo();
  const device = getDeviceInfo();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          WebAuthn Support Debug
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDebugInfo}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Überprüfung der Fingerprint/Passkey Unterstützung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* User Info */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Benutzer-Session:</h4>
          {userInfo ? (
            <div className="text-sm space-y-1">
              <div><strong>User ID:</strong> {userInfo.id}</div>
              <div><strong>Email:</strong> {userInfo.email || 'Nicht verfügbar'}</div>
              <div><strong>Erstellt:</strong> {new Date(userInfo.created_at).toLocaleString('de-DE')}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Keine Benutzer-Session gefunden</div>
          )}
        </div>

        {/* Passkeys Info */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Registrierte Passkeys:</h4>
          {passkeysInfo.length > 0 ? (
            <div className="space-y-2">
              {passkeysInfo.map((passkey, index) => (
                <div key={passkey.id} className="text-sm p-2 bg-background rounded border">
                  <div><strong>#{index + 1}:</strong> {passkey.device_name}</div>
                  <div><strong>Status:</strong> {passkey.is_active ? 'Aktiv' : 'Inaktiv'}</div>
                  <div><strong>Erstellt:</strong> {new Date(passkey.created_at).toLocaleString('de-DE')}</div>
                  {passkey.last_used_at && (
                    <div><strong>Zuletzt verwendet:</strong> {new Date(passkey.last_used_at).toLocaleString('de-DE')}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Keine Passkeys gefunden</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Browser:</span> {browser}
          </div>
          <div>
            <span className="font-medium">System:</span> {device}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Support-Checks:</h4>
          {checks.map((check, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {check.status ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={check.status ? 'text-green-700' : 'text-red-700'}>
                {check.name}
              </span>
              <Badge variant={check.status ? 'secondary' : 'destructive'} className="text-xs">
                {check.status ? 'OK' : 'Fehlt'}
              </Badge>
            </div>
          ))}
        </div>

        {allSupported ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              WebAuthn wird unterstützt! Du kannst Passkeys verwenden.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              WebAuthn wird nicht vollständig unterstützt. Möglicherweise fehlt die HTTPS-Verbindung oder Ihr Browser unterstützt die Funktion nicht.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Hinweise:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>WebAuthn funktioniert nur über HTTPS (außer localhost)</li>
            <li>Nicht alle Browser/Geräte unterstützen Fingerprint-Sensoren</li>
            <li>Du musst zuerst einen Passkey registrieren, bevor du dich damit anmelden kannst</li>
            <li>Mobile Geräte benötigen Touch ID/Face ID oder Fingerprint-Setup im System</li>
            <li>Manchmal ist ein Browser-Neustart nach der Passkey-Registrierung erforderlich</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
