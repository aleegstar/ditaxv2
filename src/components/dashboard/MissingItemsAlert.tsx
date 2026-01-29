import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface MissingItemsAlertProps {
  pendingDocuments: number;
  pendingInformation: number;
}

export const MissingItemsAlert: React.FC<MissingItemsAlertProps> = ({
  pendingDocuments,
  pendingInformation,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const totalPending = pendingDocuments + pendingInformation;

  if (totalPending === 0) return null;

  const getMessage = () => {
    if (pendingDocuments > 0 && pendingInformation > 0) {
      return t.missingItems.bothNeeded
        .replace('{docs}', String(pendingDocuments))
        .replace('{info}', String(pendingInformation));
    }
    if (pendingDocuments > 0) {
      return pendingDocuments > 1
        ? t.missingItems.documentsNeeded.replace('{count}', String(pendingDocuments))
        : t.missingItems.documentsNeededSingular.replace('{count}', String(pendingDocuments));
    }
    return pendingInformation > 1
      ? t.missingItems.infoNeeded.replace('{count}', String(pendingInformation))
      : t.missingItems.infoNeededSingular.replace('{count}', String(pendingInformation));
  };

  return (
    <button
      onClick={() => navigate('/missing-items')}
      className="w-full mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center gap-4 hover:from-amber-100 hover:to-orange-100 transition-all duration-200 group"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
        <AlertCircle className="w-6 h-6 text-white" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-amber-900 font-jakarta text-sm">
          {t.missingItems.actionRequired}
        </h3>
        <p className="text-amber-700 text-sm font-jakarta mt-0.5">
          {getMessage()}
        </p>
      </div>

      {/* Icons for types */}
      <div className="flex items-center gap-2">
        {pendingDocuments > 0 && (
          <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full">
            <FileText className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
            <span className="text-xs font-semibold text-amber-700 font-jakarta">
              {pendingDocuments}
            </span>
          </div>
        )}
        {pendingInformation > 0 && (
          <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-full">
            <MessageSquare className="w-3.5 h-3.5 text-orange-600" strokeWidth={2} />
            <span className="text-xs font-semibold text-orange-700 font-jakarta">
              {pendingInformation}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
    </button>
  );
};
