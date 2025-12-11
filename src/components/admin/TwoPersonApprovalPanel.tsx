/**
 * Two-Person Approval Panel
 * 
 * Admin UI for managing approval requests
 * Shows pending, approved, and rejected requests
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TwoPersonApprovalService, AdminActionRequest } from '@/services/TwoPersonApprovalService';
import { AlertCircle, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TwoPersonApprovalPanel: React.FC = () => {
  const [requests, setRequests] = useState<AdminActionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AdminActionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const approvalService = TwoPersonApprovalService.getInstance();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await approvalService.getAllRequests(50);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Fehler',
        description: 'Anfragen konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approvalService.approveAction(requestId);
      toast({
        title: 'Genehmigt',
        description: 'Die Anfrage wurde erfolgreich genehmigt',
      });
      loadRequests();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleRejectClick = (request: AdminActionRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      await approvalService.rejectAction(selectedRequest.id, rejectionReason);
      toast({
        title: 'Abgelehnt',
        description: 'Die Anfrage wurde abgelehnt',
      });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      pending: {
        variant: 'default',
        icon: <Clock className="w-3 h-3 mr-1" />,
        label: 'Ausstehend'
      },
      approved: {
        variant: 'default',
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        label: 'Genehmigt'
      },
      rejected: {
        variant: 'destructive',
        icon: <XCircle className="w-3 h-3 mr-1" />,
        label: 'Abgelehnt'
      },
      executed: {
        variant: 'default',
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        label: 'Ausgeführt'
      },
      expired: {
        variant: 'secondary',
        icon: <AlertCircle className="w-3 h-3 mr-1" />,
        label: 'Abgelaufen'
      }
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Clock className="w-6 h-6 animate-spin" />
          <span className="ml-2">Lädt...</span>
        </div>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">2-Personen-Genehmigung</h2>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Ausstehende Genehmigungen</h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="p-6 border-2 border-yellow-200 bg-yellow-50/50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">
                        {approvalService.getActionTypeLabel(request.action_type)}
                      </h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Ressource:</strong> {request.target_resource}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Angefordert:</strong> {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-1">Begründung:</p>
                  <p className="text-sm text-gray-700">{request.justification}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(request.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                  <Button
                    onClick={() => handleRejectClick(request)}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Ablehnen
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Requests */}
      {otherRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Verlauf</h3>
          <div className="space-y-3">
            {otherRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">
                        {approvalService.getActionTypeLabel(request.action_type)}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.target_resource} • {formatDate(request.created_at)}
                    </p>
                    {request.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">
                        <strong>Grund:</strong> {request.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Keine Genehmigungsanfragen vorhanden</p>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
            <DialogDescription>
              Bitte gib einen Grund für die Ablehnung an (mindestens 5 Zeichen).
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Grund für die Ablehnung..."
            rows={4}
            className="mb-4"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectionReason.length < 5}
            >
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TwoPersonApprovalPanel;
