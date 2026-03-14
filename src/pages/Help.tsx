
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';

const Help = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader 
        title="Hilfe & Support" 
        onBack={() => navigate(-1)} 
      />
      <div className="w-full h-[calc(100vh-80px)] overflow-hidden">
        <iframe 
          src="https://ditax.productlift.dev/t/wissensdatenbank?widget_id=870f5612-894a-4267-8d33-4fcbc8bf9bfd" 
          data-productlift-link 
          className="w-full h-full" 
          title="Hilfe & Support" 
          style={{ border: 'none' }} 
        />
      </div>
    </div>
  );
};

export default Help;
