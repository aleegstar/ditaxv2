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
      className="w-full mb-5 p-4 rounded-2xl flex items-center gap-3.5 transition-all duration-200 active:scale-[0.98] group"
      style={{
        background: 'linear-gradient(160deg, #fffbf5 0%, #fff7ed 100%)',
        boxShadow: '0 2px 12px -2px rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
        <AlertCircle className="w-5 h-5 text-white" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="font-semibold text-amber-900 text-sm leading-tight">
          {t.missingItems.actionRequired}
        </h3>
        <p className="text-amber-700/80 text-xs mt-0.5 truncate">
          {getMessage()}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
    </button>
  );
};
