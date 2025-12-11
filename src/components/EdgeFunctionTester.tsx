
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";


interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

export const EdgeFunctionTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runComprehensiveTest = async () => {
    setTesting(true);
    setResults([]);
    const testResults: TestResult[] = [];

    // Test 1: Basic Connectivity using Supabase client
    try {
      console.log('[TEST] Testing basic Edge Function connectivity...');
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        method: 'GET'
      });

      if (error) {
        testResults.push({
          test: 'Basic Connectivity',
          success: false,
          message: `Error: ${error.message}`
        });
      } else {
        testResults.push({
          test: 'Basic Connectivity',
          success: true,
          message: 'Edge Function ist erreichbar',
          data
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Basic Connectivity',
        success: false,
        message: `Netzwerkfehler: ${error.message}`
      });
    }

    // Test 2: Supabase Client Method
    try {
      console.log('[TEST] Testing Supabase client invoke method...');
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        method: 'GET'
      });
      
      if (error) {
        testResults.push({
          test: 'Supabase Client Invoke',
          success: false,
          message: `Supabase Error: ${error.message}`
        });
      } else {
        testResults.push({
          test: 'Supabase Client Invoke',
          success: true,
          message: 'Supabase Client funktioniert korrekt',
          data
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Supabase Client Invoke',
        success: false,
        message: `Client Fehler: ${error.message}`
      });
    }

    // Test 3: Authentication Check
    try {
      console.log('[TEST] Testing authentication...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        testResults.push({
          test: 'Authentication Check',
          success: false,
          message: `Session Fehler: ${sessionError.message}`
        });
      } else if (!session) {
        testResults.push({
          test: 'Authentication Check',
          success: false,
          message: 'Keine aktive Session gefunden'
        });
      } else {
        testResults.push({
          test: 'Authentication Check',
          success: true,
          message: `Benutzer authentifiziert: ${session.user.email}`,
          data: {
            userId: session.user.id,
            tokenLength: session.access_token.length
          }
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Authentication Check',
        success: false,
        message: `Auth Fehler: ${error.message}`
      });
    }

    // Test 4: Payment Function with Auth
    try {
      console.log('[TEST] Testing payment function with authentication...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            taxYear: '2028',
            amount: 50,
            items: [{ label: 'Test', amount: 50 }]
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (error) {
          testResults.push({
            test: 'Payment Function Test',
            success: false,
            message: `Payment Error: ${error.message}`
          });
        } else {
          testResults.push({
            test: 'Payment Function Test',
            success: true,
            message: 'Payment Function erfolgreich aufgerufen',
            data
          });
        }
      } else {
        testResults.push({
          test: 'Payment Function Test',
          success: false,
          message: 'Keine Session für Payment Test verfügbar'
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Payment Function Test',
        success: false,
        message: `Payment Test Fehler: ${error.message}`
      });
    }

    setResults(testResults);
    setTesting(false);

    // Show summary toast
    const successful = testResults.filter(r => r.success).length;
    const total = testResults.length;
    
    if (successful === total) {
      toast.success(`Alle Tests erfolgreich (${successful}/${total})`);
    } else {
      toast.error(`${total - successful} von ${total} Tests fehlgeschlagen`);
    }
  };

  const getTestIcon = (success: boolean) => {
    return success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <Card variant="glass" className="max-w-2xl mx-auto rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Edge Function Diagnose
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={runComprehensiveTest} 
            disabled={testing}
            className="w-full"
            variant="login"
          >
            {testing ? (
              <>
                <span className="ml-2">Teste alle Komponenten...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Umfassende Diagnose starten
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Test Ergebnisse:</h3>
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border backdrop-blur-sm ${
                    result.success 
                      ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTestIcon(result.success)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  <p className="text-sm">{result.message}</p>
                  {result.data && (
                    <pre className="text-xs mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Nächste Schritte bei Fehlern:</span>
            </div>
            <ul className="text-sm space-y-1">
              <li>• Bei "Failed to send request": Edge Function ist nicht deployed</li>
              <li>• Bei HTTP 500: Überprüfen Sie die Edge Function Logs</li>
              <li>• Bei Auth Fehlern: Neu anmelden und erneut testen</li>
              <li>• Bei CORS Fehlern: Browser Cache leeren</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
