/**
 * Admin Approval Dashboard
 * 
 * Central dashboard for managing two-person approval workflow
 * Shows pending requests, approval history, and integrity checks
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ImmutableAuditService, IntegrityCheckResult } from '@/services/ImmutableAuditService';
import TwoPersonApprovalPanel from './TwoPersonApprovalPanel';
import { Shield, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const AdminApprovalDashboard: React.FC = () => {
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const { toast } = useToast();
  const auditService = ImmutableAuditService.getInstance();

  const handleIntegrityCheck = async () => {
    try {
      setCheckingIntegrity(true);
      const result = await auditService.verifyIntegrity();
      setIntegrityResult(result);

      if (result.integrity_valid) {
        toast({
          title: 'Integritätsprüfung bestanden',
          description: `${result.total_logs} Audit-Logs überprüft, keine Manipulationen erkannt`,
        });
      } else {
        toast({
          title: 'Integritätsproblem erkannt',
          description: `${result.mismatches} Hash-Abweichungen in ${result.total_logs} Logs gefunden`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Integritätsprüfung fehlgeschlagen',
        variant: 'destructive'
      });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Sicherheits-Dashboard</h1>
            <p className="text-muted-foreground">
              2-Personen-Genehmigung & Audit-Log-Integrität
            </p>
          </div>
        </div>

        <Button
          onClick={handleIntegrityCheck}
          disabled={checkingIntegrity}
          variant="outline"
          className="gap-2"
        >
          {checkingIntegrity ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Prüfe...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Integrität prüfen
            </>
          )}
        </Button>
      </div>

      {/* Integrity Status Card */}
      {integrityResult && (
        <Card className={`p-6 ${integrityResult.integrity_valid ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <div className="flex items-start gap-4">
            {integrityResult.integrity_valid ? (
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {integrityResult.integrity_valid ? 'Integritätsprüfung bestanden ✅' : 'Integritätsproblem erkannt ⚠️'}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Geprüfte Logs</p>
                  <p className="text-xl font-bold">{integrityResult.total_logs}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Abweichungen</p>
                  <p className="text-xl font-bold">{integrityResult.mismatches}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Zuletzt geprüft</p>
                  <p className="text-sm">
                    {new Date(integrityResult.checked_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
              {!integrityResult.integrity_valid && (
                <p className="mt-4 text-red-700 text-sm">
                  ⚠️ <strong>Warnung:</strong> Audit-Logs wurden möglicherweise manipuliert. 
                  Bitte überprüfen Sie die Logs und kontaktieren Sie den Security-Administrator.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="approvals">Genehmigungen</TabsTrigger>
          <TabsTrigger value="info">System-Info</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-6">
          <TwoPersonApprovalPanel />
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sicherheitssystem-Informationen</h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium text-green-700">✅ Immutable Audit-Logs</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Alle Sicherheitsereignisse werden in einer unveränderlichen Log-Chain gespeichert.
                  Jeder Eintrag ist mit dem vorherigen verknüpft (Blockchain-Prinzip).
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-blue-700">🔐 2-Personen-Regel</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Kritische Admin-Aktionen (Dokumenten-Entschlüsselung, Benutzer-Löschung) 
                  benötigen die Genehmigung eines zweiten Administrators.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium text-purple-700">🛡️ Feld-Verschlüsselung</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Sensible Felder (SSN, Bankdaten, Steuer-ID) werden auf Feldebene verschlüsselt.
                  Jedes Feld hat einen eigenen IV für maximale Sicherheit.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-medium text-orange-700">⏱️ Token-Verwaltung</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  JWT-Tokens haben kurze Lebensdauer (15 Minuten Access-Token).
                  Automatische Rotation und Re-Authentication für kritische Aktionen.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-2">Compliance Status</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>GDPR Art. 32 (Sicherheit)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Audit Trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Tamper Detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Access Control</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminApprovalDashboard;
