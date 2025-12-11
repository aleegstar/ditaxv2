
import React from 'react';
import { WelcomeHeader } from "@/components/ui/welcome-header";

const Feedback = () => {
  return (
    <div className="p-0">
      <WelcomeHeader 
        customTitle="Feedback"
        customDescription="Sag uns, wie wir Ditax für dich nützlicher machen können."
      />
      <div className="w-full h-screen">
        <iframe 
          src="https://ditax.productlift.dev/t/feedback?widget_id=ff4660d3-4fe3-4194-b280-3194490e8315" 
          data-productlift-link 
          className="w-full h-full" 
          title="Feedback" 
          style={{
            border: 'none',
            background: 'transparent'
          }} 
        />
      </div>
    </div>
  );
};

export default Feedback;
