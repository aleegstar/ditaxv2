import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, User, Calendar, Mail, Globe, FileText, Hash, Download, Shield } from 'lucide-react';

interface SignatureData {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_date_of_birth?: string;
  signed_at: string;
  ip_address?: string;
  user_agent?: string;
  document_hash: string;
  signature_hash: string;
  authorization_text: string;
  status: string;
  tax_year: string;
}

interface SignatureDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: SignatureData | null;
  onDownloadCertificate?: () => void;
}

export function SignatureDetailsModal({
  open,
  onOpenChange,
  signature,
  onDownloadCertificate
}: SignatureDetailsModalProps) {
  if (!signature) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateHash = (hash: string, length: number = 16) => {
    if (hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border border-slate-200 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-slate-900">
                Signatur-Details
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                Steuerjahr {signature.tax_year}
              </p>
            </div>
            <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">
              {signature.status === 'signed' ? 'Signiert' : signature.status}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5">
            {/* Signer Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Unterzeichner
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="font-medium text-slate-900">{signature.signer_name}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">E-Mail</p>
                  <p className="font-medium text-slate-900 text-sm truncate">{signature.signer_email}</p>
                </div>
              </div>
              {signature.signer_date_of_birth && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Geburtsdatum</p>
                  <p className="font-medium text-slate-900">
                    {new Date(signature.signer_date_of_birth).toLocaleDateString('de-CH')}
                  </p>
                </div>
              )}
            </div>

            {/* Signature Timestamp */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Zeitstempel
              </h3>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Signiert am</p>
                <p className="font-medium text-slate-900">{formatDate(signature.signed_at)}</p>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Technische Details
              </h3>
              <div className="space-y-2">
                {signature.ip_address && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">IP-Adresse</p>
                    <p className="font-mono text-sm text-slate-900">{signature.ip_address}</p>
                  </div>
                )}
                {signature.user_agent && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Browser/Gerät</p>
                    <p className="text-xs text-slate-700 break-all">{signature.user_agent}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic Hashes */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Kryptografische Hashes
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Dokument-Hash (SHA-256)</p>
                  <p className="font-mono text-xs text-slate-700 break-all" title={signature.document_hash}>
                    {truncateHash(signature.document_hash, 20)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Signatur-Hash (SHA-256)</p>
                  <p className="font-mono text-xs text-slate-700 break-all" title={signature.signature_hash}>
                    {truncateHash(signature.signature_hash, 20)}
                  </p>
                </div>
              </div>
            </div>

            {/* Authorization Text */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Vollmachts-Text
              </h3>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {signature.authorization_text}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-full border-slate-200"
          >
            Schliessen
          </Button>
          {onDownloadCertificate && (
            <Button
              onClick={onDownloadCertificate}
              className="flex-1 h-11 rounded-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Zertifikat
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
