import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';

const Roadmap = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Roadmap" 
        onBack={() => navigate(-1)} 
      />
      <div className="w-full h-[calc(100vh-80px)] overflow-hidden">
        <iframe 
          src="https://ditax.productlift.dev/t/roadmap?widget_id=55eb9e79-4a5c-495f-b78c-622511e4f028" 
          data-productlift-link 
          className="w-full h-full" 
          title="Roadmap" 
          style={{ border: 'none' }} 
        />
      </div>
    </div>
  );
};

export default Roadmap;
