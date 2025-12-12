
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';

const AcceptableUse = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Nutzungsrichtlinie" 
        onBack={() => navigate(-1)} 
      />
      <LegalDocumentPage
        title=""
        gettermsId="WqMSj"
        documentType="acceptable-use"
        useDarkBackground={true}
      />
    </div>
  );
};

export default AcceptableUse;
