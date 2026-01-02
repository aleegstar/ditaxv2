
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';

const Feedback = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader 
        title="Feedback" 
        onBack={() => navigate(-1)} 
      />
      <div className="w-full h-[calc(100vh-80px)]">
        <iframe 
          src="https://ditax.productlift.dev/t/feedback?widget_id=ff4660d3-4fe3-4194-b280-3194490e8315" 
          data-productlift-link 
          className="w-full h-full" 
          title="Feedback" 
          style={{ border: 'none', background: 'transparent' }} 
        />
      </div>
    </div>
  );
};

export default Feedback;
